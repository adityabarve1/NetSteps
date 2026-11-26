// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  clampCount,
  clientServerBottleneck,
  clientServerSeconds,
  formatSeconds,
  megabytesToMegabits,
  p2pBottleneck,
  p2pSeconds,
} from './logic';

// The lesson's numbers: an 800-megabit file (100 megabytes), a server that
// uploads 100 megabits per second, and computers that download 50.
const CS = { fileMb: 800, serverUpMbps: 100, clientDownMbps: 50 };
const P2P = {
  fileMb: 800,
  serverUpMbps: 100,
  peerUpMbps: 10,
  peerDownMbps: 50,
};
const cs = (clients: number) => clientServerSeconds({ ...CS, clients });
const p2p = (peers: number) => p2pSeconds({ ...P2P, peers });

describe('clientServerSeconds', () => {
  it('is 80 seconds for 10 clients (the server upload is the limit)', () => {
    expect(cs(10)).toBe(80);
  });

  it('is 16 seconds for one client (its own download is the limit)', () => {
    expect(cs(1)).toBe(16);
  });

  it('is 40 seconds for 5 clients and 400 for 50', () => {
    expect(cs(5)).toBe(40);
    expect(cs(50)).toBe(400);
  });

  it('doubles when the clients double once the server is the bottleneck', () => {
    expect(cs(20)).toBe(2 * cs(10));
    expect(cs(40)).toBe(2 * cs(20));
  });

  it('does not grow while the client download is the limit', () => {
    expect(cs(2)).toBe(cs(1));
  });

  it('never gets faster when clients are added', () => {
    let last = 0;
    for (let n = 1; n <= 60; n += 1) {
      expect(cs(n)).toBeGreaterThanOrEqual(last);
      last = cs(n);
    }
  });

  it('takes no time for an empty file', () => {
    expect(clientServerSeconds({ ...CS, clients: 3, fileMb: 0 })).toBe(0);
  });

  it('gets slower with a bigger file and faster with a faster server', () => {
    const base = cs(10);
    expect(clientServerSeconds({ ...CS, clients: 10, fileMb: 1600 })).toBe(
      2 * base,
    );
    expect(clientServerSeconds({ ...CS, clients: 10, serverUpMbps: 200 })).toBe(
      40,
    );
  });
});

describe('p2pSeconds', () => {
  it('is 40 seconds for 10 peers that each upload 10 megabits per second', () => {
    expect(p2p(10)).toBe(40);
  });

  it('is 16 seconds for one peer (the peer download is the limit)', () => {
    expect(p2p(1)).toBe(16);
  });

  it('matches the formula for 5, 20 and 50 peers', () => {
    expect(p2p(5)).toBeCloseTo(4000 / 150, 10);
    expect(p2p(20)).toBeCloseTo(16000 / 300, 10);
    expect(p2p(50)).toBeCloseTo(40000 / 600, 10);
  });

  it('never exceeds the client-server time for the same numbers', () => {
    for (let n = 1; n <= 200; n += 1) {
      expect(p2p(n)).toBeLessThanOrEqual(cs(n) + 1e-9);
    }
  });

  it('grows with the peers but stays below fileMb / peerUpMbps', () => {
    let last = 0;
    for (let n = 1; n <= 500; n += 1) {
      expect(p2p(n)).toBeGreaterThanOrEqual(last - 1e-9);
      expect(p2p(n)).toBeLessThan(800 / 10);
      last = p2p(n);
    }
  });

  it('is close to client-server when peers can hardly upload', () => {
    const t = p2pSeconds({ ...P2P, peers: 10, peerUpMbps: 1e-9 });
    expect(t).toBeCloseTo(80, 5);
  });

  it('with a very fast peer upload only the downloads limit it', () => {
    const t = p2pSeconds({ ...P2P, peers: 10, peerUpMbps: 1e6 });
    expect(t).toBe(16);
  });

  it('takes no time for an empty file', () => {
    expect(p2pSeconds({ ...P2P, peers: 4, fileMb: 0 })).toBe(0);
  });
});

