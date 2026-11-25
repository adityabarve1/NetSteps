// IPv4 helpers for the simulated network. Pure TypeScript: no React, no I/O.
//
// Every address and mask is an UNSIGNED 32-bit number (0..4294967295).
// 192.168.1.10 is 3232235786, which is above 2^31, so signed bitwise results
// are never used directly: every bitwise result is normalised with `>>> 0`.

const MAX_UINT32 = 4294967295;

// Exactly four parts of 1-3 ASCII digits, no leading zero except a lone "0".
// `[0-9]` (not `\d`) so lookalike digits from other scripts never match, and
// `$` without the `m` flag does not tolerate a trailing newline.
const DOTTED_QUAD =
  /^(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})\.(0|[1-9][0-9]{0,2})$/;

// A prefix length: "0" to "32" with no leading zero ("/024" is invalid).
const PREFIX = /^(0|[1-9][0-9]?)$/;

// The longest valid address is "255.255.255.255" (15 characters). Rejecting
// longer input first keeps hostile strings cheap to refuse.
const MAX_ADDRESS_LENGTH = 15;

/**
 * Parse a strict dotted quad into an unsigned 32-bit number, or `null`.
 * No whitespace, signs, hex, leading zeros or non-ASCII digits are accepted.
 * Non-string input returns `null` rather than throwing.
 */
export function parseIPv4(s: string): number | null {
  if (typeof (s as unknown) !== 'string' || s.length > MAX_ADDRESS_LENGTH) {
    return null;
  }
  const match = DOTTED_QUAD.exec(s);
  if (match === null) return null;
  let value = 0;
  for (let i = 1; i <= 4; i += 1) {
    const octet = Number(match[i]);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

/**
 * Format an unsigned 32-bit integer as a dotted quad.
 * @throws RangeError for anything that is not an integer in 0..4294967295
 * (NaN, negatives, fractions, too-large numbers, non-numbers). Callers are
 * internal and always hold a number that came from a parser.
 */
export function formatIPv4(n: number): string {
  if (
    typeof (n as unknown) !== 'number' ||
    !Number.isInteger(n) ||
    n < 0 ||
    n > MAX_UINT32
  ) {
    throw new RangeError(
      `formatIPv4 needs an integer from 0 to ${String(MAX_UINT32)}, got ${String(n)}`,
    );
  }
  return [
    Math.floor(n / 16777216) % 256,
    Math.floor(n / 65536) % 256,
    Math.floor(n / 256) % 256,
    n % 256,
  ].join('.');
}

/**
 * Parse a subnet mask: a dotted contiguous mask ("255.255.255.0") or a prefix
 * length ("/0" to "/32"). Returns the unsigned mask number, or `null` for a
 * non-contiguous mask, an out-of-range or malformed prefix, a prefix with a
 * leading zero ("/024" is treated as invalid), whitespace, or non-string input.
 */
export function parseMask(s: string): number | null {
  if (typeof (s as unknown) !== 'string') return null;
  if (s.startsWith('/')) {
    const digits = s.slice(1);
    if (digits.length > 2 || !PREFIX.test(digits)) return null;
    const bits = Number(digits);
    if (bits > 32) return null;
    // Shifting by 32 wraps in JavaScript, so /0 is handled explicitly.
    return bits === 0 ? 0 : (MAX_UINT32 << (32 - bits)) >>> 0;
  }
  const value = parseIPv4(s);
  if (value === null) return null;
  // A contiguous mask is ones then zeros, so its inverse is zeros then ones,
  // and adding 1 to the inverse carries into a single bit: inv & (inv + 1) == 0.
  const inverse = ~value >>> 0;
  return (inverse & ((inverse + 1) >>> 0)) >>> 0 === 0 ? value : null;
}

/**
 * True when `a` and `b` have the same network part under `mask`. Mask 0 puts
 * every address in one subnet; /32 only matches identical addresses. The
 * inputs are trusted numbers from the parsers; odd numbers never throw.
 */
export function sameSubnet(a: number, b: number, mask: number): boolean {
  return (a & mask) >>> 0 === (b & mask) >>> 0;
}
