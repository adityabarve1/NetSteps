// The id of the quiz attempt that a guest-to-account MERGE adds.
//
// Why it is not random: Supabase announces a sign-in to every open tab, so every
// tab that holds the guest's progress runs the merge, and they all do it at about
// the same moment. If each made its own random id, each would insert its own row
// and one guest score would become several attempts. If the id is made from the
// score itself, every tab makes the SAME id, and the insert (ON CONFLICT (id) DO
// NOTHING) keeps exactly one row, however many tabs or merges there are.
//
// It must be synchronous (the merge decides its rows in one step), so it cannot
// use crypto.subtle. It is not a secret: it is an idempotency key, made of the
// account id (so two accounts never share one), the lesson, the score and the
// total. Ordinary quiz submits keep random ids, because every submit is its own
// attempt.
//
// The hash is cyrb128 (public domain, by bryc): four 32-bit words, 128 bits. The
// version and variant bits are then set the way a version 4 uuid sets them, so the
// text fits the `uuid` column; that keeps 122 bits of the hash. Never change this
// function: an id made by an old release must equal the one a new release makes,
// or the merge would stop recognising attempts it already added (the tests pin
// known values).
function cyrb128(text: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < text.length; i += 1) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

const hex8 = (word: number): string => word.toString(16).padStart(8, '0');

export function mergeAttemptId(
  userId: string,
  lessonId: string,
  score: number,
  total: number,
): string {
  // JSON keeps the four fields apart: "a|b" and "c" can never read as "a" and "b|c".
  const [a, b, c, d] = cyrb128(
    JSON.stringify([
      'netsteps.merge-attempt.v1',
      userId,
      lessonId,
      score,
      total,
    ]),
  );
  const hex = `${hex8(a)}${hex8(b)}${hex8(c)}${hex8(d)}`;
  const variant = (Number.parseInt(hex.charAt(16), 16) & 0x3) | 0x8;
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant.toString(16)}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}
