// A stand-in for the part of the Supabase client that reads and writes tables.
// Tests must never reach a real project, so nothing here touches the network.
//
// It mimics what the app relies on from supabase/migrations/0001_init.sql:
//   * upsert on a key, sending only the columns it was given
//   * `ignoreDuplicates` (ON CONFLICT DO NOTHING) for quiz attempts
//   * the guard triggers: completion is permanent, a completed row sent without
//     a time gets the server time
//   * the CHECK constraints (status values, id length, 0 <= score <= total)
//   * row level security: a row for another user is refused with 42501
//   * PostgREST's cap of 1000 rows per request, so an unpaged read comes back
//     silently short, exactly like the real thing
// and it can fail on demand: offline, one bad call, a write that reached the
// "server" but whose answer was lost, or a call that waits until released.
import type { SupabaseClient } from '@supabase/supabase-js';

export type Row = Record<string, unknown>;

export interface Failure {
  status: number;
  code?: string;
  message?: string;
}

export const NETWORK_DOWN: Failure = {
  status: 0,
  message: 'TypeError: Failed to fetch',
};

export interface DbCall {
  table: string;
  kind: 'select' | 'upsert';
  rows: Row[];
  options: { onConflict?: string; ignoreDuplicates?: boolean };
  columns: string;
  filters: Record<string, unknown>;
  order: string | undefined;
  range: [number, number] | undefined;
}

interface Reply {
  data: unknown;
  error: { message: string; code: string } | null;
  status: number;
}

interface Planned {
  when: (call: DbCall) => boolean;
  failure: Failure;
  applyFirst: boolean;
  left: number;
}

export const SERVER_NOW = '2026-06-01T00:00:00+00:00';
const MAX_ROWS = 1000;
const KEYS: Record<string, string[]> = {
  lesson_progress: ['user_id', 'lesson_id'],
  lab_progress: ['user_id', 'lab_id'],
  quiz_attempts: ['id'],
};

function fail(status: number, code: string, message: string): Failure {
  return { status, code, message };
}

function validate(table: string, row: Row, signedInAs: string | null) {
  if (row.user_id !== signedInAs) {
    return fail(403, '42501', 'new row violates row-level security policy');
  }
  const idColumn = table === 'lab_progress' ? 'lab_id' : 'lesson_id';
  const id = row[idColumn];
  if (table !== 'quiz_attempts' || id !== undefined) {
    if (typeof id !== 'string' || id.length < 1 || id.length > 100) {
      return fail(400, '23514', `${table} id length check`);
    }
  }
  const statuses =
    table === 'lab_progress'
      ? ['started', 'completed']
      : ['in_progress', 'completed'];
  if (table !== 'quiz_attempts' && !statuses.includes(String(row.status))) {
    return fail(400, '23514', `${table} status check`);
  }
  if (table === 'quiz_attempts') {
    const { score, total } = row;
    if (
      typeof score !== 'number' ||
      typeof total !== 'number' ||
      total <= 0 ||
      score < 0 ||
      score > total
    ) {
      return fail(400, '23514', 'quiz_attempts score check');
    }
  }
  return null;
}

// The two guard triggers, in one function (they are line for line the same).
function guarded(table: string, existing: Row | undefined, sent: Row): Row {
  const row: Row = { ...existing, ...sent };
  if (table === 'quiz_attempts') {
    row.created_at ??= SERVER_NOW;
    return row;
  }
  if (existing?.status === 'completed') {
    row.status = 'completed';
    row.completed_at = existing.completed_at;
  }
  if (row.status === 'completed') {
    row.completed_at ??= SERVER_NOW;
  } else {
    row.completed_at = null;
  }
  if (table === 'lesson_progress') row.last_opened_at ??= SERVER_NOW;
  row.updated_at = SERVER_NOW;
  return row;
}

