import { describe, expect, it } from 'vitest';
import { link, net, pc, server, simpleLan, sw } from './network.fixtures';
import { ping } from './network';

describe('ping: the plan cases', () => {
  it('pc1 - sw1 - pc2 succeeds with rtt 2', () => {
    expect(ping(simpleLan(), 'pc1', '192.168.1.20')).toEqual({
      ok: true,
      path: ['pc1', 'sw1', 'pc2'],
      rttMs: 2,
    });
  });

  it('success has no failure property at all', () => {
    expect('failure' in ping(simpleLan(), 'pc1', '192.168.1.20')).toBe(false);
  });

  it('works in the other direction and to a server', () => {
    const n = net(
      [pc('pc1', '10.0.0.1'), sw('sw1'), server('srv', '10.0.0.2')],
      [link('pc1', 'sw1'), link('srv', 'sw1')],
    );
    expect(ping(n, 'srv', '10.0.0.1').path).toEqual(['srv', 'sw1', 'pc1']);
    expect(ping(n, 'pc1', '10.0.0.2').ok).toBe(true);
  });

  it('two chained switches give path length 4 and rtt 3', () => {
    const n = net(
      [
        pc('pc1', '192.168.1.10'),
        sw('sw1'),
        sw('sw2'),
        pc('pc2', '192.168.1.20'),
      ],
      [link('pc1', 'sw1'), link('sw1', 'sw2'), link('sw2', 'pc2')],
    );
    const r = ping(n, 'pc1', '192.168.1.20');
    expect(r.ok).toBe(true);
    expect(r.path).toEqual(['pc1', 'sw1', 'sw2', 'pc2']);
    expect(r.path).toHaveLength(4);
    expect(r.rttMs).toBe(3);
  });

  it('a direct cable between two PCs works with rtt 1', () => {
    const n = net(
      [pc('pc1', '192.168.1.10'), pc('pc2', '192.168.1.20')],
      [link('pc1', 'pc2')],
    );
    expect(ping(n, 'pc1', '192.168.1.20')).toEqual({
      ok: true,
      path: ['pc1', 'pc2'],
      rttMs: 1,
    });
  });

  it('a PC pinging its own IP succeeds with path [id] and rtt 0', () => {
    expect(ping(simpleLan(), 'pc1', '192.168.1.10')).toEqual({
      ok: true,
      path: ['pc1'],
      rttMs: 0,
    });
  });

  it('a lone unplugged PC can still ping itself', () => {
    const n = net([pc('pc1', '10.0.0.5')], []);
    expect(ping(n, 'pc1', '10.0.0.5')).toEqual({
      ok: true,
      path: ['pc1'],
      rttMs: 0,
    });
  });

  it('missing IP on the source gives no-ip-config', () => {
    const n = net(
      [pc('pc1'), sw('sw1'), pc('pc2', '192.168.1.20')],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(ping(n, 'pc1', '192.168.1.20')).toEqual({
      ok: false,
      failure: 'no-ip-config',
      path: [],
      rttMs: 0,
    });
  });

  it('a different subnet gives different-network', () => {
    const n = net(
      [pc('pc1', '192.168.1.10'), sw('sw1'), pc('pc2', '192.168.2.20')],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(ping(n, 'pc1', '192.168.2.20')).toEqual({
      ok: false,
      failure: 'different-network',
      path: [],
      rttMs: 0,
    });
  });

  it('a missing cable gives no-path', () => {
    const n = net(
      [pc('pc1', '192.168.1.10'), sw('sw1'), pc('pc2', '192.168.1.20')],
      [link('pc1', 'sw1')],
    );
    expect(ping(n, 'pc1', '192.168.1.20')).toEqual({
      ok: false,
      failure: 'no-path',
      path: [],
      rttMs: 0,
    });
  });

  it('a PC in the middle does not forward', () => {
    const n = net(
      [
        pc('pc1', '192.168.1.10'),
        pc('pc3', '192.168.1.30'),
        pc('pc2', '192.168.1.20'),
      ],
      [link('pc1', 'pc3'), link('pc3', 'pc2')],
    );
    expect(ping(n, 'pc1', '192.168.1.20').failure).toBe('no-path');
    expect(ping(n, 'pc1', '192.168.1.30').ok).toBe(true);
  });

  it('a server in the middle does not forward either', () => {
    const n = net(
      [
        pc('pc1', '192.168.1.10'),
        server('srv', '192.168.1.30'),
        pc('pc2', '192.168.1.20'),
      ],
      [link('pc1', 'srv'), link('srv', 'pc2')],
    );
    expect(ping(n, 'pc1', '192.168.1.20').failure).toBe('no-path');
  });

  it('999.1.1.1 and a valid IP nobody owns give unknown-host', () => {
    expect(ping(simpleLan(), 'pc1', '999.1.1.1').failure).toBe('unknown-host');
    expect(ping(simpleLan(), 'pc1', '192.168.1.99').failure).toBe(
      'unknown-host',
    );
  });

  it('a target with surrounding spaces is rejected as unknown-host', () => {
    for (const t of [' 192.168.1.20', '192.168.1.20 ', '192.168.1.20\n']) {
      expect(ping(simpleLan(), 'pc1', t).failure, JSON.stringify(t)).toBe(
        'unknown-host',
      );
    }
  });

  it('failures always carry an empty path and rtt 0', () => {
    const cases = [
      ping(simpleLan(), 'pc1', ''),
      ping(simpleLan(), 'nobody', '192.168.1.20'),
      ping(simpleLan(), 'pc1', '8.8.8.8'),
    ];
    for (const r of cases) {
      expect(r.ok).toBe(false);
      expect(r.path).toEqual([]);
      expect(r.rttMs).toBe(0);
    }
  });
});

describe('ping: decision order', () => {
  it('(a) an invalid target beats an unconfigured source', () => {
    const n = net([pc('pc1')], []);
    expect(ping(n, 'pc1', '999.1.1.1').failure).toBe('unknown-host');
  });

  it('(a) an invalid target beats an unknown source id', () => {
    expect(ping(simpleLan(), 'ghost', 'nope').failure).toBe('unknown-host');
  });

  it('(b) an unconfigured source beats an unowned target', () => {
    const n = net([pc('pc1')], []);
    expect(ping(n, 'pc1', '8.8.8.8').failure).toBe('no-ip-config');
  });

  it('(b) an unknown source id gives no-ip-config with an empty path, not a throw', () => {
    expect(ping(simpleLan(), 'ghost', '192.168.1.20')).toEqual({
      ok: false,
      failure: 'no-ip-config',
      path: [],
      rttMs: 0,
    });
  });

  it('(b) a source with an IP but a missing or invalid mask is no-ip-config', () => {
    for (const mask of [undefined, '', '255.0.255.0', '/33', ' /24']) {
      const n = net(
        [
          { ...pc('pc1', '192.168.1.10'), mask },
          sw('sw1'),
          pc('pc2', '192.168.1.20'),
        ],
        [link('pc1', 'sw1'), link('sw1', 'pc2')],
      );
      expect(ping(n, 'pc1', '192.168.1.20').failure, String(mask)).toBe(
        'no-ip-config',
      );
    }
  });

  it('(b) a source with an invalid IP string is no-ip-config', () => {
    for (const ip of ['999.1.1.1', '01.2.3.4', ' 1.2.3.4', 'abc']) {
      const n = net(
        [pc('pc1', ip), sw('sw1'), pc('pc2', '1.2.3.5')],
        [link('pc1', 'sw1'), link('sw1', 'pc2')],
      );
      expect(ping(n, 'pc1', '1.2.3.5').failure, ip).toBe('no-ip-config');
    }
  });

  it('(c) a valid but unowned target is unknown-host even when nothing is cabled', () => {
    const n = net([pc('pc1', '10.0.0.1')], []);
    expect(ping(n, 'pc1', '10.0.0.2').failure).toBe('unknown-host');
  });

  it('(c) a target owned by a device with a garbage IP string is not owned', () => {
    const n = net(
      [pc('pc1', '10.0.0.1'), pc('pc2', '010.0.0.2')],
      [link('pc1', 'pc2')],
    );
    expect(ping(n, 'pc1', '10.0.0.2').failure).toBe('unknown-host');
  });

  it('(c) an unowned target on another subnet is unknown-host, not different-network', () => {
    expect(ping(simpleLan(), 'pc1', '8.8.8.8').failure).toBe('unknown-host');
  });

  it('(d) self-ping is checked before the subnet and path steps', () => {
    const n = net([pc('pc1', '10.0.0.1', '/32')], []);
    expect(ping(n, 'pc1', '10.0.0.1').ok).toBe(true);
  });

  it('(d) self-ping wins even when another device shares the IP', () => {
    const n = net(
      [pc('pc1', '10.0.0.1'), sw('sw1'), pc('pc2', '10.0.0.1')],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(ping(n, 'pc1', '10.0.0.1').path).toEqual(['pc1']);
  });

  it('(e) different-network beats no-path (no cables needed to be told it is a different network)', () => {
    const n = net([pc('pc1', '10.0.0.1'), pc('pc2', '10.0.1.1')], []);
    expect(ping(n, 'pc1', '10.0.1.1').failure).toBe('different-network');
  });

  it('(e) the subnet check uses the SOURCE mask; gateways are ignored', () => {
    // pc1 /24 says 10.0.1.1 is elsewhere; pc2 has /16 and would say same network.
    const n = net(
      [
        pc('pc1', '10.0.0.1', '/24'),
        sw('sw1'),
        { ...pc('pc2', '10.0.1.1', '/16'), gateway: '10.0.0.1' },
      ],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(ping(n, 'pc1', '10.0.1.1').failure).toBe('different-network');
    // The other way round: pc2 (/16) thinks 10.0.0.1 is local, and it is reachable.
    expect(ping(n, 'pc2', '10.0.0.1').ok).toBe(true);
  });

  it('(e) the target need not have a valid mask: only the source mask is used', () => {
    const n = net(
      [
        pc('pc1', '10.0.0.1'),
        sw('sw1'),
        { ...pc('pc2', '10.0.0.2'), mask: 'garbage' },
      ],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(ping(n, 'pc1', '10.0.0.2').ok).toBe(true);
  });

  it('(e) a /0 source mask treats every address as local', () => {
    const n = net(
      [pc('pc1', '10.0.0.1', '/0'), sw('sw1'), pc('pc2', '200.9.9.9')],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(ping(n, 'pc1', '200.9.9.9').ok).toBe(true);
  });

  it('(e) a /32 source mask makes every other address a different network', () => {
    const n = net(
      [pc('pc1', '10.0.0.1', '/32'), sw('sw1'), pc('pc2', '10.0.0.2')],
      [link('pc1', 'sw1'), link('sw1', 'pc2')],
    );
    expect(ping(n, 'pc1', '10.0.0.2').failure).toBe('different-network');
  });

  it('works with addresses above 128.0.0.0 and 255.255.255.255', () => {
    const n = net(
      [
        pc('a', '200.1.1.1', '/8'),
        sw('s'),
        pc('b', '200.9.9.9'),
        pc('c', '255.255.255.255', '/0'),
      ],
      [link('a', 's'), link('s', 'b'), link('s', 'c')],
    );
    expect(ping(n, 'a', '200.9.9.9').ok).toBe(true);
    expect(ping(n, 'c', '200.1.1.1').path).toEqual(['c', 's', 'a']);
    expect(ping(n, 'a', '255.255.255.255').failure).toBe('different-network');
  });
});
