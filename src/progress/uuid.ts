// An id for a quiz attempt, made in the browser so a retried write can be
// recognised by the database and ignored. `crypto.randomUUID` only exists on
// secure pages (https or localhost), so a plain-http preview needs a fallback.
export function randomUuid(): string {
  const source = globalThis.crypto as Partial<Crypto> | undefined;
  if (typeof source?.randomUUID === 'function') return source.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof source?.getRandomValues === 'function') {
    source.getRandomValues(bytes);
  } else {
    // Not secret, only unique enough: this id is an idempotency key.
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