export function createFakeDb({ userId = 'user-1' }: { userId?: string } = {}) {
  const tables: Record<string, Row[]> = {
    lesson_progress: [],
    lab_progress: [],
    quiz_attempts: [],
  };
  const calls: DbCall[] = [];
  const planned: Planned[] = [];
  let signedInAs: string | null = userId;
  let offline = false;
  let gate: Promise<void> | null = null;
  let active = 0;
  let mostActive = 0;

  const sameKey = (table: string, a: Row, b: Row) =>
    (KEYS[table] ?? []).every((column) => a[column] === b[column]);

  function applyUpsert(call: DbCall): Failure | null {
    for (const row of call.rows) {
      const problem = validate(call.table, row, signedInAs);
      if (problem) return problem;
    }
    const rows = tables[call.table] ?? [];
    for (const sent of call.rows) {
      const at = rows.findIndex((existing) =>
        sameKey(call.table, existing, sent),
      );
      const existing = rows[at];
      if (existing !== undefined && call.options.ignoreDuplicates === true) {
        continue;
      }
      const next = guarded(call.table, existing, sent);
      if (existing === undefined) rows.push(next);
      else rows[at] = next;
    }
    return null;
  }

  function read(call: DbCall): Row[] {
    const [from, to] = call.range ?? [0, MAX_ROWS - 1];
    const wanted = call.columns.split(',');
    let rows = (tables[call.table] ?? []).filter((row) =>
      Object.entries(call.filters).every(([key, value]) => row[key] === value),
    );
    const order = call.order;
    if (order !== undefined) {
      rows = [...rows].sort((a, b) =>
        String(a[order]).localeCompare(String(b[order])),
      );
    }
    return rows
      .slice(from, Math.min(to, from + MAX_ROWS - 1) + 1)
      .map((row) => {
        const copy: Row = {};
        for (const column of wanted) copy[column] = row[column];
        return copy;
      });
  }

  function takePlanned(call: DbCall): Planned | undefined {
    const hit = planned.find((p) => p.left > 0 && p.when(call));
    if (hit) hit.left -= 1;
    return hit;
  }

  async function run(call: DbCall, signal: AbortSignal | undefined) {
    active += 1;
    mostActive = Math.max(mostActive, active);
    calls.push(call);
    try {
      if (gate) {
        // A held call still notices when it is aborted (a timeout).
        const aborted = new Promise<void>((resolve) => {
          signal?.addEventListener('abort', () => {
            resolve();
          });
        });
        await Promise.race([gate, aborted]);
      }
      const toReply = (failure: Failure): Reply => ({
        data: null,
        error: {
          message: failure.message ?? 'request failed',
          code: failure.code ?? '',
        },
        status: failure.status,
      });
      if (offline || signal?.aborted === true) return toReply(NETWORK_DOWN);
      const plan = takePlanned(call);
      if (plan && !plan.applyFirst) return toReply(plan.failure);
      if (call.kind === 'select') {
        return { data: read(call), error: null, status: 200 } satisfies Reply;
      }
      const problem = applyUpsert(call);
      if (problem) return toReply(problem);
      if (plan) return toReply(plan.failure);
      return { data: null, error: null, status: 201 } satisfies Reply;
    } finally {
      active -= 1;
    }
  }

  class Builder implements PromiseLike<Reply> {
    private readonly call: DbCall;
    private signal: AbortSignal | undefined;

    constructor(table: string) {
      this.call = {
        table,
        kind: 'select',
        rows: [],
        options: {},
        columns: '',
        filters: {},
        order: undefined,
        range: undefined,
      };
    }

    select(columns: string) {
      this.call.columns = columns;
      return this;
    }
    upsert(rows: Row | Row[], options: DbCall['options'] = {}) {
      this.call.kind = 'upsert';
      this.call.rows = Array.isArray(rows) ? rows : [rows];
      this.call.options = options;
      return this;
    }
    eq(column: string, value: unknown) {
      this.call.filters[column] = value;
      return this;
    }
    order(column: string) {
      this.call.order = column;
      return this;
    }
    range(from: number, to: number) {
      this.call.range = [from, to];
      return this;
    }
    abortSignal(signal: AbortSignal) {
      this.signal = signal;
      return this;
    }
    then<A = Reply, B = never>(
      onfulfilled?: ((value: Reply) => A | PromiseLike<A>) | null,
      onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
    ): Promise<A | B> {
      return run(this.call, this.signal).then(onfulfilled, onrejected);
    }
  }

  const client = {
    from: (table: string) => new Builder(table),
    auth: {
      getSession: () =>
        Promise.resolve({
          data: {
            session: signedInAs === null ? null : { user: { id: signedInAs } },
          },
          error: null,
        }),
    },
  } as unknown as SupabaseClient;

  return {
    client,
    calls,
    writes: () => calls.filter((call) => call.kind === 'upsert'),
    table: (name: string): Row[] => tables[name] ?? [],
    seed(name: string, rows: Row[]) {
      tables[name] = [...(tables[name] ?? []), ...rows];
    },
    setOffline(value: boolean) {
      offline = value;
    },
    setSignedInAs(id: string | null) {
      signedInAs = id;
    },
    /** Fails the next `times` calls that match; `applyFirst` = reached the server, answer lost. */
    failNext(
      failure: Failure,
      options: {
        times?: number;
        applyFirst?: boolean;
        when?: (call: DbCall) => boolean;
      } = {},
    ) {
      planned.push({
        when: options.when ?? (() => true),
        failure,
        applyFirst: options.applyFirst ?? false,
        left: options.times ?? 1,
      });
    },
    /** Every call waits until the returned function is called. */
    hold(): () => void {
      let release!: () => void;
      gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => {
        gate = null;
        release();
      };
    },
    mostConcurrentCalls: () => mostActive,
  };
}

export type FakeDb = ReturnType<typeof createFakeDb>;
