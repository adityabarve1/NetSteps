// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { TRY_DEVICES, networkVerdict } from './logic';

describe('networkVerdict (the try-it)', () => {
  it('nothing connected is not a network', () => {
    const v = networkVerdict({ connected: [], switchOn: true });
    expect(v.isNetwork).toBe(false);
    expect(v.summary).toBe(
      'Not a network yet. Nothing is connected to the switch, so no device can share anything.',
    );
    expect(v.details).toEqual([]);
  });

  it('one device alone is not a network', () => {
    const v = networkVerdict({ connected: ['laptop'], switchOn: true });
    expect(v.isNetwork).toBe(false);
    expect(v.summary).toBe(
      'Not a network yet. Laptop is connected, but it has no other device to talk to. A network needs at least two.',
    );
    expect(v.details).toEqual([
      'Desktop, Printer and TV have no link, so they are not part of it.',
    ]);
  });

  it('two connected devices are a network and say what they can share', () => {
    const v = networkVerdict({
      connected: ['printer', 'laptop'],
      switchOn: true,
    });
    expect(v.isNetwork).toBe(true);
    expect(v.summary).toBe(
      'This is a network: Laptop and Printer are linked through the switch.',
    );
    expect(v.details).toEqual([
      'Laptop can print a page on Printer.',
      'Desktop and TV have no link, so they are not part of it.',
    ]);
  });

  it('a pair with little to share is still a network', () => {
    const v = networkVerdict({ connected: ['printer', 'tv'], switchOn: true });
    expect(v.isNetwork).toBe(true);
    expect(v.details).toEqual([
      'Printer and TV have little to share with each other, but they can still exchange data, so they still form a network.',
      'Laptop and Desktop have no link, so they are not part of it.',
    ]);
  });

  it('everything connected lists every useful pair and leaves no one out', () => {
    const v = networkVerdict({
      connected: ['tv', 'desktop', 'printer', 'laptop'],
      switchOn: true,
    });
    expect(v.summary).toBe(
      'This is a network: Laptop, Desktop, Printer and TV are linked through the switch.',
    );
    expect(v.details).toEqual([
      'Laptop and Desktop can swap files and photos.',
      'Laptop can print a page on Printer.',
      'Laptop can play a video on TV.',
      'Desktop can print a page on Printer.',
      'Desktop can play a video on TV.',
    ]);
  });

  it('a switch with no power joins nobody, even with cables in place', () => {
    const v = networkVerdict({
      connected: ['laptop', 'desktop'],
      switchOn: false,
    });
    expect(v.isNetwork).toBe(false);
    expect(v.summary).toBe(
      'Not a network right now. The switch has no power, so it cannot pass messages between Laptop and Desktop, even though their cables are plugged in.',
    );
  });

  it('a powered-off switch with fewer than two devices explains the missing devices first', () => {
    const v = networkVerdict({ connected: ['tv'], switchOn: false });
    expect(v.isNetwork).toBe(false);
    expect(v.summary).toContain('TV is connected, but it has no other device');
  });

  it('ignores unknown ids and repeats, and keeps the catalogue order', () => {
    const v = networkVerdict({
      connected: ['laptop', 'laptop', 'toaster', '__proto__', 'desktop'],
      switchOn: true,
    });
    expect(v.summary).toBe(
      'This is a network: Laptop and Desktop are linked through the switch.',
    );
  });

  it('never throws on malformed input', () => {
    const odd = [
      undefined,
      null,
      {},
      { connected: 'laptop', switchOn: true },
      { connected: [1, null, {}], switchOn: 'yes' },
      // Only `true` turns the switch on: a missing or odd value means off.
      { connected: ['laptop', 'desktop'], switchOn: 'yes' },
      { connected: ['laptop', 'desktop'] },
    ] as unknown as Parameters<typeof networkVerdict>[0][];
    for (const input of odd) {
      const v = networkVerdict(input);
      expect(v.isNetwork).toBe(false);
      expect(v.summary).not.toBe('');
    }
  });

  it('the catalogue has four devices with unique ids', () => {
    const ids = TRY_DEVICES.map((d) => d.id);
    expect(ids).toEqual(['laptop', 'desktop', 'printer', 'tv']);
  });
});