describe('invalid input', () => {
  const badRates = [0, -1, Number.NaN, Infinity, -Infinity];
  const badCounts = [0, -3, 1.5, Number.NaN, Infinity];
  const csWith = (extra: object) => () =>
    clientServerSeconds({ ...CS, clients: 2, ...extra });
  const p2pWith = (extra: object) => () =>
    p2pSeconds({ ...P2P, peers: 2, ...extra });

  it.each(badRates)('clientServerSeconds rejects a rate of %s', (bad) => {
    expect(csWith({ serverUpMbps: bad })).toThrow(RangeError);
    expect(csWith({ clientDownMbps: bad })).toThrow(RangeError);
  });

  it.each(badRates)('p2pSeconds rejects a rate of %s', (bad) => {
    expect(p2pWith({ serverUpMbps: bad })).toThrow(RangeError);
    expect(p2pWith({ peerUpMbps: bad })).toThrow(RangeError);
    expect(p2pWith({ peerDownMbps: bad })).toThrow(RangeError);
  });

  it.each(badCounts)('both reject a count of %s', (bad) => {
    expect(csWith({ clients: bad })).toThrow(RangeError);
    expect(p2pWith({ peers: bad })).toThrow(RangeError);
  });

  it.each([-1, Number.NaN, Infinity])(
    'both reject a file size of %s',
    (bad) => {
      expect(csWith({ fileMb: bad })).toThrow(RangeError);
      expect(p2pWith({ fileMb: bad })).toThrow(RangeError);
    },
  );

  it('the bottleneck helpers reject the same input', () => {
    expect(() => clientServerBottleneck({ ...CS, clients: 0 })).toThrow(
      RangeError,
    );
    expect(() => p2pBottleneck({ ...P2P, peers: 2, peerUpMbps: 0 })).toThrow(
      RangeError,
    );
  });

  it('names the bad field in the message', () => {
    expect(csWith({ clients: 0 })).toThrow(/clients/);
    expect(csWith({ serverUpMbps: 0 })).toThrow(/serverUpMbps/);
    expect(p2pWith({ peerUpMbps: 0 })).toThrow(/peerUpMbps/);
    expect(p2pWith({ fileMb: -1 })).toThrow(/fileMb/);
  });
});

describe('bottleneck labels', () => {
  it('client-server: one client is limited by its download', () => {
    expect(clientServerBottleneck({ ...CS, clients: 1 })).toBe(
      'client download',
    );
  });

  it('client-server: 10 clients are limited by the server upload', () => {
    expect(clientServerBottleneck({ ...CS, clients: 10 })).toBe(
      'server upload',
    );
  });

  it('client-server: a tie at 2 clients counts as the server', () => {
    // 2 x 800 / 100 = 16 = 800 / 50
    expect(cs(2)).toBe(16);
    expect(clientServerBottleneck({ ...CS, clients: 2 })).toBe('server upload');
    expect(clientServerBottleneck({ ...CS, clients: 3 })).toBe('server upload');
  });

  it('client-server: a tie is found even with rounding error', () => {
    // Mathematically both times are 3 s, but the doubles differ in the last bit.
    const p = { fileMb: 0.7, serverUpMbps: 0.7, clientDownMbps: 0.7 / 3 };
    expect((3 * p.fileMb) / p.serverUpMbps).toBeLessThan(
      p.fileMb / p.clientDownMbps,
    );
    expect(clientServerBottleneck({ ...p, clients: 3 })).toBe('server upload');
  });

  it('p2p: one peer is limited by its download', () => {
    expect(p2pBottleneck({ ...P2P, peers: 1 })).toBe('client download');
  });

  it('p2p: 10 peers are limited by how much the peers can share', () => {
    expect(p2pBottleneck({ ...P2P, peers: 10 })).toBe('peer upload sharing');
  });

  it('p2p: a slow server upload can be the limit', () => {
    expect(
      p2pBottleneck({ ...P2P, peers: 1, serverUpMbps: 10, peerUpMbps: 1e6 }),
    ).toBe('server upload');
  });

  it('p2p: the label always names the term that equals the time', () => {
    for (let n = 1; n <= 80; n += 1) {
      const label = p2pBottleneck({ ...P2P, peers: n });
      const terms = {
        'server upload': 800 / 100,
        'client download': 800 / 50,
        'peer upload sharing': (n * 800) / (100 + n * 10),
      };
      expect(terms[label]).toBeCloseTo(p2p(n), 9);
    }
  });
});

describe('helpers', () => {
  it('converts megabytes to megabits (1 byte = 8 bits)', () => {
    expect(megabytesToMegabits(100)).toBe(800);
    expect(megabytesToMegabits(0)).toBe(0);
    expect(() => megabytesToMegabits(-1)).toThrow(RangeError);
    expect(() => megabytesToMegabits(Number.NaN)).toThrow(RangeError);
  });

  it('formats seconds with at most one decimal and never crashes', () => {
    expect(formatSeconds(80)).toBe('80');
    expect(formatSeconds(16)).toBe('16');
    expect(formatSeconds(4000 / 150)).toBe('26.7');
    expect(formatSeconds(0)).toBe('0');
    expect(formatSeconds(7.25)).toBe('7.3');
    expect(formatSeconds(Number.NaN)).toBe('unknown');
    expect(formatSeconds(Infinity)).toBe('unknown');
    expect(formatSeconds(-5)).toBe('unknown');
  });

  it('clamps a count into 1 to 50', () => {
    expect(clampCount(10)).toBe(10);
    expect(clampCount(0)).toBe(1);
    expect(clampCount(-4)).toBe(1);
    expect(clampCount(51)).toBe(50);
    expect(clampCount(7.9)).toBe(7);
    expect(clampCount(Number.NaN)).toBe(1);
    expect(clampCount(Infinity)).toBe(50);
  });
});
