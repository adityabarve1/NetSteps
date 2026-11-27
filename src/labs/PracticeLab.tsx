import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import { cx } from '@/lib/cx';
import {
  buildProblems,
  checkAnswer,
  createRng,
  normaliseCount,
  parseAnswer,
  sessionSeed,
  type Problem,
  type Rng,
} from '@/labs/practice';
import styles from '@/labs/PracticeLab.module.css';

export type PracticeLabProps = {
  /** Makes one problem from the seeded random number generator. */
  generate: (rng: Rng) => Problem;
  /** How many problems in a session: 1 to 20, default 5. */
  count?: number;
  /**
   * Called once, the first time the learner finishes a session. It is not
   * called again for "Practice again", matching the rule that a lab reports
   * completion once per visit.
   */
  onDone?: () => void;
  /** Fixes the first session's problems (for tests). Default: chosen once per mount. */
  seed?: number;
};

type Feedback = {
  kind: 'correct' | 'wrong' | 'invalid';
  message: string;
  explanation?: string;
};

type SessionProps = {
  problems: Problem[];
  onFinished: () => void;
  onRestart: () => void;
};

function plural(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

// One run through the problems. The parent gives it a new key for a new run,
// so every piece of state here starts fresh.
function Session({ problems, onFinished, onRestart }: SessionProps) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [missed, setMissed] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [finished, setFinished] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const inputId = useId();
  const hintId = useId();

  const solved = feedback?.kind === 'correct';
  useEffect(() => {
    if (solved) nextRef.current?.focus();
  }, [solved]);
  useEffect(() => {
    if (finished) againRef.current?.focus();
  }, [finished]);

  const problem = problems[index];
  if (problem === undefined) return null;
  const isLast = index === problems.length - 1;

  function handleCheck(event: SyntheticEvent) {
    event.preventDefault();
    if (solved || problem === undefined) return;
    const result = checkAnswer(problem, input);
    if (result.correct) {
      setFeedback({
        kind: 'correct',
        message: result.message,
        explanation: problem.explanation,
      });
      if (!missed) setFirstTry((n) => n + 1);
      return;
    }
    if (parseAnswer(input) === null) {
      setFeedback({ kind: 'invalid', message: result.message });
    } else {
      setMissed(true);
      setFeedback({
        kind: 'wrong',
        message: result.message,
        explanation: problem.explanation,
      });
    }
    inputRef.current?.focus();
  }

  function handleNext() {
    if (isLast) {
      setFinished(true);
      onFinished();
      return;
    }
    setIndex(index + 1);
    setInput('');
    setFeedback(null);
    setMissed(false);
    inputRef.current?.focus();
  }

  return (
    <div className={styles.card} role="group" aria-label="Practice problems">
      {!finished && (
        <form className={styles.form} onSubmit={handleCheck} noValidate>
          <p className={styles.progress}>
            {`Problem ${String(index + 1)} of ${String(problems.length)}`}
          </p>
          <p className={styles.prompt}>{problem.prompt}</p>
          <label className={styles.label} htmlFor={inputId}>
            Your answer
          </label>
          <p className={styles.hint} id={hintId}>
            Type just a number, with no units.
          </p>
          <div className={styles.row}>
            <input
              ref={inputRef}
              id={inputId}
              className={styles.input}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={hintId}
              value={input}
              readOnly={solved}
              onChange={(e) => {
                setInput(e.target.value);
              }}
            />
            {!solved && (
              <button type="submit" className={styles.button}>
                Check
              </button>
            )}
          </div>
        </form>
      )}
      <div
        role="status"
        aria-live="polite"
        className={cx(
          styles.status,
          feedback !== null && styles[feedback.kind],
          finished && styles.wrapUp,
        )}
      >
        {finished ? (
          <p className={styles.message}>
            {`You finished ${plural(problems.length, 'problem', 'problems')}. ${String(firstTry)} ${firstTry === 1 ? 'was' : 'were'} right on the first try.`}
          </p>
        ) : (
          feedback !== null && (
            <>
              <p className={styles.message}>{feedback.message}</p>
              {feedback.explanation !== undefined && (
                <p className={styles.explanation}>{feedback.explanation}</p>
              )}
            </>
          )
        )}
      </div>
      {/* Below the feedback, not where Check was, so a double-click on Check
          can never land on this button. */}
      {solved && !finished && (
        <button
          ref={nextRef}
          type="button"
          className={styles.button}
          onClick={handleNext}
        >
          {isLast ? 'Finish' : 'Next problem'}
        </button>
      )}
      {finished && (
        <button
          ref={againRef}
          type="button"
          className={styles.button}
          onClick={onRestart}
        >
          Practice again
        </button>
      )}
    </div>
  );
}

export function PracticeLab({
  generate,
  count,
  onDone,
  seed,
}: PracticeLabProps) {
  const size = normaliseCount(count);
  // The default seed is picked once, when the component mounts.
  const [mountSeed] = useState(() => Math.floor(Math.random() * 2 ** 32));
  const base = seed ?? mountSeed;

  // A new `generate`, `count` or `seed` starts a new run. This is the React
  // way to reset state when a prop changes: set it while rendering.
  const [config, setConfig] = useState({ generate, size, base, run: 0 });
  let current = config;
  if (
    config.generate !== generate ||
    config.size !== size ||
    config.base !== base
  ) {
    current = { generate, size, base, run: config.run + 1 };
    setConfig(current);
  }

  const problems = useMemo(
    () =>
      buildProblems(
        current.generate,
        createRng(sessionSeed(current.base, current.run)),
        current.size,
      ),
    [current.generate, current.base, current.run, current.size],
  );

  // onDone fires once per mount. The ref guard survives StrictMode and
  // re-renders; the other ref always holds the newest onDone.
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  const handleFinished = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDoneRef.current?.();
  }, []);

  const startNewRun = useCallback(() => {
    setConfig((c) => ({ ...c, run: c.run + 1 }));
  }, []);

  if (problems === null) {
    return (
      <div className={styles.card} role="group" aria-label="Practice problems">
        <p className={styles.errorText}>
          Sorry, we could not make a problem. Please try again.
        </p>
        <button type="button" className={styles.button} onClick={startNewRun}>
          Try again
        </button>
      </div>
    );
  }
  return (
    <Session
      key={current.run}
      problems={problems}
      onFinished={handleFinished}
      onRestart={startNewRun}
    />
  );
}
