import { BuilderLab } from '@/labs/BuilderLab';
import { serverLabTasks } from './labChecks';
import styles from './lesson.module.css';

/** The lab id. It must equal the lesson's `labIds` in curriculum.ts. */
export const SERVER_LAB_ID = 'lab-l1-server';

const code = (text: string) => <code className={styles.command}>{text}</code>;

/**
 * Lab "A server and three computers": one switch, three computers (the
 * clients) and one server, with addresses, a ping from every client, and a
 * guided "unplug the server" experiment. `onDone` is the lesson page's
 * callback; the builder calls it once, the first time every goal is ticked.
 */
export function ServerLab({ onDone }: { onDone: () => void }) {
  return (
    <>
      <p>
        Build the small client-server network from this lesson: three computers
        that act as clients, one server, and a switch that joins them. Then
        check that every client can reach the server, and see what happens when
        the server goes missing. It takes about ten minutes.
      </p>
      <ol className={styles.steps}>
        <li>
          Press <strong>Add a computer</strong> three times,{' '}
          <strong>Add a server</strong> once and <strong>Add a switch</strong>{' '}
          once. You now have PC1, PC2, PC3, Server1 and Switch1.
        </li>
        <li>
          Run four cables. Select PC1, press{' '}
          <strong>Connect PC1 to another device</strong>, then select Switch1.
          Do the same for PC2, PC3 and Server1. Every cable goes to the switch.
        </li>
        <li>
          Give each device an address. Select a device, then type in the{' '}
          <strong>IP address</strong> and <strong>Subnet mask</strong> boxes.
          Use {code('192.168.1.10')}, {code('192.168.1.11')} and{' '}
          {code('192.168.1.12')} for PC1, PC2 and PC3, and{' '}
          {code('192.168.1.100')} for Server1. Every device gets the mask{' '}
          {code('255.255.255.0')}. Leave the <strong>Gateway (optional)</strong>{' '}
          box empty. A gateway is the address of a router that leads out of the
          network, and there is no router here.
        </li>
        <li>
          Test it. Select PC1, press <strong>Open terminal</strong> and type{' '}
          {code('ping 192.168.1.100')}, then press Enter. Do the same from PC2
          and PC3. A ping checks that the server answers each computer, so a
          reply means the cable path works.
        </li>
      </ol>
      <p>
        The two goals tick by themselves when the network is right. Each cable
        must go to the switch: a cable straight from a computer to the server
        would work for that one computer, but it would leave the others out, so
        it does not count.
      </p>
      <p className={styles.note}>
        <strong>Unplug the server (a guided experiment).</strong> This is not a
        goal; it shows the single point of failure. Select Server1 and press{' '}
        <strong>Remove cable to Switch1</strong>. Now select PC1, open the
        terminal and ping {code('192.168.1.100')} again. No reply comes back.
        Try PC2 and PC3: they fail too. The computers and the switch are fine,
        but the one server is gone, so every client loses the service together.
        Connect Server1 to Switch1 again and the pings work once more.
      </p>
      <p>
        Finished? Break it in other ways and ping again: give PC3 the address{' '}
        {code('192.168.2.12')}, or give PC1 the same address as the server. Each
        time, ask which part is missing.
      </p>
      <BuilderLab
        tasks={serverLabTasks}
        palette={['pc', 'server', 'switch']}
        onAllDone={onDone}
      />
    </>
  );
}
