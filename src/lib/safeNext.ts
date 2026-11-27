// Where to send someone after sign-in, taken from a ?next= address that anyone
// can craft. Only a same-site path is accepted, so a link such as
// /login?next=//evil.com can never turn "sign in" into "go to another site".
const FALLBACK_PATH = '/learn';
const MAX_LENGTH = 2048;

// One slash, then visible ASCII only. That refuses every control character,
// every kind of space (including no-break and zero-width ones), the byte order
// mark and any non-ASCII look-alike in one rule. A backslash is left out
// because browsers read "\" as "/" in addresses. The lookahead refuses "//"
// and "/\" at the start. Lesson links are plain ASCII, so nothing real is lost.
const SAFE_PATH = /^\/(?![/\\])[\x21-\x5b\x5d-\x7e]*$/;

function startsLikeHost(path: string): boolean {
  return path.startsWith('//') || path.startsWith('/\\');
}

export function safeNextPath(raw: string | null | undefined): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_LENGTH) {
    return FALLBACK_PATH;
  }
  if (!SAFE_PATH.test(raw)) {
    return FALLBACK_PATH;
  }
  // The router does not decode the path, so "/%2f%2fevil.com" cannot become a
  // host. It is refused anyway: decode once and apply the same start rule, so
  // the rule does not depend on what any later code does with the text. A
  // broken escape such as "%zz" is refused too, because the router cannot
  // decode it either.
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return FALLBACK_PATH;
  }
  if (startsLikeHost(decoded)) {
    return FALLBACK_PATH;
  }
  return raw;
}
