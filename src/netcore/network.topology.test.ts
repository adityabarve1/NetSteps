import { describe, expect, it } from 'vitest';
import type { Device, Link, Network } from './network';
import { ping } from './network';
import { device, link, net, pc, server, sw } from './network.fixtures';

describe('ping: topology edge cases', () => {
  it('a triangle of switches terminates and takes the short way', () => {
    const n = net(
      [
        pc('pc1', '10.0.0.1'),
        sw('s1'),
        sw('s2'),
        sw('s3'),
        pc('pc2', '10.0.0.2'),
      ],
      [
        link('pc1', 's1'),
        link('s1', 's2'),
        link('s2', 's3'),
        link('s3', 's1'),
        link('s3', 'pc2'),
      ],
    );
    const r = ping(n, 'pc1', '10.0.0.2');
    expect(r.path).toEqual(['pc1', 's1', 's3', 'pc2']);
    expect(r.rttMs).toBe(3);
  });

  it('a triangle of switches with an unreachable target terminates with no-path', () => {
    const n = net(
      [
        pc('pc1', '10.0.0.1'),
        sw('s1'),
        sw('s2'),
        sw('s3'),
        pc('pc2', '10.0.0.2'),
      ],
      [link('pc1', 's1'), link('s1', 's2'), link('s2', 's3'), link('s3', 's1')],
    );
    expect(ping(n, 'pc1', '10.0.0.2').failure).toBe('no-path');
  });

  it('is deterministic on a tie: the first link in array order wins', () => {
    const devices = [
      pc('pc1', '10.0.0.1'),
      sw('sA'),
      sw('sB'),
      pc('pc2', '10.0.0.2'),
    ];
    const viaA = net(devices, [
      link('pc1', 'sA'),
      link('pc1', 'sB'),
      link('sA', 'pc2'),
      link('sB', 'pc2'),
    ]);
    const viaB = net(devices, [
      link('pc1', 'sB'),
      link('pc1', 'sA'),
      link('sA', 'pc2'),
      link('sB', 'pc2'),
    ]);
    expect(ping(viaA, 'pc1', '10.0.0.2').path).toEqual(['pc1', 'sA', 'pc2']);
    expect(ping(viaB, 'pc1', '10.0.0.2').path).toEqual(['pc1', 'sB', 'pc2']);
  });

  it('prefers a shorter route over a longer one', () => {
    const n = net(
      [
        pc('pc1', '10.0.0.1'),
        sw('s1'),
        sw('s2'),
        sw('s3'),
        pc('pc2', '10.0.0.2'),
      ],
      [
        link('pc1', 's1'),
        link('s1', 's2'),
        link('s2', 's3'),
        link('s3', 'pc2'),
        link('s1', 'pc2'),
      ],
    );
    expect(ping(n, 'pc1', '10.0.0.2').rttMs).toBe(2);
  });

  it('ignores self-links and duplicate links', () => {
    const n = net(
      [pc('pc1', '10.0.0.1'), sw('s1'), pc('pc2', '10.0.0.2')],
      [
        link('s1', 's1', 'loop'),
        link('pc1', 'pc1', 'loop2'),
        link('pc1', 's1', 'a'),
        link('pc1', 's1', 'b'),
        link('s1', 'pc1', 'c'),
        link('s1', 'pc2'),
      ],
    );
    expect(ping(n, 'pc1', '10.0.0.2')).toEqual({
      ok: true,
      path: ['pc1', 's1', 'pc2'],
      rttMs: 2,
    });
  });

  it('ignores links that name unknown device ids', () => {
    const n = net(
      [pc('pc1', '10.0.0.1'), sw('s1'), pc('pc2', '10.0.0.2')],
      [
        link('pc1', 'ghost'),
        link('ghost', 's1'),
        link('ghost', 'ghost2'),
        link('', ''),
        link('pc1', 's1'),
        link('s1', 'pc2'),
      ],
    );
    expect(ping(n, 'pc1', '10.0.0.2').path).toEqual(['pc1', 's1', 'pc2']);
  });

  it('a link that only reaches an unknown id never forms a path', () => {
    const n = net(
      [pc('pc1', '10.0.0.1'), sw('s1'), pc('pc2', '10.0.0.2')],
      [link('pc1', 's1'), link('s1', 'ghost'), link('ghost', 'pc2')],
    );
    expect(ping(n, 'pc1', '10.0.0.2').failure).toBe('no-path');
  });

  it('a switch with no links is harmless', () => {
    const n = net(
      [sw('lonely'), pc('pc1', '10.0.0.1'), pc('pc2', '10.0.0.2')],
      [link('pc1', 'pc2')],
    );
    expect(ping(n, 'pc1', '10.0.0.2').rttMs).toBe(1);
    expect(ping(n, 'lonely', '10.0.0.2').failure).toBe('no-ip-config');
  });

  it('duplicate device ids: the first device with an id wins, later ones are ignored', () => {
    const n = net(
      [
        pc('pc1', '10.0.0.1'),
        pc('pc1', '10.0.0.9'),
        sw('s1'),
        pc('pc2', '10.0.0.2'),
      ],
      [link('pc1', 's1'), link('s1', 'pc2')],
    );
    expect(ping(n, 'pc1', '10.0.0.2').ok).toBe(true);
    // The shadowed duplicate's IP does not exist on the network.
    expect(ping(n, 'pc2', '10.0.0.9').failure).toBe('unknown-host');
  });

  it('a switch can own an IP and be pinged; a source switch with an IP can ping out', () => {
    const n = net(
      [
        { ...device('s1', 'switch'), ip: '10.0.0.100', mask: '/24' },
        pc('pc1', '10.0.0.1'),
      ],
      [link('pc1', 's1')],
    );
    expect(ping(n, 'pc1', '10.0.0.100').path).toEqual(['pc1', 's1']);
    expect(ping(n, 's1', '10.0.0.1').path).toEqual(['s1', 'pc1']);
  });
});

