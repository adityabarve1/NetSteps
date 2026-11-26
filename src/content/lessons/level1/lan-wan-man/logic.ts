// Pure logic for lesson 1.2 "LAN, WAN and MAN". No React here.
import type { Problem, Rng } from '@/labs/practice';

export type Scope = 'PAN' | 'LAN' | 'MAN' | 'WAN';

/** The four scopes from smallest to largest. A scope's index is its answer number. */
export const SCOPES: readonly Scope[] = ['PAN', 'LAN', 'MAN', 'WAN'];

// Rules of thumb, in kilometres. They are conventions, not standards.
const PAN_MAX_KM = 0.01; // 10 metres
const LAN_MAX_KM = 2;
const MAN_MAX_KM = 100;

/**
 * The usual name for a network that reaches `km` kilometres: PAN up to 10 m,
 * LAN up to 2 km, MAN up to 100 km, WAN beyond. Each limit belongs to the
 * smaller group. These limits are rules of thumb, not standards.
 * @throws {RangeError} for a negative, NaN, infinite or non-number distance.
 */
export function scopeForDistance(km: number): Scope {
  if (typeof km !== 'number' || !Number.isFinite(km) || km < 0) {
    throw new RangeError('Distance must be zero or more kilometres.');
  }
  if (km <= PAN_MAX_KM) return 'PAN';
  if (km <= LAN_MAX_KM) return 'LAN';
  if (km <= MAN_MAX_KM) return 'MAN';
  return 'WAN';
}

export type ScopeQuestion = {
  prompt: string;
  scope: Scope;
  /** A typical reach of the scenario, in km. Always far from a boundary. */
  km: number;
  /** Why the answer is right, in the lesson's own rules of thumb. */
  why: string;
};

export const scopeQuestions: ScopeQuestion[] = [
  {
    prompt: 'Your phone plays music to wireless earbuds in your ears.',
    scope: 'PAN',
    km: 0.001,
    why: 'The two devices are within about a metre of you, and the network is built around one person.',
  },
  {
    prompt:
      'You plug your phone into your laptop with a USB cable so the laptop can use the phone’s mobile data.',
    scope: 'PAN',
    km: 0.001,
    why: 'The cable is under a metre long, so the network is only the two devices within your reach.',
  },
  {
    prompt:
      'A smartwatch on your wrist sends your step count to your phone in your pocket.',
    scope: 'PAN',
    km: 0.001,
    why: 'Watch and phone are within a metre of each other, on one person.',
  },
  {
    prompt:
      'The phones, TV and laptops in one flat all use the same Wi-Fi from one router, about 20 metres across.',
    scope: 'LAN',
    km: 0.02,
    why: 'The reach is about 20 metres, far more than one person’s reach but inside one building, and one household runs it.',
  },
  {
    prompt:
      'Computers in one school building share a printer and files through cables and Wi-Fi, about 150 metres end to end.',
    scope: 'LAN',
    km: 0.15,
    why: 'About 150 metres is 0.15 km, well under 2 km, and one school looks after the whole network.',
  },
  {
    prompt:
      'An office has 40 desks on one floor, all wired to switches in one cupboard.',
    scope: 'LAN',
    km: 0.05,
    why: 'One floor of one building is only tens of metres, and one company runs it.',
  },
  {
    prompt:
      'A council’s own fibre cables link its libraries, schools and traffic lights across a city about 25 km wide.',
    scope: 'MAN',
    km: 25,
    why: 'By distance alone, 25 km is far more than a building or campus (2 km) but less than 100 km, so it is city sized. The council owns the cables, so ownership agrees.',
  },
  {
    prompt:
      'A council’s own fibre cables link its buildings across a city about 10 km wide.',
    scope: 'MAN',
    km: 10,
    why: 'By distance alone, 10 km is above the 2 km limit of a LAN and well inside a city. The council owns the cables, so ownership agrees.',
  },
  {
    prompt:
      'A university runs its own fibre network joining its campuses, spread across one city about 30 km wide.',
    scope: 'MAN',
    km: 30,
    why: 'By distance alone, 30 km is city sized: bigger than any one campus, smaller than 100 km. One owner runs it, so ownership agrees.',
  },
  {
    prompt:
      'A bank links its branch in London to its branch in Tokyo, about 9,500 km away, with lines rented from telecom companies.',
    scope: 'WAN',
    km: 9500,
    why: '9,500 km is far above 100 km and the link crosses countries over rented lines, so it is WAN-scale.',
  },
  {
    prompt:
      'A shop in Chicago connects to its warehouse about 1,200 km away, using a line rented from a telecom company.',
    scope: 'WAN',
    km: 1200,
    why: '1,200 km is far above 100 km, and the link runs over a line the shop rents rather than owns, which is typical of a WAN-scale link.',
  },
  {
    prompt:
      'A firm’s office in Madrid and its office in Santiago, Chile, about 10,000 km apart, are joined by a line rented from a telecom company.',
    scope: 'WAN',
    km: 10000,
    why: 'The offices are on different continents. The network joining them reaches thousands of kilometres, far beyond a campus or a city, so it is a WAN-scale link.',
  },
];

/**
 * One practice problem for PracticeLab: "which kind of network is this?".
 * The answer is the scope's index in SCOPES (0 PAN, 1 LAN, 2 MAN, 3 WAN).
 * Deterministic for a given generator state.
 */
