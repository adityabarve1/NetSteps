import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

type Kind = { what: string; example: string };

const KINDS: Kind[] = [
  {
    what: 'Information (files and data)',
    example:
      'Your phone copies its photos to a laptop, or to an online storage service.',
  },
  {
    what: 'Hardware',
    example:
      'Everyone at home prints on one printer instead of buying one each.',
  },
  {
    what: 'One internet connection',
    example:
      'Every phone, laptop and TV in a home uses the same connection to the internet.',
  },
  {
    what: 'Communication',
    example:
      'Messages, email, video calls and online games all travel between devices.',
  },
  {
    what: 'Services',
    example:
      'A streaming service sends you a film from its own computers, far away.',
  },
];

/** Section 3: the five kinds of sharing, with a worked example. */
export function WhatIsShared() {
  return (
    <>
      <p>
        Why connect devices at all? Because connected devices can share. Almost
        every reason for building a network fits one of five kinds of sharing.
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>Five things a network lets devices share</caption>
          <thead>
            <tr>
              <th scope="col">What is shared</th>
              <th scope="col">Everyday example</th>
            </tr>
          </thead>
          <tbody>
            {KINDS.map((k) => (
              <tr key={k.what}>
                <th scope="row">{k.what}</th>
                <td data-label="For example">{k.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        The programs that provide a service, such as films, web pages or email,
        are called <Term id="server">servers</Term>, and people also call the
        computer running one a server. A server waits for other devices to ask,
        then sends what they asked for. A later lesson in this level compares
        this with devices that share directly with each other.
      </p>

      <h3>Worked example: one evening, one home network</h3>
      <p>Here is one hour in a home with a single network:</p>
      <ol className={styles.steps}>
        <li>
          Mia prints her homework on the printer upstairs.{' '}
          <em>(Sharing hardware.)</em>
        </li>
        <li>
          Her brother plays an online game with friends in other cities.{' '}
          <em>(Communication.)</em>
        </li>
        <li>
          Their dad watches a film sent from a streaming server far away.{' '}
          <em>(A service.)</em>
        </li>
        <li>
          All three use the same internet connection at the same time.{' '}
          <em>(Sharing one connection.)</em>
        </li>
        <li>
          Later, Mia&rsquo;s phone copies the day&rsquo;s photos to the family
          laptop. <em>(Sharing information.)</em>
        </li>
      </ol>
      <p>
        Five kinds of sharing, one network. Notice that steps 1 and 5 never
        touch the internet. The printer and the laptop are inside the home, so
        those messages stay inside the home network.
      </p>

      <h3>Sharing has a cost: capacity</h3>
      <p>
        A link can only carry so much data each second. Devices that share a
        link also share that limit. When three people stream video over one home
        connection, each one gets part of it. If they ask for more than the link
        can carry, everything slows down. A later lesson in this level, on
        bandwidth and latency, shows how to measure this.
      </p>
    </>
  );
}

/** Go deeper: being on a network is not the same as sharing everything. */
export function PermissionsDeeper() {
  return (
    <>
      <p>
        Being on the same network as someone does not, by itself, give them your
        files. Your device shares only what it is set up to share, such as a
        folder you marked as shared or a printer you made available.
      </p>
      <p>
        Still, other devices on the same network can usually send messages to
        yours. That is why you should keep file sharing turned off on public
        Wi-Fi, such as in a café or an airport: strangers there are on the same
        network as you. Level 7 explains the tools that protect shared networks.
      </p>
    </>
  );
}