describe('ping: duplicate IPs', () => {
  it('picks the owner reachable by the shortest path', () => {
    const n = net(
      [
        pc('src', '10.0.0.1'),
        sw('s1'),
        sw('s2'),
        pc('far', '10.0.0.5'),
        pc('near', '10.0.0.5'),
      ],
      [
        link('src', 's1'),
        link('s1', 's2'),
        link('s2', 'far'),
        link('s1', 'near'),
      ],
    );
    expect(ping(n, 'src', '10.0.0.5').path).toEqual(['src', 's1', 'near']);
  });

  it('breaks ties by array order', () => {
    const devices = [
      pc('src', '10.0.0.1'),
      sw('s1'),
      pc('first', '10.0.0.5'),
      pc('second', '10.0.0.5'),
    ];
    const links = [
      link('src', 's1'),
      link('s1', 'second'),
      link('s1', 'first'),
    ];
    expect(ping(net(devices, links), 'src', '10.0.0.5').path[2]).toBe('first');
  });

  it('uses a reachable owner even if an earlier owner is unplugged', () => {
    const n = net(
      [
        pc('src', '10.0.0.1'),
        sw('s1'),
        pc('unplugged', '10.0.0.5'),
        pc('plugged', '10.0.0.5'),
      ],
      [link('src', 's1'), link('s1', 'plugged')],
    );
    expect(ping(n, 'src', '10.0.0.5').path).toEqual(['src', 's1', 'plugged']);
  });

  it('with owners but none reachable the result is no-path', () => {
    const n = net(
      [pc('src', '10.0.0.1'), pc('a', '10.0.0.5'), pc('b', '10.0.0.5')],
      [],
    );
    expect(ping(n, 'src', '10.0.0.5').failure).toBe('no-path');
  });
});

