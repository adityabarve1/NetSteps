import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

type Case = { situation: string; network: boolean; why: string };

const CASES: Case[] = [
  {
    situation: 'One laptop on a desk, with no cable and Wi-Fi turned off',
    network: false,
    why: 'There is only one device, and nothing connects it to anything.',
  },
  {
    situation: 'Two laptops joined by one cable',
    network: true,
    why: 'Two devices, one connection, and they can send each other files.',
  },
  {
    situation: 'Your phone and your wireless earbuds',
    network: true,
    why: 'Two devices joined by radio (Bluetooth). The phone sends sound data to the earbuds. It is a very small network.',
  },
  {
    situation:
      'A printer next to a laptop, with no cable and no wireless set up',
    network: false,
    why: 'Being close is not enough. With nothing between them to carry data, they cannot exchange anything.',
  },
];

/** Section 1: the definition, its three parts, sizes, and protocols. */
export function WhatANetworkIs() {
  return (
    <>
      <p>
        A <Term id="network">network</Term> is two or more devices that are
        connected so they can exchange data. That is the whole idea. The rest of
        this course is about how that exchange works.
      </p>
      <p>
        <strong>Data</strong> is any information a computer can store or send: a
        text message, a photo, a song, a web page, even a single click. Every
        word in the definition matters, so take them one at a time:
      </p>
      <ul>
        <li>
          <strong>Two or more devices.</strong> One computer on its own is not a
          network. It has nobody to talk to.
        </li>
        <li>
          <strong>Connected.</strong> Something must carry data between the
          devices: a cable, or a radio signal such as{' '}
          <Term id="wi-fi">Wi-Fi</Term>. A device with no connection is not part
          of the network, even if it sits on the same desk.
        </li>
        <li>
          <strong>Exchange data.</strong> The devices must be able to send data
          to each other and receive it. Usually it goes both ways: a reply comes
          back.
        </li>
      </ul>

      <h3>Is it a network? Four quick cases</h3>
      <div data-prose="">
        <table className={styles.table}>
          <caption>Apply the definition to each situation.</caption>
          <thead>
            <tr>
              <th scope="col">Situation</th>
              <th scope="col">Network?</th>
              <th scope="col">Why</th>
            </tr>
          </thead>
          <tbody>
            {CASES.map((c) => (
              <tr key={c.situation}>
                <th scope="row">{c.situation}</th>
                <td
                  data-label="Network"
                  className={c.network ? styles.yes : styles.no}
                >
                  {c.network ? '✓ Yes' : '✗ No'}
                </td>
                <td data-label="Why">{c.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Networks come in every size</h3>
      <p>
        The smallest network is two devices and one connection. A home network
        might have ten devices: phones, a laptop, a TV, a games console and a
        printer. A school or an office can have thousands.
      </p>
      <p>
        The biggest of all is the <Term id="internet">internet</Term>. It is a
        network of networks: millions of smaller networks, joined together, that
        link billions of devices around the world. Your home network is one
        small piece of it. Big or small, every network follows the same idea:
        devices, connected, exchanging data.
      </p>

      <h3>The hidden ingredient: shared rules</h3>
      <p>
        A connection alone is not enough. Imagine a phone call where one person
        speaks only Japanese and the other only Portuguese. The line works, but
        nothing is understood.
      </p>
      <p>
        Devices have the same problem. Both ends must follow the same rules for
        how a message is built, sent and read. A set of rules like this is
        called a <Term id="protocol">protocol</Term>. You will meet many
        protocols in this course. For now, remember: a network needs a
        connection <em>and</em> shared rules.
      </p>
    </>
  );
}

/** Go deeper: what engineers mean by "node", and networks as graphs. */
export function NodesDeeper() {
  return (
    <>
      <p>
        When engineers draw a network, they draw each device as a dot or a small
        picture, and each connection as a line. Each device in such a drawing is
        called a <Term id="node">node</Term>.
      </p>
      <p>
        &ldquo;Node&rdquo; is a catch-all word. A laptop, a printer, a switch
        and a router are all nodes. You will see it in diagrams and in later
        lessons, for example &ldquo;the path from node A to node B&rdquo;.
      </p>
      <p>
        Mathematicians call a drawing of dots and lines a <em>graph</em>. Many
        networking problems are graph problems. Finding the quickest way across
        the internet, for example, is a search for the shortest path through a
        graph. You will watch routers solve exactly that in Level 4.
      </p>
    </>
  );
}

/** Go deeper: a little history. */
export function HistoryDeeper() {
  return (
    <>
      <p>
        One of the first big computer networks was ARPANET, a research network
        in the United States. In late 1969 it joined computers at four sites:
        UCLA, the Stanford Research Institute, UC Santa Barbara and the
        University of Utah.
      </p>
      <p>
        The very first message, sent from UCLA to Stanford Research Institute,
        was meant to be &ldquo;LOGIN&rdquo;. The receiving system crashed after
        two letters, so the first word ever sent was &ldquo;LO&rdquo;. An hour
        or so later the full login worked.
      </p>
      <p>
        ARPANET tested ideas that the internet still uses, such as cutting
        messages into small pieces that travel on their own. A later lesson in
        this level, on packet and circuit switching, explains why that idea
        matters so much.
      </p>
    </>
  );
}