export function generateScopeProblem(rng: Rng): Problem {
  const i = Math.min(
    scopeQuestions.length - 1,
    Math.floor(rng() * scopeQuestions.length),
  );
  const q = scopeQuestions[i];
  if (q === undefined) throw new RangeError('No scope questions.');
  const answer = SCOPES.indexOf(q.scope);
  const list = SCOPES.map((s, n) => `${String(n)} = ${s}`).join(', ');
  return {
    id: `scope-${String(i)}`,
    prompt: `${q.prompt} Which kind of network is this, by the distance rules of thumb? The options are ${list}. Type 0, 1, 2 or 3, the number next to your choice.`,
    answer,
    tolerance: 0,
    explanation: `${q.why} So the answer is ${String(answer)} (${q.scope}).`,
    params: { scenario: i, km: q.km },
  };
}

// The try-it slider is logarithmic: equal steps multiply the distance. It runs
// from 1 metre (10^-3 km) to 20 000 km (about half way round the Earth).
export const SLIDER_MAX = 200;
const LOG_MIN_KM = -3;
const LOG_MAX_KM = Math.log10(20000);

/**
 * The distance in km for a slider position from 0 to SLIDER_MAX, rounded to 2
 * significant figures so the readout and the verdict use the same number.
 * Positions outside the slider are clamped.
 * @throws {RangeError} if the position is not a finite number.
 */
export function kmFromSlider(position: number): number {
  if (typeof position !== 'number' || !Number.isFinite(position)) {
    throw new RangeError('Slider position must be a finite number.');
  }
  const p = Math.min(SLIDER_MAX, Math.max(0, position));
  const exponent = LOG_MIN_KM + ((LOG_MAX_KM - LOG_MIN_KM) * p) / SLIDER_MAX;
  return Number((10 ** exponent).toPrecision(2));
}

function withCommas(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * A distance in words: "5 m" below 1 km, "2.5 km" or "5,000 km" above.
 * @throws {RangeError} for a negative, NaN or infinite distance.
 */
export function formatDistance(km: number): string {
  if (typeof km !== 'number' || !Number.isFinite(km) || km < 0) {
    throw new RangeError('Distance must be zero or more kilometres.');
  }
  const metres = Number((km * 1000).toPrecision(3));
  if (metres < 1000) return `${String(metres)} m`;
  return `${withCommas(Number(km.toPrecision(3)))} km`;
}

export type ScopeInfo = { name: string; reach: string; example: string };

/** Words for each scope: its full name, its rule-of-thumb reach, one example. */
export const scopeInfo: Record<Scope, ScopeInfo> = {
  PAN: {
    name: 'personal area network',
    reach: 'up to about 10 m',
    example: 'Your phone and your wireless earbuds.',
  },
  LAN: {
    name: 'local area network',
    reach: 'up to about 2 km',
    example: 'The Wi-Fi in a home, a school building or an office.',
  },
  MAN: {
    name: 'metropolitan area network',
    reach: 'up to about 100 km',
    example: 'A city council joining its libraries and offices.',
  },
  WAN: {
    name: 'wide area network',
    reach: 'more than about 100 km',
    example: 'A bank joining its branches in different countries.',
  },
};

export type ScopeStep = {
  scope: Scope;
  title: string;
  /** A typical reach of this stage, in km. */
  km: number;
  caption: string;
  /** How many rings are reached, counting from the inside: 1 (PAN) to 4 (WAN). */
  rings: number;
};

type StepDraft = Omit<ScopeStep, 'rings'>;

const STEP_DRAFTS: StepDraft[] = [
  {
    scope: 'PAN',
    title: 'Earbuds and phone',
    km: 0.001,
    caption:
      'PAN: your phone plays music to your wireless earbuds. This tiny network usually reaches no more than about 10 metres and is built around one person.',
  },
  {
    scope: 'LAN',
    title: 'A home',
    km: 0.02,
    caption:
      'LAN: at home, phones, a TV and a laptop join one Wi-Fi network. It covers one building, tens of metres, and one household runs it.',
  },
  {
    scope: 'LAN',
    title: 'A school campus',
    km: 0.5,
    caption:
      'LAN: a school joins many rooms and buildings on one site with cables, switches and Wi-Fi. It is still a LAN, because one organisation runs it and it stays within about 2 kilometres.',
  },
  {
    scope: 'MAN',
    title: 'A city',
    km: 25,
    caption:
      'MAN: a city council joins libraries, offices and traffic lights across the whole city, up to about 100 kilometres. Each site has its own LAN, and the city-wide network joins them.',
  },
  {
    scope: 'WAN',
    title: 'Different countries',
    km: 9500,
    caption:
      'WAN: a bank joins its offices in different countries, thousands of kilometres apart. The company usually cannot lay cable between countries, so it rents lines from companies that run long-distance data lines.',
  },
];

/** The five stages of the primary simulation, from one person to the world. */
export const scopeSteps: ScopeStep[] = STEP_DRAFTS.map((s) => ({
  ...s,
  rings: SCOPES.indexOf(s.scope) + 1,
}));

/** The picture's text alternative: it changes with the step. */
export function describeStep(step: ScopeStep): string {
  const reached = SCOPES.slice(0, step.rings).join(', ');
  return `Diagram of four nested rings, from the inside out: PAN, LAN, MAN and WAN. The rings are not to scale. Now showing: ${step.title}, a ${step.scope} (${scopeInfo[step.scope].name}). Rings reached so far: ${reached}.`;
}
