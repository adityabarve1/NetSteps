import { describe, expect, it } from 'vitest';
import {
  MAX_HISTORY,
  MAX_SCROLLBACK,
  initialTerminalState,
  terminalReducer,
} from '@/labs/terminalReducer';
import type { TerminalAction, TerminalState } from '@/labs/terminalReducer';

function play(actions: TerminalAction[]): TerminalState {
  return actions.reduce(terminalReducer, initialTerminalState);
}

const run = (text: string, lines: string[] = [], clear?: boolean) =>
  ({
    type: 'run',
    prompt: '$',
    text,
    result: clear === undefined ? { lines } : { lines, clear },
  }) satisfies TerminalAction;

const texts = (s: TerminalState) => s.entries.map((e) => e.text);

describe('terminalReducer history', () => {
  it('does nothing on ArrowUp or ArrowDown with no history', () => {
    const typed = play([{ type: 'edit', value: 'abc' }]);
    expect(terminalReducer(typed, { type: 'previous' })).toBe(typed);
    expect(terminalReducer(typed, { type: 'next' })).toBe(typed);
  });

  it('walks back newest first, stays at the oldest, then restores the draft', () => {
    let s = play([run('one'), run('two'), run('three')]);
    s = terminalReducer(s, { type: 'edit', value: 'draft' });
    const input = (state: TerminalState) => state.input;
    s = terminalReducer(s, { type: 'previous' });
    expect(input(s)).toBe('three');
    s = terminalReducer(s, { type: 'previous' });
    expect(input(s)).toBe('two');
    s = terminalReducer(s, { type: 'previous' });
    expect(input(s)).toBe('one');
    s = terminalReducer(s, { type: 'previous' });
    expect(input(s)).toBe('one');
    s = terminalReducer(s, { type: 'next' });
    expect(input(s)).toBe('two');
    s = terminalReducer(s, { type: 'next' });
    expect(input(s)).toBe('three');
    s = terminalReducer(s, { type: 'next' });
    expect(input(s)).toBe('draft');
    expect(terminalReducer(s, { type: 'next' })).toBe(s);
  });

  it('keeps the original draft when the recalled text is edited', () => {
    let s = play([run('one'), { type: 'edit', value: 'mine' }]);
    s = terminalReducer(s, { type: 'previous' });
    s = terminalReducer(s, { type: 'edit', value: 'one edited' });
    s = terminalReducer(s, { type: 'next' });
    expect(s.input).toBe('mine');
  });

  it('does not repeat a command typed twice in a row', () => {
    const s = play([run('a'), run('a'), run('b'), run('a')]);
    expect(s.history).toEqual(['a', 'b', 'a']);
  });

  it('does not store blank lines', () => {
    expect(play([run(''), run('   ')]).history).toEqual([]);
  });

  it('keeps only the newest 100 commands', () => {
    const s = play(
      Array.from({ length: MAX_HISTORY + 5 }, (_, i) => run(`c${String(i)}`)),
    );
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]).toBe('c5');
    expect(s.history.at(-1)).toBe(`c${String(MAX_HISTORY + 4)}`);
  });

  it('clears the input and leaves history browsing after a run', () => {
    let s = play([run('one'), { type: 'edit', value: 'x' }]);
    s = terminalReducer(s, { type: 'previous' });
    s = terminalReducer(s, run('one'));
    expect(s.input).toBe('');
    expect(s.browse).toBeNull();
  });
});

describe('terminalReducer scrollback', () => {
  it('echoes the prompt and typed text, then the output lines', () => {
    const s = play([run('ping x', ['out 1', 'out 2'])]);
    expect(s.entries.map((e) => [e.kind, e.text])).toEqual([
      ['input', 'ping x'],
      ['output', 'out 1'],
      ['output', 'out 2'],
    ]);
    expect(s.entries[0]).toMatchObject({ prompt: '$' });
  });

  it('echoes a blank line as just a prompt and stores no history', () => {
    const s = play([run('')]);
    expect(texts(s)).toEqual(['']);
  });

  it('empties the scrollback on clear, including the echo', () => {
    const s = play([run('a', ['x']), run('cls', [], true)]);
    expect(s.entries).toEqual([]);
    expect(s.history).toEqual(['a', 'cls']);
  });

  it('drops the oldest lines past the cap', () => {
    const s = play([
      run(
        'big',
        Array.from({ length: MAX_SCROLLBACK + 50 }, (_, i) => `l${String(i)}`),
      ),
    ]);
    expect(s.entries).toHaveLength(MAX_SCROLLBACK);
    expect(s.entries.at(-1)?.text).toBe(`l${String(MAX_SCROLLBACK + 49)}`);
  });

  it('gives every line a unique id, even after lines are dropped', () => {
    const s = play([run('a', ['1', '2']), run('b', ['3'])]);
    const ids = s.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
