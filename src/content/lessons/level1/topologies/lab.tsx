import { BuilderLab } from '@/labs/BuilderLab';
import { starTasks } from './labChecks';
import styles from './lesson.module.css';

/** The lab id. It must equal the lesson's `labIds` in curriculum.ts. */
export const STAR_LAB_ID = 'lab-l1-star';

/**
 * Lab "Build a star": four computers around one switch, four addresses in one
 * subnet, and every computer pinging every other. `onDone` is the lesson page's
 * callback; the builder calls it once, the first time every goal is ticked.
 */
export function StarLab({ onDone }: { onDone: () => void }) {
  return (
    <>
      <p>
        Build the star from this lesson: four computers, each with its own cable
        to one switch in the middle. Then check that every computer can reach
        every other one. It takes about ten minutes.
      </p>
      <ol className={styles.steps}>
        <li>
          Press <strong>Add a computer</strong> four times and{' '}
          <strong>Add a switch</strong> once. You now have PC1, PC2, PC3, PC4
          and Switch1.
        </li>
        <li>
          Run the cables. Select PC1, press{' '}
          <strong>Connect PC1 to another device</strong>, then select Switch1.
          Do the same for PC2, PC3 and PC4. Each computer gets exactly one
          cable, and every cable ends at Switch1.
        </li>
        <li>
          Give the computers addresses. Select PC1 and type the IP address{' '}
          <code className={styles.command}>192.168.1.10</code> and the subnet
          mask <code className={styles.command}>255.255.255.0</code>. Use{' '}
          <code className={styles.command}>192.168.1.11</code> for PC2,{' '}
          <code className={styles.command}>192.168.1.12</code> for PC3 and{' '}
          <code className={styles.command}>192.168.1.13</code> for PC4, with the
          same mask. Leave <strong>Gateway (optional)</strong> empty. A gateway
          is the address of the router that leads out of your network to other
          networks, and this lab has no router.
        </li>
        <li>
          Test it. Select PC1, press <strong>Open terminal</strong> and type{' '}
          <code className={styles.command}>ping 192.168.1.12</code>, then press
          Enter. Try PC2 and PC4 too.
        </li>
      </ol>
      <p>
        The two goals tick by themselves as soon as the star is right. A
        computer must have a cable to Switch1 and to nothing else, so a cable
        straight from one computer to another does not count. Give every
        computer its own address: two computers with the same address cannot
        both be reached.
      </p>
      <p>
        <strong>Now break the star on purpose.</strong> Select PC3 and press{' '}
        <strong>Remove cable to Switch1</strong>. Go back to PC1 and ping{' '}
        <code className={styles.command}>192.168.1.12</code> again: PC3 no
        longer answers. Ping{' '}
        <code className={styles.command}>192.168.1.11</code> (PC2) and{' '}
        <code className={styles.command}>192.168.1.13</code> (PC4): they still
        answer, because their cables and the switch are untouched. Only PC3 lost
        its connection. The goals un-tick, because the star is no longer
        complete. Connect PC3 to Switch1 again to repair it. For a bigger test,
        select Switch1, press <strong>Remove device</strong> and ping again:
        with the centre gone, nobody can reach anybody.
      </p>
      <BuilderLab
        tasks={starTasks}
        palette={['pc', 'switch']}
        onAllDone={onDone}
      />
    </>
  );
}
