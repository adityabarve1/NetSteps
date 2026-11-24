// Looks at the offline queue as it sits in localStorage: one key per queued
// write, named `<base>.<seq>` (for example `netsteps.pending.<userId>.<seq>`).

/** A sortable seq made the way the queue makes them, for seeding by hand. */
export const seqAt = (millis: number, tab = 'aaaa', counter = 0): string =>
  `${String(millis).padStart(15, '0')}-${String(counter).padStart(6, '0')}-${tab}`;

/** Every localStorage key that is one of `base`'s ops (or looks like it), sorted. */
export function pendingKeys(base: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(`${base}.`) === true) keys.push(key);
  }
  return keys.sort();
}

export interface StoredOp {
  key: string;
  seq: string;
  op: Record<string, unknown>;
}

/** The ops that parse, in key order. Anything unreadable is left out. */
export function storedOps(base: string): StoredOp[] {
  return pendingKeys(base).flatMap((key) => {
    try {
      const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '');
      const op = (value as { op?: Record<string, unknown> }).op;
      return op === undefined
        ? []
        : [{ key, seq: key.slice(base.length + 1), op }];
    } catch {
      return [];
    }
  });
}

/** Puts one op in storage as the queue would. */
export function seedOp(base: string, seq: string, op: object): string {
  const key = `${base}.${seq}`;
  window.localStorage.setItem(key, JSON.stringify({ v: 1, op }));
  return key;
}
