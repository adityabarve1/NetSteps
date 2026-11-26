import { PracticeLab } from '@/labs/PracticeLab';
import styles from './lesson.module.css';
import { generateScopeProblem } from './logic';

/** The lab id. It must equal the lesson's `labIds` in curriculum.ts. */
export const CLASSIFY_LAB_ID = 'lab-l1-classify';

/**
 * Lab "Sort networks by reach": six everyday scenarios, one question each.
 * `onDone` is the lesson page's callback; PracticeLab calls it once, when the
 * learner finishes the first session.
 */
export function ClassifyLab({ onDone }: { onDone: () => void }) {
  return (
    <>
      <p>
        Goal: decide which kind of network each everyday scenario is, by the
        distance rules of thumb. You get six scenarios and it takes about five
        minutes.
      </p>
      <ol className={styles.steps}>
        <li>
          Read the scenario. Look for how far apart the devices are and who runs
          the links.
        </li>
        <li>
          Pick the number of the type. <strong>0</strong> is a PAN: up to about
          10 metres, around one person. <strong>1</strong> is a LAN: up to about
          2 kilometres, one place. <strong>2</strong> is a MAN: up to about 100
          kilometres, a city. <strong>3</strong> is a WAN: farther than that,
          between cities and countries.
        </li>
        <li>
          Type the number of your choice, 0, 1, 2 or 3, and press{' '}
          <strong>Check</strong>.
        </li>
        <li>
          After a wrong answer, the explanation shows the right number. Type it
          to go on. After a right answer, press <strong>Next problem</strong>.
          At the end you see how many you got right on the first try, so think
          before you press <strong>Check</strong>.
        </li>
      </ol>
      <p>
        When you finish you can press <strong>Practice again</strong> for a new
        set. Try to answer before you look at the list of distances: that is how
        you learn the sizes.
      </p>
      <PracticeLab generate={generateScopeProblem} count={6} onDone={onDone} />
    </>
  );
}
