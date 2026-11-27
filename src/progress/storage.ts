// localStorage that never throws. In a private window, with storage blocked, or
// when the quota is full, reading gives null and writing says "false" instead.
// Callers decide what to do (keep the data in memory, in every case here).

function area(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    // Reading the property itself can throw (blocked site data).
    return null;
  }
}

export function readItem(key: string): string | null {
  try {
    return area()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** True when the value was stored. */
export function writeItem(key: string, value: string): boolean {
  try {
    const storage = area();
    if (storage === null) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** True when the key is gone (or storage was never reachable, so nothing was there). */
export function removeItem(key: string): boolean {
  try {
    area()?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Every key in localStorage; empty when storage cannot be reached. */
export function listKeys(): string[] {
  try {
    const storage = area();
    if (storage === null) return [];
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key !== null) keys.push(key);
    }
    return keys;
  } catch {
    return [];
  }
}