describe('ping: scale and safety', () => {
  function chain(length: number): Network {
    const devices: Device[] = [pc('first', '10.0.0.1', '/0')];
    const links: Link[] = [];
    let previous = 'first';
    for (let i = 0; i < length; i += 1) {
      devices.push(sw(`s${String(i)}`));
      links.push(link(previous, `s${String(i)}`));
      previous = `s${String(i)}`;
    }
    devices.push(server('last', '10.0.0.2'));
    links.push(link(previous, 'last'));
    return net(devices, links);
  }

  it('1000 switches in a chain complete quickly without overflowing the stack', () => {
    const n = chain(1000);
    const started = performance.now();
    const r = ping(n, 'first', '10.0.0.2');
    const elapsed = performance.now() - started;
    expect(r.ok).toBe(true);
    expect(r.path).toHaveLength(1002);
    expect(r.rttMs).toBe(1001);
    expect(elapsed).toBeLessThan(1000);
  });

  it('a long chain broken in the middle reports no-path', () => {
    const n = chain(1000);
    const broken = net(
      n.devices,
      n.links.filter((l) => l.id !== 's499~s500'),
    );
    expect(ping(broken, 'first', '10.0.0.2').failure).toBe('no-path');
  });

  it('a dense mesh of switches terminates', () => {
    const devices: Device[] = [pc('a', '10.0.0.1'), pc('b', '10.0.0.2')];
    const links: Link[] = [link('a', 's0'), link('s39', 'b')];
    for (let i = 0; i < 40; i += 1) {
      devices.push(sw(`s${String(i)}`));
      for (let j = i + 1; j < 40; j += 1) {
        links.push(link(`s${String(i)}`, `s${String(j)}`));
      }
    }
    const r = ping(net(devices, links), 'a', '10.0.0.2');
    expect(r.path).toEqual(['a', 's0', 's39', 'b']);
  });

  it('does not mutate the network it is given', () => {
    const n = net(
      [pc('pc1', '10.0.0.1'), sw('s1'), pc('pc2', '10.0.0.2')],
      [link('pc1', 's1'), link('s1', 'pc2')],
    );
    const before = JSON.stringify(n);
    ping(n, 'pc1', '10.0.0.2');
    ping(n, 'pc1', 'junk');
    expect(JSON.stringify(n)).toBe(before);
  });

  it('5000 hostile calls never throw and always return a well-formed result', () => {
    const targets = [
      '',
      ' ',
      '1',
      '1.2.3',
      '10.0.0.2',
      ' 10.0.0.2',
      '10.0.0.2\n',
      '010.0.0.2',
      '999.999.999.999',
      '0.0.0.0',
      '255.255.255.255',
      '١.٢.٣.٤',
      '1e1.0.0.1',
      '-1',
      'a'.repeat(10000),
      '__proto__',
      'constructor',
      'localhost',
    ];
    const ids = ['pc1', 'sw1', 'pc2', '', 'ghost', '__proto__', 'constructor'];
    const bad: Device[] = [
      device('x1', 'pc', { ip: '１.2.3.4', mask: '/24' }),
      device('x2', 'pc', { ip: '10.0.0.2', mask: '/-5' }),
      device('__proto__', 'pc', { ip: '10.0.0.77', mask: '/24' }),
    ];
    const n = net(
      [pc('pc1', '10.0.0.1'), sw('sw1'), pc('pc2', '10.0.0.2'), ...bad],
      [link('pc1', 'sw1'), link('sw1', 'pc2'), link('__proto__', 'sw1')],
    );
    for (let i = 0; i < 5000; i += 1) {
      const target = targets[i % targets.length] ?? '';
      const id = ids[(i * 7) % ids.length] ?? '';
      const r = ping(n, id, target);
      expect(typeof r.ok).toBe('boolean');
      expect(Array.isArray(r.path)).toBe(true);
      expect(r.ok === (r.failure === undefined)).toBe(true);
    }
  });
});
