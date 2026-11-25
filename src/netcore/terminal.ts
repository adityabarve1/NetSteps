// The practice terminal's command interpreter. Pure TypeScript: it reads the
// in-memory `Network` it is given and returns text. It never touches the real
// network, runs nothing, and never throws. Anything it does not understand
// (including shell characters such as `;` or `|`) is just text.

import { formatIPv4, parseIPv4, parseMask } from './ipv4';
import type { Device, Network } from './network';
import { pingLines } from './terminalPing';

export type TerminalOs = 'windows' | 'unix';

export type CommandResult = { lines: string[]; clear?: boolean };

// Longest command line the terminal will look at, after whitespace is tidied.
const MAX_INPUT_LENGTH = 200;

const PING_USAGE = 'Usage: ping <ip-address>';
const NO_SUCH_DEVICE = 'No such device.';
// A switch has no IP stack and so no command line. The labs only offer a
// terminal on a pc or a server, so this is a safety net.
const NO_COMMAND_LINE =
  'This device has no command line. Open a terminal on a PC or a server.';
const BAD_INPUT: Record<TerminalOs, string> = {
  windows: 'The syntax of the command is incorrect.',
  unix: 'bash: syntax error: input is too long or has invalid characters',
};

const say = (...lines: string[]): CommandResult => ({ lines });

/** True for the C0 and C1 control characters (tab and newline are collapsed earlier). */
function hasControlCharacter(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

/** The device's usable IPv4 settings, or `null` when it has none. */
function settingsOf(
  host: Device,
): { ip: string; mask: string; gateway: string | null } | null {
  const ip = parseIPv4(host.ip ?? '');
  const mask = parseMask(host.mask ?? '');
  if (ip === null || mask === null) return null;
  const gateway = parseIPv4(host.gateway ?? '');
  return {
    ip: formatIPv4(ip),
    mask: formatIPv4(mask),
    gateway: gateway === null ? null : formatIPv4(gateway),
  };
}

function ipconfig(host: Device): CommandResult {
  const head = [
    'Windows IP Configuration',
    '',
    'Ethernet adapter Ethernet:',
    '',
  ];
  const settings = settingsOf(host);
  if (settings === null) {
    return say(
      ...head,
      '   Media State . . . . . . . . . . . : Media disconnected',
    );
  }
  const lines = [
    ...head,
    `   IPv4 Address. . . . . . . . . . . : ${settings.ip}`,
    `   Subnet Mask . . . . . . . . . . . : ${settings.mask}`,
  ];
  if (settings.gateway !== null) {
    lines.push(`   Default Gateway . . . . . . . . . : ${settings.gateway}`);
  }
  return say(...lines);
}

function ifconfig(host: Device): CommandResult {
  const settings = settingsOf(host);
  if (settings === null) {
    return say('eth0: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500');
  }
  return say(
    'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500',
    `        inet ${settings.ip}  netmask ${settings.mask}`,
  );
}

function help(os: TerminalOs): CommandResult {
  const windows = os === 'windows';
  return say(
    'Commands you can use in this practice terminal:',
    '  help      Show this list',
    windows
      ? "  ipconfig  Show this computer's IP settings"
      : "  ifconfig  Show this computer's IP settings",
    '  ping      Check whether another device answers: ping <ip-address>',
    windows ? '  cls       Clear the screen' : '  clear     Clear the screen',
  );
}

function notFound(name: string, os: TerminalOs): CommandResult {
  return say(
    os === 'windows'
      ? `'${name}' is not recognized as an internal or external command, operable program or batch file.`
      : `${name}: command not found`,
  );
}

function ping(net: Network, host: Device, args: string[], os: TerminalOs) {
  const target = args[0];
  // Flags (-n, -c, /?) are out of scope for this phase.
  if (args.length !== 1 || target === undefined) return say(PING_USAGE);
  if (target.startsWith('-') || (os === 'windows' && target.startsWith('/'))) {
    return say(PING_USAGE);
  }
  return say(...pingLines(net, host, target, os));
}

/**
 * Run one typed command line on the device `hostId` of `net`.
 *
 * Rules, each pinned by a test: non-string and blank input give no lines; an
 * unknown device gives "No such device."; a switch has no command line;
 * input over 200 characters or with control characters gets a per-OS "bad
 * input" message; the command name is case-insensitive; words are split on
 * runs of whitespace; `clear`/`cls` return `{ lines: [], clear: true }`.
 * Commands from the other OS are "not found". Never throws, never mutates.
 */
export function runCommand(
  net: Network,
  hostId: string,
  input: string,
  os: TerminalOs,
): CommandResult {
  if (typeof (input as unknown) !== 'string') return say();
  const text = input.trim().replace(/\s+/g, ' ');
  if (text === '') return say();

  const host = net.devices.find((d) => d.id === hostId);
  if (host === undefined) return say(NO_SUCH_DEVICE);
  if (host.kind === 'switch') return say(NO_COMMAND_LINE);
  if (text.length > MAX_INPUT_LENGTH || hasControlCharacter(text)) {
    return say(BAD_INPUT[os]);
  }

  const [name = '', ...args] = text.split(' ');
  const command = name.toLowerCase();
  const windows = os === 'windows';

  if (command === 'help') return help(os);
  if (command === 'ping') return ping(net, host, args, os);
  if (command === (windows ? 'cls' : 'clear'))
    return { lines: [], clear: true };
  if (command === (windows ? 'ipconfig' : 'ifconfig')) {
    if (args.length > 0) {
      const own = windows ? 'ipconfig' : 'ifconfig';
      return say(
        `This practice terminal only supports plain "${own}", with no options.`,
      );
    }
    return windows ? ipconfig(host) : ifconfig(host);
  }
  return notFound(name, os);
}
