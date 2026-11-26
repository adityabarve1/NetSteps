// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { compareText, describeLimit, report } from './logic';

describe('report', () => {
  it('uses the lesson numbers for 10 computers', () => {
    expect(report(10)).toEqual({
      count: 10,
      clientServer: 80,
      peerToPeer: 40,
      clientServerLimit: 'server upload',
      peerToPeerLimit: 'peer upload sharing',
    });
  });

  it('for one computer both ways take 16 seconds, limited by the download', () => {
    expect(report(1)).toEqual({
      count: 1,
      clientServer: 16,
      peerToPeer: 16,
      clientServerLimit: 'client download',
      peerToPeerLimit: 'client download',
    });
  });

  it('for 50 computers: 400 seconds against 66.7', () => {
    const r = report(50);
    expect(r.clientServer).toBe(400);
    expect(r.peerToPeer).toBeCloseTo(40000 / 600, 10);
  });

  it('keeps odd counts in range instead of throwing', () => {
    expect(report(0).count).toBe(1);
    expect(report(500).count).toBe(50);
    expect(report(Number.NaN).count).toBe(1);
    expect(report(7.9).count).toBe(7);
  });
});

describe('describeLimit', () => {
  it('has plain words for every bottleneck', () => {
    expect(describeLimit('server upload')).toBe('the server’s upload speed');
    expect(describeLimit('client download')).toBe(
      'the computer’s own download speed',
    );
    expect(describeLimit('peer upload sharing')).toBe(
      'how much the peers can upload together',
    );
  });
});

describe('compareText', () => {
  it('says both ways are equal for one computer', () => {
    expect(compareText(report(1))).toBe('Both ways take the same time here.');
  });

  it('says how many seconds peer-to-peer saves', () => {
    expect(compareText(report(10))).toBe(
      'Peer-to-peer finishes 40 seconds sooner.',
    );
    expect(compareText(report(50))).toBe(
      'Peer-to-peer finishes 333.3 seconds sooner.',
    );
  });

  it('reports a small but real gap', () => {
    const r = { ...report(10), clientServer: 43 };
    expect(compareText(r)).toBe('Peer-to-peer finishes 3 seconds sooner.');
  });

  it('treats a rounding-sized gap as equal', () => {
    const r = { ...report(10), clientServer: 40 + 1e-12 };
    expect(compareText(r)).toBe('Both ways take the same time here.');
  });
});
