// Lab goals for the network builder. Pure TypeScript: no React.

import { ping, type Device, type Network } from '@/netcore/network';

export type LabTask = {
  id: string;
  description: string;
  check: (net: Network) => boolean;
};

export type TaskResult = { id: string; description: string; done: boolean };

/**
 * Check every task against the network. A task whose `check` throws (or
 * returns anything other than `true`) counts as not done, so one broken goal
 * can never crash the lab.
 */
export function evaluateLab(tasks: LabTask[], net: Network): TaskResult[] {
  return tasks.map(({ id, description, check }) => {
    let done = false;
    try {
      const outcome: unknown = check(net);
      done = outcome === true;
    } catch {
      done = false;
    }
    return { id, description, done };
  });
}

function byName(net: Network, name: string): Device | undefined {
  const wanted = name.toLowerCase();
  return net.devices.find((d) => d.name.toLowerCase() === wanted);
}

/**
 * True when the device called `fromName` can ping the address of the device
 * called `toName`. Names are matched ignoring case. It uses `ping` itself, so
 * subnets, switches and cables all count. Unknown names or a target with no
 * address give false.
 */
export function canPing(
  net: Network,
  fromName: string,
  toName: string,
): boolean {
  const from = byName(net, fromName);
  const to = byName(net, toName);
  return from !== undefined && to !== undefined && pingDevice(net, from, to);
}

function pingDevice(net: Network, from: Device, to: Device): boolean {
  return to.ip !== undefined && ping(net, from.id, to.ip).ok;
}

/** Done when two different computers can each ping the other. */
export function twoPcsCanPingTask(
  overrides: { id?: string; description?: string } = {},
): LabTask {
  return {
    id: overrides.id ?? 'two-pcs-can-ping',
    description: overrides.description ?? 'Two computers can ping each other',
    check: (net) => {
      const pcs = net.devices.filter((d) => d.kind === 'pc');
      return pcs.some((a, i) =>
        pcs
          .slice(i + 1)
          .some(
            (b) =>
              a.id !== b.id && pingDevice(net, a, b) && pingDevice(net, b, a),
          ),
      );
    },
  };
}
