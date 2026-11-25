import { describe, expect, it } from 'vitest';
import {
  checkAnswer,
  normaliseCount,
  parseAnswer,
  type Problem,
} from '@/labs/practice';

const make = (answer: number, tolerance = 0): Problem => ({
  id: 't',
  prompt: 'p',
  answer,
  tolerance,
  explanation: 'e',
  params: {},
});

describe('checkAnswer truth table', () => {
  const p = make(192);

  it.each(['192', ' 192 ', '192.0', '192.000', '\t192\n', '0192'])(
    'accepts %j',
    (input) => {
      expect(checkAnswer(p, input).correct).toBe(true);
    },
  );

  it.each([
    '',
    '   ',
    'abc',
    '1e3',
    '1E3',
    '192 Mbps',
    '1,000',
    '+5',
    '.5',
    '5.',
    '0x10',
    '--5',
    '1.2.3',
    '1 92',
    'NaN',
    'Infinity',
    '١٩٢',
  ])('rejects %j', (input) => {
    expect(checkAnswer(p, input).correct).toBe(false);
  });

  it('rejects a wrong number', () => {
    expect(checkAnswer(p, '191').correct).toBe(false);
    expect(checkAnswer(p, '-192').correct).toBe(false);
    expect(checkAnswer(p, '193').correct).toBe(false);
  });

  it('handles negative answers', () => {
    expect(checkAnswer(make(-3), '-3').correct).toBe(true);
    expect(checkAnswer(make(-3), '3').correct).toBe(false);
  });

  it('handles an answer of zero', () => {
    expect(checkAnswer(make(0), '0').correct).toBe(true);
    expect(checkAnswer(make(0), '-0').correct).toBe(true);
    expect(checkAnswer(make(0), '0.0').correct).toBe(true);
  });
});

describe('checkAnswer tolerance', () => {
  const p = make(16, 0.01);

  it('accepts anything within the tolerance, edges included', () => {
    for (const input of ['16', '16.01', '15.99', '16.005', '15.995']) {
      expect(checkAnswer(p, input).correct).toBe(true);
    }
  });

  it('rejects just outside the tolerance', () => {
    for (const input of ['16.02', '15.98', '16.011', '17']) {
      expect(checkAnswer(p, input).correct).toBe(false);
    }
  });

  it('with tolerance 0 only the exact value counts', () => {
    expect(checkAnswer(make(5), '5.01').correct).toBe(false);
    expect(checkAnswer(make(5), '5.0000000001').correct).toBe(true);
  });

  it('accepts a learner rounding to 2 decimals', () => {
    expect(checkAnswer(make(0.67, 0.01), '0.67').correct).toBe(true);
    expect(checkAnswer(make(0.67, 0.01), '0.68').correct).toBe(true);
    expect(checkAnswer(make(0.67, 0.01), '0.7').correct).toBe(false);
  });
});

describe('checkAnswer messages', () => {
  const p = make(192);

  it('praises a correct answer briefly', () => {
    const r = checkAnswer(p, '192');
    expect(r.message).toMatch(/correct/i);
    expect(r.message.length).toBeLessThan(60);
  });

  it('tells the learner to type just a number when it is not one', () => {
    const r = checkAnswer(p, '192 Mbps');
    expect(r.message).toMatch(/just a number/i);
    expect(r.message).toMatch(/no units|without units/i);
  });

  it('encourages another try on a wrong answer and never shows the answer', () => {
    const r = checkAnswer(p, '100');
    expect(r.message).toMatch(/try again/i);
    expect(r.message).not.toContain('192');
  });

  it('never leaks the answer for any wrong input', () => {
    const q = make(4321.5);
    for (const input of ['1', 'x', '', '4321.4', '99999']) {
      expect(checkAnswer(q, input).message).not.toContain('4321');
    }
  });
});

describe('checkAnswer never throws', () => {
  const p = make(192, 0.01);

  it('survives 3000 hostile strings', () => {
    const alphabet = [
      '0',
      '1',
      '9',
      '.',
      '-',
      '+',
      'e',
      ' ',
      ',',
      '\n',
      'x',
      '\u0000',
      '٣',
      '\uD83D',
    ];
    let state = 12345;
    const next = () => {
      state = (Math.imul(state, 1103515245) + 12345) >>> 0;
      return state;
    };
    for (let i = 0; i < 3000; i += 1) {
      const len = next() % 24;
      let s = '';
      for (let j = 0; j < len; j += 1)
        s += alphabet[next() % alphabet.length] ?? '';
      const r = checkAnswer(p, s);
      expect(typeof r.correct).toBe('boolean');
      expect(r.message.length).toBeGreaterThan(0);
    }
  });

  it('survives non-string input with a friendly message', () => {
    const bad = [
      undefined,
      null,
      192,
      NaN,
      {},
      [],
      ['192'],
      true,
      Symbol('s'),
      () => 1,
    ] as unknown[];
    for (const input of bad) {
      const r = checkAnswer(p, input as string);
      expect(r.correct).toBe(false);
      expect(r.message.length).toBeGreaterThan(0);
    }
  });

  it('does not hang or match on absurdly long digit strings', () => {
    const started = Date.now();
    expect(checkAnswer(p, '9'.repeat(100000)).correct).toBe(false);
    expect(checkAnswer(make(0), '9'.repeat(500)).correct).toBe(false);
    expect(checkAnswer(make(0), '0'.repeat(100000)).correct).toBe(true);
    expect(checkAnswer(p, '1'.repeat(400)).correct).toBe(false);
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

describe('parseAnswer', () => {
  it('returns the number or null', () => {
    expect(parseAnswer(' 12.5 ')).toBe(12.5);
    expect(parseAnswer('-3')).toBe(-3);
    expect(parseAnswer('1e3')).toBeNull();
    expect(parseAnswer('9'.repeat(400))).toBeNull();
    expect(parseAnswer(7 as unknown as string)).toBeNull();
  });
});

describe('normaliseCount', () => {
  it('defaults to 5 and clamps to 1-20', () => {
    expect(normaliseCount(undefined)).toBe(5);
    expect(normaliseCount(Number.NaN)).toBe(5);
    expect(normaliseCount(2.5)).toBe(5);
    expect(normaliseCount(Infinity)).toBe(5);
    expect(normaliseCount(0)).toBe(1);
    expect(normaliseCount(-4)).toBe(1);
    expect(normaliseCount(1)).toBe(1);
    expect(normaliseCount(7)).toBe(7);
    expect(normaliseCount(20)).toBe(20);
    expect(normaliseCount(500)).toBe(20);
  });
});
