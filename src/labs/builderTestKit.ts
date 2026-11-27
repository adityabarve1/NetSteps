// Small helpers shared by the builder tests. Not imported by app code.
import { screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { builderReducer, type BuilderAction } from '@/labs/builderReducer';
import type { DeviceKind, Network } from '@/netcore/network';

export const empty = (): Network => ({ devices: [], links: [] });

export function run(start: Network, ...actions: BuilderAction[]): Network {
  return actions.reduce(builderReducer, start);
}

export function add(kind: DeviceKind, x = 100, y = 100): BuilderAction {
  return { type: 'addDevice', kind, x, y };
}

export function names(net: Network): string[] {
  return net.devices.map((d) => d.name);
}

// DOM helpers for the BuilderLab component tests.

export type User = ReturnType<typeof userEvent.setup>;

/** The canvas button for a device, found by its name at the start of its label. */
export const node = (name: string): HTMLElement =>
  screen.getByRole('button', { name: new RegExp(`^${name},`) });

export const cables = (): HTMLElement[] =>
  screen.queryAllByRole('img', { name: /^Cable between/ });

export const deviceNodes = (): HTMLElement[] =>
  screen.queryAllByRole('button', { name: /, (computer|switch|server)/ });

export async function addDevices(user: User, label: string, times = 1) {
  for (let i = 0; i < times; i += 1) {
    await user.click(screen.getByRole('button', { name: label }));
  }
}

/** Select `from`, press its Connect button, then pick `to`. */
export async function cable(user: User, from: string, to: string) {
  await user.click(node(from));
  await user.click(
    screen.getByRole('button', { name: `Connect ${from} to another device` }),
  );
  await user.click(node(to));
}

/** Type (paste) an address into a labelled field of the selected device. */
export async function fill(user: User, label: string, value: string) {
  const box = screen.getByLabelText(label);
  await user.clear(box);
  if (value !== '') {
    await user.click(box);
    await user.paste(value);
  }
}

export async function configure(
  user: User,
  device: string,
  ip: string,
  mask = '/24',
) {
  await user.click(node(device));
  await fill(user, 'IP address', ip);
  await fill(user, 'Subnet mask', mask);
}

export async function tabTo(user: User, name: RegExp | string) {
  for (let i = 0; i < 40; i += 1) {
    await user.tab();
    const label = document.activeElement?.getAttribute('aria-label') ?? '';
    const text = document.activeElement?.textContent ?? '';
    const hit = [label, text].some((t) =>
      typeof name === 'string' ? t === name : name.test(t),
    );
    if (hit) return;
  }
  throw new Error(`Tab never reached ${String(name)}`);
}
