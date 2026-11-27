import { PracticeLab } from '@/labs/PracticeLab';
import { generatePacketProblem } from '@/labs/practice';
import styles from './lesson.module.css';

/** The lab id. It must equal the lesson's `labIds` in curriculum.ts. */
export const PACKETS_LAB_ID = 'lab-l1-packets';

/**
 * Lab "Count the packets": five problems, each asking how many packets a
 * message needs. `onDone` is the lesson page's callback; PracticeLab calls it
 * once, when the learner finishes the first session.
 */
export function PacketsLab({ onDone }: { onDone: () => void }) {
  return (
    <>
      <p>
        Goal: work out how many packets a message needs, the way a device does
        before it sends. You get five problems and it takes about five minutes.
      </p>
      <ol className={styles.steps}>
        <li>
          Read the message size in kilobytes (KB). In this course 1 KB is 1000
          bytes, so multiply the KB by 1000 to get bytes.
        </li>
        <li>
          Divide the bytes by the most that one packet can carry. If the answer
          has a fraction, round <strong>up</strong>: the leftover bytes still
          need a packet of their own.
        </li>
        <li>
          Type the number of packets and press <strong>Check</strong>.
        </li>
        <li>
          After a wrong answer, the explanation shows the steps and the right
          number. Read it, then type the right number to go on. After a right
          answer, press <strong>Next problem</strong>; on the last problem the
          button says <strong>Finish</strong>. At the end you see how many you
          got right on the first try.
        </li>
      </ol>
      <p>
        Try this on paper before you press <strong>Check</strong>. Watch for
        problems that divide exactly: they have no short last packet. When you
        finish, press <strong>Practice again</strong> for a new set.
      </p>
      <PracticeLab generate={generatePacketProblem} count={5} onDone={onDone} />
    </>
  );
}
