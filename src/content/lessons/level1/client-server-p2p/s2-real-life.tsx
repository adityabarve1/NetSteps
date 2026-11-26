import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

type Row = { service: string; client: string; server: string; request: string };

const ROWS: Row[] = [
  {
    service: 'The web',
    client: 'Your web browser',
    server: 'A web server',
    request: '“Send me the page at example.com.”',
  },
  {
    service: 'Email',
    client: 'Your mail app',
    server: 'Your provider’s mail server',
    request: '“Do I have new mail?” or “Send this message.”',
  },
  {
    service: 'Video streaming',
    client: 'The video player',
    server: 'The service’s video servers',
    request: '“Send the next few seconds of this film.”',
  },
  {
    service: 'Online games',
    client: 'The game on your device',
    server: 'A game server that keeps the shared world',
    request: '“I moved here. What does everyone else see?”',
  },
  {
    service: 'Cloud storage',
    client: 'The storage app on your phone',
    server: 'The storage company’s servers',
    request: '“Save this photo.” or “Give me that file.”',
  },
];

/** Section 2: servers and clients in real life. */
export function RealLife() {
  return (
    <>
      <p>
        Once you know the two roles, you can see them in almost everything you
        do online. The table shows five everyday services and who plays which
        role.
      </p>

      <h3>Five services, the same two roles</h3>
      <div data-prose="">
        <table className={styles.table}>
          <caption>Clients and servers in everyday services</caption>
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">The client</th>
              <th scope="col">The server</th>
              <th scope="col">A typical request</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.service}>
                <th scope="row">{r.service}</th>
                <td data-label="The client">{r.client}</td>
                <td data-label="The server">{r.server}</td>
                <td data-label="A typical request">{r.request}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Where the server really is</h3>
      <p>
        The server for a big service does not sit in a cupboard. It runs in a{' '}
        <Term id="data-centre">data centre</Term>: a large building full of
        computers with backup power, cooling and very fast links to the
        internet. Each of those machines is a computer built to run all day.
        What makes one a server is the program it runs.
      </p>
      <p>
        Smaller services use smaller setups. A school might run its file server
        on one computer in a cupboard. A hobbyist might rent a small slice of
        someone else&rsquo;s server. The idea is the same at every size.
      </p>

      <h3>A video call: it depends on the app</h3>
      <p>
        Not everything is a plain client and server. Video calls are a good
        example. Many apps send the call through servers that pass the video
        between the people. Others try to send it directly between the devices
        when they can, and use servers only to set the call up. Which one
        happens often depends on the app and on the networks in between. The
        next sections explain why designers choose one or the other.
      </p>
    </>
  );
}

/** Go deeper: a server can be a client too. */
export function ServerIsAlsoClientDeeper() {
  return (
    <>
      <p>
        A single click can start a chain of requests. You ask a shop&rsquo;s web
        server for a page. To build it, that server may ask a database server
        for the prices, and ask a payment server to check your card. For those
        questions, the web server is the client.
      </p>
      <p>
        Email works the same way. Your mail app is a client of your
        provider&rsquo;s mail server. To deliver your message to someone at
        another provider, your provider&rsquo;s server becomes a client of that
        other provider&rsquo;s server.
      </p>
      <p>
        So the roles belong to a single request, not to a machine for life.
        Remember the restaurant: a kitchen is the &ldquo;server&rdquo; for the
        diners, but it is also a customer of the farm that sells it vegetables.
      </p>
    </>
  );
}

/** Go deeper: what makes a service quick for clients. */
export function WhatServersNeedDeeper() {
  return (
    <>
      <p>
        A server that answers many clients needs a few things that a personal
        computer does not need so much:
      </p>
      <ul>
        <li>
          <strong>Upload speed.</strong> To <Term id="upload">upload</Term> is
          to send data out of a computer. A server mostly uploads: pages, photos
          and videos leave it, so its upload speed matters most. The next
          section shows the numbers.
        </li>
        <li>
          <strong>Being always on.</strong> A server that goes down takes the
          service with it, which is why servers have backup power and spare
          parts.
        </li>
        <li>
          <strong>Memory and storage.</strong> To answer many requests at once
          it keeps popular pages ready in fast memory instead of looking them up
          again each time.
        </li>
      </ul>
    </>
  );
}
