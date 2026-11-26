import { BuilderLab } from '@/labs/BuilderLab';
import { firstNetworkTasks } from './labChecks';
import styles from './lesson.module.css';

/** The lab id. It must equal the lesson's `labIds` in curriculum.ts. */
export const FIRST_NETWORK_LAB_ID = 'lab-l1-first-network';

/**
 * Lab "Build your first network": two computers and a switch, two addresses in
 * one subnet, and a ping from PC1 to PC2. `onDone` is the lesson page's
 * callback; the builder calls it once, the first time every goal is ticked.
 */
export function FirstNetworkLab({ onDone }: { onDone: () => void }) {
  return (
    <>
      <p>
        Build the network from the simulation yourself: two computers joined
        through a switch. Then give each computer an address and check that they
        can reach each other. It takes about five minutes.
      </p>
      <ol className={styles.steps}>
        <li>
          Press <strong>Add a computer</strong> twice and{' '}
          <strong>Add a switch</strong> once. You now have PC1, PC2 and Switch1.
        </li>
        <li>
          Run the cables. Select PC1, press{' '}
          <strong>Connect PC1 to another device</strong>, then select Switch1.
          Do the same for PC2.
        </li>
        <li>
          Give the computers addresses. Select PC1 and type the IP address{' '}
          <code className={styles.command}>192.168.1.10</code> and the subnet
          mask <code className={styles.command}>255.255.255.0</code>. Select PC2
          and type <code className={styles.command}>192.168.1.20</code> with the
          same mask. Leave the gateway empty: you only need one for a router,
          and there is none here.
        </li>
        <li>
          Test it. Select PC1, press <strong>Open terminal</strong> and type{' '}
          <code className={styles.command}>ping 192.168.1.20</code>, then press
          Enter.
        </li>
      </ol>
      <p>
        Success means all three goals show <strong>Done</strong> and PC1 gets
        four replies from PC2. You have built a real (simulated) network: two
        hosts, one network device, two links and two addresses in one subnet.
      </p>
      <p>
        Finished? Break it on purpose and ping again: remove one cable, change
        PC2 to <code className={styles.command}>192.168.2.20</code>, or give
        both computers the same address. Each time, ask yourself which part of
        the network is now missing.
      </p>
      <BuilderLab
        tasks={firstNetworkTasks}
        palette={['pc', 'switch']}
        onAllDone={onDone}
      />
    </>
  );
}
