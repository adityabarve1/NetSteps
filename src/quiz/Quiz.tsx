import { useEffect, useId, useRef, useState, type SubmitEvent } from 'react';
import type { QuizQuestion } from '@/content/types';
import { cx } from '@/lib/cx';
import { QuizQuestionCard } from '@/quiz/QuizQuestionCard';
import { isValidResult, scoreQuiz, type QuizResult } from '@/quiz/scoreQuiz';
import styles from '@/quiz/Quiz.module.css';

type Props = {
  questions: QuizQuestion[];
  onSubmit: (score: number, total: number) => void;
  // The learner's best earlier result. Ignored unless it is a believable score.
  previousBest?: QuizResult;
};

// Plain and encouraging. Completion counts any score, so no score is a failure.
function resultMessage({ score, total }: QuizResult): string {
  if (score === total) return 'Every answer was right. Well done.';
  if (score * 2 >= total) {
    return 'A good result. Read the explanations below for the ones you missed.';
  }
  return 'Read the explanations below, then try again whenever you like.';
}

// The learner's answers live in QuizBody. Giving it a key made from the
// question ids means a different lesson's questions start with a clean slate,
// with no state to reset by hand. The same ids keep the answers, so a parent
// that rebuilds the array on every render does not wipe what was picked.
export function Quiz({ questions, onSubmit, previousBest }: Props) {
  if (questions.length === 0) {
    return (
      <p className={styles.empty}>
        No quiz questions yet
        <span className={styles.emptyHint}>
          Check back soon. This lesson&apos;s quiz is still being written.
        </span>
      </p>
    );
  }
  return (
    <QuizBody
      key={JSON.stringify(questions.map((q) => q.id))}
      questions={questions}
      onSubmit={onSubmit}
      previousBest={previousBest}
    />
  );
}

function QuizBody({ questions, onSubmit, previousBest }: Props) {
  const groupId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Set the moment a submit is accepted, before React re-renders, so a fast
  // second submit cannot count the attempt twice.
  const submittedRef = useRef(false);
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );
  const [result, setResult] = useState<QuizResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  // A question with no options cannot be answered, so it is not required.
  const required = questions.map((q) => q.options.length > 0);
  const requiredCount = required.filter(Boolean).length;
  const answeredCount = required.filter(
    (needed, i) => needed && (answers[i] ?? null) !== null,
  ).length;
  const allAnswered = answeredCount === requiredCount;
  const best = isValidResult(previousBest) ? previousBest : null;

  // Move focus after the screen has changed. Doing it in an effect means the
  // inputs are already enabled again when we focus one.
  useEffect(() => {
    if (result) headingRef.current?.focus();
  }, [result]);
  useEffect(() => {
    if (attempt > 0) {
      formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    }
  }, [attempt]);

  function choose(questionIndex: number, choice: number) {
    if (submittedRef.current) return;
    setAnswers((current) =>
      questions.map((_, i) =>
        i === questionIndex ? choice : (current[i] ?? null),
      ),
    );
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittedRef.current || !allAnswered) return;
    submittedRef.current = true;
    const scored = scoreQuiz(questions, answers);
    setResult(scored);
    onSubmit(scored.score, scored.total);
  }

  function tryAgain() {
    submittedRef.current = false;
    setAnswers(questions.map(() => null));
    setResult(null);
    setAttempt((n) => n + 1);
  }

  return (
    <form
      ref={formRef}
      className={styles.quiz}
      onSubmit={handleSubmit}
      noValidate
    >
      {result && (
        <div className={styles.result} role="status">
          <h3 ref={headingRef} tabIndex={-1} className={styles.resultHeading}>
            You got {result.score} of {result.total}
          </h3>
          <p className={styles.resultMessage}>{resultMessage(result)}</p>
          <button type="button" className={styles.button} onClick={tryAgain}>
            Try again
          </button>
        </div>
      )}
      {best && (
        <p className={styles.best}>
          Your best so far: {best.score} of {best.total}
        </p>
      )}
      {questions.map((question, i) => (
        <QuizQuestionCard
          key={i}
          question={question}
          index={i}
          total={questions.length}
          name={`${groupId}-q${String(i)}`}
          selected={answers[i] ?? null}
          locked={result !== null}
          onSelect={(choice) => {
            choose(i, choice);
          }}
        />
      ))}
      {!result && (
        <div className={styles.actions}>
          <button
            type="submit"
            className={cx(styles.button, styles.primary)}
            disabled={!allAnswered}
            aria-describedby={allAnswered ? undefined : `${groupId}-help`}
          >
            Submit answers
          </button>
          <div className={styles.progress}>
            <p role="status" className={styles.count}>
              {answeredCount} of {requiredCount} answered
            </p>
            {!allAnswered && (
              <p id={`${groupId}-help`} className={styles.help}>
                Answer every question to see your score.
              </p>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
