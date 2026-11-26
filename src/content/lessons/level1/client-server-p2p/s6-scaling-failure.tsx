import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';
import { Myths } from './myths';

/** Section 6: scaling, the single point of failure, and common mistakes. */
export function ScalingAndFailure() {
  return (
    <>
      <p>
        Two questions decide whether a service works for real people. What
        happens when ten times as many people show up? And what happens when
        something breaks?
      </p>

      <h3>Scaling: what happens as the crowd grows</h3>
      <p>
        To <em>scale</em> means to keep working as the number of users grows.
        The two designs scale differently:
      </p>
      <ul>
        <li>
          <strong>Client-server</strong> needs the owner to add capacity: a
          faster connection, a stronger server, or more servers. The cost grows
          with the crowd. The time in our example grew in step with it.
        </li>
        <li>
          <strong>Peer-to-peer</strong> brings capacity with each new peer, so
          the crowd supplies part of what it demands. The price is less control
          and less certainty.
        </li>
      </ul>

      <h3>The single point of failure</h3>
      <p>
        Picture a school with one file server. Thirty computers are cabled to a
        switch, and the server is cabled to the same switch. One morning the
        server loses power. Every computer is fine, the switch is fine, and
        every link is fine. But nobody can open a file.
      </p>
      <p>
        The server is a{' '}
        <Term id="single-point-of-failure">single point of failure</Term>: one
        part that, when it stops, stops the whole service for everyone. You will
        see this yourself in the lab. Unplug the server&rsquo;s cable and every
        computer fails together.
      </p>
      <p>
        The same is true of the switch in that picture: if it fails, every
        computer loses the server too. A single point of failure is not always
        the server. It is whichever one part has no stand-in.
      </p>

      <h3>The fix: more than one server</h3>
      <p>
        Real services avoid a single point of failure by keeping several copies
        of the server, often in different buildings. A{' '}
        <Term id="load-balancer">load balancer</Term> receives the requests and
        hands each one to a server that is working. If one server breaks, the
        others carry on, and clients may not notice at all.
      </p>
      <p>
        This also helps with scaling: more copies can answer more clients at
        once. In peer-to-peer, no one peer is essential. If one leaves, others
        who have the same pieces carry on.
      </p>
      <p className={styles.note}>
        &ldquo;More than one&rdquo; moves the problem, it does not remove it.
        The load balancer can fail too, so serious services keep a spare for
        that as well. Engineers keep asking one question: what happens if this
        part stops?
      </p>

      <h3>Common mistakes and myths</h3>
      <Myths />
    </>
  );
}

/** Go deeper: scaling up and scaling out. */
export function ScaleUpOutDeeper() {
  return (
    <>
      <p>There are two ways to give a service more capacity.</p>
      <ul>
        <li>
          <strong>Scale up:</strong> buy a bigger server. Simple, but there is a
          limit to how big one machine gets, and it is still one machine.
        </li>
        <li>
          <strong>Scale out:</strong> add more servers and share the work with a
          load balancer. It needs more planning, but it also gives you spare
          servers when one fails.
        </li>
      </ul>
      <p>
        Large services mostly scale out, because adding another ordinary server
        is cheaper than a bigger one, and because it removes the single point of
        failure at the same time.
      </p>
    </>
  );
}

/** Go deeper: availability in numbers. */
export function AvailabilityDeeper() {
  return (
    <>
      <p>
        Engineers describe how often a service is working as a percentage of
        time, called availability. A service that is up 99% of the time is down
        for about 3.65 days a year (1% of 365 days). At 99.9% that is about 8.8
        hours a year. At 99.99% it is under an hour.
      </p>
      <p>
        If the service needs two things and both must work, you must multiply
        their availabilities, so the result is lower than either. One server at
        99% and one switch at 99% give 0.99 × 0.99, about 98%. With two
        independent servers and either one is enough, the service is down only
        when both are down at once: 1% of 1%, which is 0.01%, so the two servers
        together are up about 99.99% of the time.
      </p>
      <p>
        These figures assume the failures are independent. Two servers on the
        same power supply are not independent, which is why copies are often
        placed in different buildings.
      </p>
    </>
  );
}
