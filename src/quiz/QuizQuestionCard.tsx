import type { QuizQuestion } from '@/content/types';
import { cx } from '@/lib/cx';
import styles from '@/quiz/Quiz.module.css';

type Props = {
  question: QuizQuestion;
  index: number;
  total: number;
  // Radio group name, unique per quiz and question.
  name: string;
  selected: number | null;
  // True once the quiz is submitted: inputs are locked and the verdict shows.
  locked: boolean;
  onSelect: (choice: number) => void;
};

// Shapes, not only colour, tell the two verdicts apart. Both are decoration:
// the words "Correct" and "Not quite" carry the meaning.
function VerdictIcon({ correct }: { correct: boolean }) {
  return (
    <svg
      className={styles.verdictIcon}
      viewBox="0 0 20 20"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="10"
        cy="10"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      {correct ? (
        <path
          d="M5.5 10.5l3 3 6-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M6.5 6.5l7 7M13.5 6.5l-7 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export function QuizQuestionCard({
  question,
  index,
  total,
  name,
  selected,
  locked,
  onSelect,
}: Props) {
  const isCorrect =
    selected !== null &&
    selected === question.correctIndex &&
    question.options[selected] !== undefined;
  const rightAnswer = question.options[question.correctIndex];
  const verdictId = `${name}-verdict`;

  return (
    <fieldset
      className={styles.card}
      aria-describedby={locked ? verdictId : undefined}
    >
      <legend className={styles.legend}>
        <span className={styles.number}>
          Question {index + 1} of {total}
        </span>
        <span className={styles.prompt}>{question.prompt}</span>
      </legend>
      <div className={styles.options}>
        {question.options.map((option, optionIndex) => (
          <label
            key={optionIndex}
            className={cx(styles.option, locked && styles.optionLocked)}
          >
            <input
              className={styles.radio}
              type="radio"
              name={name}
              checked={selected === optionIndex}
              disabled={locked}
              onChange={() => {
                onSelect(optionIndex);
              }}
            />
            <span className={styles.label}>{option}</span>
            {locked && selected === optionIndex && (
              <span className={styles.tag} aria-hidden="true">
                Your answer
              </span>
            )}
          </label>
        ))}
      </div>
      {locked && (
        <div
          id={verdictId}
          className={cx(
            styles.verdict,
            isCorrect ? styles.right : styles.wrong,
          )}
        >
          <p className={styles.verdictLabel}>
            <VerdictIcon correct={isCorrect} />
            <span>{isCorrect ? 'Correct' : 'Not quite'}</span>
          </p>
          {!isCorrect && rightAnswer !== undefined && (
            <p className={styles.rightAnswer}>
              The correct answer is: <strong>{rightAnswer}</strong>
            </p>
          )}
          <p className={styles.explanation}>{question.explanation}</p>
        </div>
      )}
    </fieldset>
  );
}
