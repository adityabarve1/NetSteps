// Pure maths for the section "Why packets share links efficiently". No React.

/** More users than this is refused: the sum below stays small and exact enough. */
export const MAX_USERS = 1000;

const isWholeNumber = (n: number) => Number.isFinite(n) && Number.isInteger(n);

/**
 * The chance that MORE than `capacity` of `users` users are active at the same
 * moment, when each user is active a share `activeShare` (0 to 1) of the time,
 * independently of the others. That is the upper tail of a binomial
 * distribution. With 35 users, a capacity of 10 and a share of 0.1 it is about
 * 0.0004.
 * @throws {RangeError} unless `users` is a whole number from 0 to MAX_USERS,
 * `capacity` is a whole number of 0 or more and `activeShare` is from 0 to 1.
 */
export function overloadChance(
  users: number,
  capacity: number,
  activeShare: number,
): number {
  if (!isWholeNumber(users) || users < 0 || users > MAX_USERS) {
    throw new RangeError(
      `Users must be a whole number from 0 to ${String(MAX_USERS)}.`,
    );
  }
  if (!isWholeNumber(capacity) || capacity < 0) {
    throw new RangeError('Capacity must be a whole number, zero or more.');
  }
  if (!Number.isFinite(activeShare) || activeShare < 0 || activeShare > 1) {
    throw new RangeError('The active share must be from 0 to 1.');
  }
  if (users <= capacity || activeShare === 0) return 0;
  if (activeShare === 1) return 1;
  // Add up P(k active) for every k above the capacity. Each term is built in
  // logs so that large counts cannot overflow.
  let logChoose = 0; // log of C(users, 0)
  let total = 0;
  for (let k = 0; k <= users; k += 1) {
    if (k > 0) logChoose += Math.log((users - k + 1) / k);
    if (k > capacity) {
      total += Math.exp(
        logChoose +
          k * Math.log(activeShare) +
          (users - k) * Math.log(1 - activeShare),
      );
    }
  }
  return Math.min(1, total);
}
