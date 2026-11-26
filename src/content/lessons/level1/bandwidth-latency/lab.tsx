import { PracticeLab } from '@/labs/PracticeLab';
import { generateTransferTime } from '@/labs/practice';
import styles from './lesson.module.css';

/** The lab id. It must equal the lesson's `labIds` in curriculum.ts. */
export const TRANSFER_LAB_ID = 'lab-l1-transfer';

/**
 * Lab "How long does the download take?": five problems that turn a file size
 * in megabytes and a speed in megabits per second into seconds. `onDone` is the
 * lesson page's callback; PracticeLab calls it once, when the learner finishes
 * the first session.
 */
export function TransferLab({ onDone }: { onDone: () => void }) {
  return (
    <>
      <p>
        Goal: work out how long five downloads take from the file size and the
        bandwidth. This is the most common calculation in the lesson, and it is
        also where most people slip on bits and bytes. It takes about ten
        minutes.
      </p>
      <ol className={styles.steps}>
        <li>
          Read the problem. The file is in <strong>megabytes</strong> (MB). The
          speed is in <strong>megabits</strong> per second (Mbps).
        </li>
        <li>
          Turn the file into megabits: multiply the megabytes by 8. A 50 MB file
          is 400 megabits.
        </li>
        <li>
          Divide by the speed. 400 megabits at 20 Mbps is 400 &divide; 20 = 20
          seconds.
        </li>
        <li>
          Type the number of seconds, then press <strong>Check</strong>. If you
          are wrong you can try again, and each answer comes with an
          explanation.
        </li>
      </ol>
      <p>
        These problems ignore the delay, as each prompt says, so the answer is
        the sending time only. When you finish, open the try-it above, choose a
        similar file and set the same bandwidth. Then watch how the latency
        slider adds a little on top of your answer, or a lot, for a small file.
      </p>
      <PracticeLab generate={generateTransferTime} count={5} onDone={onDone} />
    </>
  );
}
