import { Term } from '@/content/components/Term';
import { ClientServerDiagram } from './diagrams';
import styles from './lesson.module.css';

/** Section 1: the client-server idea. */
export function ClientServerIdea() {
  return (
    <>
      <p>
        Almost every service you use online is organised in one of two main
        ways. In the first, one computer waits to be asked and the others do the
        asking. In the second, every computer helps every other. This lesson
        starts with the first way, because it is the most common.
      </p>

      <h3>Two roles: the one who asks and the one who serves</h3>
      <p>
        A <Term id="client">client</Term> is a program that asks for something:
        a web page, a message, a video. A <Term id="server">server</Term> is a
        program that waits for those questions and answers them. People also
        call the computer that runs the server program &ldquo;the server&rdquo;.
        The arrangement is called <Term id="client-server">client-server</Term>.
      </p>
      <p>
        Your web browser is a client. When you type a web address, the browser
        asks a server for the page. Nobody typed anything on the server&rsquo;s
        side. It sat there, switched on, ready to answer.
      </p>

      <h3>Request and response</h3>
      <p>
        The conversation always has the same two parts. The client sends a{' '}
        <Term id="request">request</Term>. The server sends back a{' '}
        <Term id="response">response</Term>. Here is one example, step by step:
      </p>
      <ol className={styles.steps}>
        <li>
          You type <code className={styles.command}>example.com</code> into your
          browser. The browser is the client.
        </li>
        <li>
          It sends a request, &ldquo;please give me your home page&rdquo;, to
          the server that has that site&rsquo;s address (a made-up one here:
          203.0.113.10).
        </li>
        <li>The server program receives the request and finds the page.</li>
        <li>It sends the page back as the response. Your browser shows it.</li>
      </ol>
      <ClientServerDiagram />
      <p>Notice three things about this arrangement:</p>
      <ul>
        <li>
          In this basic model, the client starts every conversation and the
          server only answers. (Some services, such as chat, also let a server
          send you something unasked.)
        </li>
        <li>
          The server stays on and usually keeps the same address, so clients
          always know where to ask. Clients come and go.
        </li>
        <li>
          Many clients can ask the same server at once. That is the point, and
          also the problem the next sections explore.
        </li>
      </ul>
      <p className={styles.note}>
        Client and server are roles in a conversation, not kinds of machine. The
        same laptop can be a client in one conversation and a server in another.
        The first Go deeper block below explains this.
      </p>
    </>
  );
}

/** Go deeper: roles, not hardware. */
export function RolesDeeper() {
  return (
    <>
      <p>
        &ldquo;Server&rdquo; names what a program does, not what the machine
        looks like. A server program can run on a powerful computer in a
        building full of computers, and it can also run on the laptop you are
        using now. The program decides the role.
      </p>
      <p>
        Machines built to run server programs all day are tuned for that: they
        often have backup power supplies, spare parts that can be swapped while
        the machine runs, and fast network connections. But a plain computer
        that runs a server program is still a server while the program runs.
      </p>
      <p>
        One conversation has one client and one server. A single computer can be
        a client for some conversations and a server for others at the same
        time.
      </p>
    </>
  );
}

/** Go deeper: many servers on one computer. */
export function OneComputerManyServersDeeper() {
  return (
    <>
      <p>
        One server computer often runs several server programs at once, for
        example a web server and a mail server. When a request arrives, the
        computer needs to know which program it is for.
      </p>
      <p>
        It uses a number called a port, written after the address. Web servers
        usually wait on port 80 (plain web) or 443 (the secure version, which
        scrambles the data so that others cannot read it). Level 5 explains
        ports in full. For now, remember that one address can lead to several
        servers.
      </p>
    </>
  );
}
