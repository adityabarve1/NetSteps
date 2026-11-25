// The practice terminal's state: scrollback, command history and the input
// line. A plain reducer with no React in it, so it is unit-tested on its own.

import type { CommandResult } from '@/netcore/terminal';

/** Most lines the scrollback keeps; the oldest are dropped first. */
export const MAX_SCROLLBACK = 500;
/** Most commands ArrowUp can recall. */
export const MAX_HISTORY = 100;

export type TerminalEntry =
  | { id: number; kind: 'input'; prompt: string; text: string }
  | { id: number; kind: 'output'; text: string };

export type TerminalState = {
  entries: TerminalEntry[];
  /** Commands that were run, oldest first. */
  history: string[];
  /** What is in the input box right now. */
  input: string;
  /** Set while ArrowUp/ArrowDown is walking the history. */
  browse: { index: number; draft: string } | null;
  nextId: number;
};

export type TerminalAction =
  | { type: 'edit'; value: string }
  | { type: 'previous' }
  | { type: 'next' }
  | { type: 'run'; prompt: string; text: string; result: CommandResult };

export const initialTerminalState: TerminalState = {
  entries: [],
  history: [],
  input: '',
  browse: null,
  nextId: 0,
};

function run(
  state: TerminalState,
  prompt: string,
  text: string,
  result: CommandResult,
): TerminalState {
  const fresh: TerminalEntry[] = [
    { id: state.nextId, kind: 'input', prompt, text },
    ...result.lines.map((line, i): TerminalEntry => ({
      id: state.nextId + 1 + i,
      kind: 'output',
      text: line,
    })),
  ];
  const keep = text.trim() !== '' && state.history.at(-1) !== text;
  return {
    entries: result.clear
      ? []
      : [...state.entries, ...fresh].slice(-MAX_SCROLLBACK),
    history: keep
      ? [...state.history, text].slice(-MAX_HISTORY)
      : state.history,
    input: '',
    browse: null,
    nextId: state.nextId + fresh.length,
  };
}

function previous(state: TerminalState): TerminalState {
  if (state.history.length === 0) return state;
  const index =
    state.browse === null
      ? state.history.length - 1
      : Math.max(0, state.browse.index - 1);
  const draft = state.browse === null ? state.input : state.browse.draft;
  return {
    ...state,
    input: state.history[index] ?? state.input,
    browse: { index, draft },
  };
}

function next(state: TerminalState): TerminalState {
  const { browse } = state;
  if (browse === null) return state;
  const index = browse.index + 1;
  const recalled = state.history[index];
  if (recalled === undefined) {
    return { ...state, input: browse.draft, browse: null };
  }
  return { ...state, input: recalled, browse: { ...browse, index } };
}

export function terminalReducer(
  state: TerminalState,
  action: TerminalAction,
): TerminalState {
  switch (action.type) {
    case 'edit':
      return { ...state, input: action.value };
    case 'previous':
      return previous(state);
    case 'next':
      return next(state);
    case 'run':
      return run(state, action.prompt, action.text, action.result);
  }
}
