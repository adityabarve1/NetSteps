import {
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  type SyntheticEvent,
  type KeyboardEvent,
} from 'react';
import { initialTerminalState, terminalReducer } from '@/labs/terminalReducer';
import type { Network } from '@/netcore/network';
import { runCommand, type TerminalOs } from '@/netcore/terminal';
import styles from './TerminalLab.module.css';

type TerminalLabProps = {
  net: Network;
  hostId: string;
  os: TerminalOs;
  /** Shown before each command. Defaults to `C:\>` (windows) or `$` (unix). */
  prompt?: string;
};

const DEFAULT_PROMPT: Record<TerminalOs, string> = {
  windows: 'C:\\>',
  unix: '$',
};

// Longest line the input box accepts. The interpreter refuses anything over
// 200 characters with a friendly message, so this leaves room to see that.
const MAX_TYPED = 300;
// How close to the bottom still counts as "following the output".
const BOTTOM_SLACK_PX = 8;

/**
 * A practice command line. It runs `runCommand` against the network it is
 * given (read fresh on every command) and never touches the real network.
 */
export function TerminalLab({ net, hostId, os, prompt }: TerminalLabProps) {
  const shownPrompt = prompt ?? DEFAULT_PROMPT[os];
  const [state, dispatch] = useReducer(terminalReducer, initialTerminalState);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  // True while the learner is at the bottom of the scrollback. When they have
  // scrolled up to read, new output must not drag them back down.
  const following = useRef(true);
  const inputId = useId();
  const noteId = useId();

  useLayoutEffect(() => {
    const log = logRef.current;
    if (log !== null && following.current) log.scrollTop = log.scrollHeight;
  }, [state.entries]);

  function onScroll() {
    const log = logRef.current;
    if (log === null) return;
    following.current =
      log.scrollHeight - log.scrollTop - log.clientHeight <= BOTTOM_SLACK_PX;
  }

  function onSubmit(event: SyntheticEvent) {
    event.preventDefault();
    const text = state.input;
    following.current = true;
    dispatch({
      type: 'run',
      prompt: shownPrompt,
      text,
      result: runCommand(net, hostId, text, os),
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // While an IME is composing, the arrows pick a candidate: leave them alone.
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      dispatch({ type: event.key === 'ArrowUp' ? 'previous' : 'next' });
    }
  }

  // Clicking the terminal focuses the input, unless the learner is selecting
  // text to copy it.
  function focusInput() {
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus();
  }

  return (
    <div className={styles.terminal}>
      <p id={noteId} className={styles.note}>
        This is a practice terminal. It only works inside this lesson and never
        touches your real network.
      </p>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a mouse shortcut only: the input is already reachable and focusable from the keyboard */}
      <div className={styles.screen} onClick={focusInput}>
        <div
          ref={logRef}
          className={styles.scrollback}
          role="log"
          aria-label="Terminal output"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrolling region must be focusable so keyboard users can scroll it
          tabIndex={0}
          onScroll={onScroll}
        >
          {state.entries.map((entry) => (
            <div key={entry.id} className={styles.line}>
              {entry.kind === 'input' ? (
                <>
                  <span className={styles.promptText}>{entry.prompt}</span>
                  {entry.text === '' ? '' : ` ${entry.text}`}
                </>
              ) : (
                entry.text
              )}
            </div>
          ))}
        </div>
        <form className={styles.inputRow} onSubmit={onSubmit}>
          <label htmlFor={inputId} className={styles.visuallyHidden}>
            Command line
          </label>
          <span className={styles.promptText} aria-hidden="true">
            {shownPrompt}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            className={styles.input}
            type="text"
            value={state.input}
            maxLength={MAX_TYPED}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-describedby={noteId}
            onChange={(event) => {
              dispatch({ type: 'edit', value: event.target.value });
            }}
            onKeyDown={onKeyDown}
          />
        </form>
      </div>
    </div>
  );
}
