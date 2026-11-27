// What a failed Supabase call means for a queued write: keep it and try again,
// or give up on it because the database can never accept it.
//
// Giving up is for a write that is wrong in itself (a value the table's CHECK
// rejects, a row the policy forbids). It must never be for a problem that fixes
// itself: no network, a server fault, a rate limit, an expired token, or a setup
// problem the owner can still repair (a missing table or column). Anything we do
// not recognise is kept: losing progress is worse than retrying it.

export type Verdict = 'retry' | 'drop';

/** A failure answered by PostgREST (or a request that never got an answer: status 0). */
export class RemoteFailure extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'RemoteFailure';
    this.status = status;
    this.code = code;
  }
}

// PGRST301/302/303: JWT problems. Postgres classes 08 connection, 40 transaction
// rollback (serialization, deadlock), 53 resources, 54 limits, 55 not ready,
// 57 operator, 58 system, XX internal; PGRST2xx schema cache (a missing column
// or table). 42P01, 42703 and 3D000 are the same kind of setup problem.
const AUTH_CODE = /^PGRST30[123]$/;
const TRANSIENT_CODE = /^(08|40|53|54|55|57|58|XX|PGRST2)/;
const SETUP_CODES = new Set(['42P01', '42703', '3D000']);
// 22 data exception, 23 integrity constraint (unique, check, foreign key,
// not null), 42501 insufficient privilege or row level security, P0001 raised.
const PERMANENT_CODE = /^(22|23)/;
const PERMANENT_CODES = new Set(['42501', 'P0001']);
const PERMANENT_STATUSES = new Set([400, 409, 413, 422]);

export function classifyFailure(error: unknown): Verdict {
  if (!(error instanceof RemoteFailure)) return 'retry';
  const { status, code, message } = error;
  if (status === 0) return 'retry';

  const authMessage = /jwt|token/i.test(message);
  if (
    AUTH_CODE.test(code) ||
    status === 401 ||
    (status === 403 && authMessage)
  ) {
    return 'retry';
  }
  if (
    status >= 500 ||
    status === 429 ||
    status === 408 ||
    TRANSIENT_CODE.test(code) ||
    SETUP_CODES.has(code)
  ) {
    return 'retry';
  }
  if (
    PERMANENT_CODE.test(code) ||
    PERMANENT_CODES.has(code) ||
    PERMANENT_STATUSES.has(status)
  ) {
    return 'drop';
  }
  return 'retry';
}

/**
 * A refusal like 42501 can also mean "a different account is signed in now". Before
 * giving up on such a write the caller must confirm the session is still ours.
 */
export function needsOwnerCheck(error: unknown): boolean {
  return (
    error instanceof RemoteFailure &&
    (error.status === 401 || error.status === 403 || error.code === '42501')
  );
}

/**
 * `classifyFailure`, plus the owner check: a write is only given up on when the
 * account that made it is still the one signed in (`stillOwner`). If a different
 * account (or nobody) is signed in, the write is kept for when its owner returns.
 */
export async function judgeFailure(
  error: unknown,
  stillOwner?: () => Promise<boolean>,
): Promise<Verdict> {
  const verdict = classifyFailure(error);
  if (
    verdict === 'drop' &&
    needsOwnerCheck(error) &&
    stillOwner !== undefined &&
    !(await stillOwner())
  ) {
    return 'retry';
  }
  return verdict;
}
