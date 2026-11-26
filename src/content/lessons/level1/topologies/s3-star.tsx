import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

/** Section 3: the star. */
export function Star() {
  return (
    <>
      <p>
        In a star, every device has its own cable to one central device. The
        centre is usually a <Term id="switch">switch</Term>. Picture a round
        table with a host in the middle: guests do not talk across the table to
        each other. They talk to the host, who passes the message to the right
        person.
      </p>

      <h3>How a message travels in a star</h3>
      <p>
        Device A sends its message down its own cable to the switch. The switch
        looks at the address and sends the message down the cable of the device
        it is for, say C. The other cables stay quiet. Every message crosses
        exactly two links: one into the switch and one out of it.
      </p>

      <h3>What breaks, and what it costs</h3>
      <ul>
        <li>
          <strong>Cable:</strong> one cable per device, plus the switch. Five
          devices need five cables (n cables for n devices), and the switch
          needs five sockets.
        </li>
        <li>
          <strong>If one cable is cut, or one device fails:</strong> only that
          device loses its connection. The other cables and the switch are
          untouched, so everyone else carries on.
        </li>
        <li>
          <strong>If the switch fails:</strong> everyone stops. Every message
          goes through it, so the switch is the star&rsquo;s single point of
          failure.
        </li>
        <li>
          <strong>Adding a device:</strong> plug one more cable into a free
          socket. A switch has a fixed number of sockets, so a bigger network
          needs another switch (see Go deeper).
        </li>
      </ul>
      <p>
        A star also makes problems quick to locate. If one device has no
        connection, you check its cable and its socket. You do not have to
        search a whole shared cable.
      </p>

      <h3>Your home is probably a star</h3>
      <p>
        Look at your own home. Your router, the box from your internet provider,
        sits in the middle. A games console plugged in by cable has its own
        cable to it. Phones and laptops on Wi-Fi each have their own wireless
        link to it. Each device has a separate link to the centre, so the home
        network is a star, even though the &ldquo;cables&rdquo; are radio waves.
      </p>
      <p>
        Your computers need one more address to use that star. To reach anything
        outside your home, a computer sends the message to the router first. The
        router&rsquo;s address on your home network is called the{' '}
        <Term id="default-gateway">default gateway</Term>. You will find yours
        in the &ldquo;On your own computer&rdquo; step.
      </p>
      <ol className={styles.steps}>
        <li>
          <strong>Worked example.</strong> Your laptop (Wi-Fi), a phone (Wi-Fi)
          and a console (cable) all connect to your router.
        </li>
        <li>
          The console&rsquo;s cable comes loose. Only the console goes offline.
          The laptop and phone keep working.
        </li>
        <li>
          The router loses power. Laptop, phone and console all lose the network
          at the same moment, which is the evening in this lesson&rsquo;s
          opening question.
        </li>
      </ol>
    </>
  );
}

/** Go deeper: why Ethernet moved from bus to star. */
export function BusToStarDeeper() {
  return (
    <>
      <p>
        In 1990 a new kind of Ethernet, 10BASE-T, put each computer on its own
        twisted-pair cable (the thin cable with eight copper wires inside,
        ending in a plastic plug) running to a central box. The first central
        boxes were hubs. A hub is simple: whatever arrives on one socket, it
        repeats out of every other socket.
      </p>
      <p>
        Hubs were later replaced by switches. A switch learns which device is on
        which socket and sends each message only where it needs to go. Cables
        were simpler to install and repair, and one broken cable no longer took
        down the whole building. That is why every wired office and home network
        today is a star.
      </p>
    </>
  );
}

/** Go deeper: stars joined together. */
export function ExtendedStarDeeper() {
  return (
    <>
      <p>
        When one switch has too few sockets, you plug a second switch into the
        first, and add devices to the second. The result is a star of stars,
        often called a tree or an extended star. A school or an office building
        is usually built this way: one switch per floor, joined to a main
        switch.
      </p>
      <p>
        The failure rules still apply, one level up. If the cable between a
        floor switch and the main switch is cut, the whole floor is cut off from
        the rest, though the devices on that floor can still talk to each other.
        Real networks often add a second cable between switches to protect
        against this. That needs extra care to avoid message loops, which Level
        2 covers.
      </p>
    </>
  );
}
