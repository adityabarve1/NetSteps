import styles from './lesson.module.css';

// An illustration, not real output: the times, the addresses and the reply
// details depend on your network. The server address is from a range reserved
// for examples, so it is not a real machine.
const WINDOWS = `C:\\> ping 192.168.1.1

Reply from 192.168.1.1: bytes=32 time=2ms TTL=64
Reply from 192.168.1.1: bytes=32 time=1ms TTL=64
Reply from 192.168.1.1: bytes=32 time=2ms TTL=64
Reply from 192.168.1.1: bytes=32 time=3ms TTL=64

Approximate round trip times in milli-seconds:
    Minimum = 1ms, Maximum = 3ms, Average = 2ms`;

const FAR = `$ ping -c 4 example.com
PING example.com (203.0.113.10): 56 data bytes
64 bytes from 203.0.113.10: icmp_seq=0 ttl=52 time=88.1 ms
64 bytes from 203.0.113.10: icmp_seq=1 ttl=52 time=86.9 ms
64 bytes from 203.0.113.10: icmp_seq=2 ttl=52 time=89.4 ms
64 bytes from 203.0.113.10: icmp_seq=3 ttl=52 time=87.6 ms

--- example.com ping statistics ---
4 packets transmitted, 4 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 86.9/88.0/89.4/0.9 ms`;

const code = (text: string) => <code className={styles.command}>{text}</code>;

/** "On your own computer": ping the router and a distant server. */
export function RealComputer() {
  return (
    <>
      <p>
        Only do this on your own device and network. You will send a few tiny
        test messages with {code('ping')} and read how long each takes. It
        changes nothing and sends only small, ordinary test messages.
      </p>

      <h3>Step 1: find your router&rsquo;s address</h3>
      <ul>
        <li>
          <strong>Windows:</strong> open Command Prompt and type{' '}
          {code('ipconfig')}. Find the line <strong>Default Gateway</strong>.
          The number beside it, often {code('192.168.1.1')}, is your router.
        </li>
        <li>
          <strong>macOS:</strong> open System Settings, choose Wi-Fi, press
          Details for your network and open TCP/IP. The number beside{' '}
          <strong>Router</strong> is your router.
        </li>
        <li>
          <strong>Linux:</strong> open your network settings and look for the
          gateway or router address of your connection. Many home routers also
          print their address on a label.
        </li>
      </ul>

      <h3>Step 2: ping the router, then a distant server</h3>
      <p>
        Open a terminal (Command Prompt on Windows, Terminal on macOS or Linux)
        and run these two commands. Use your own router address in the first
        one.
      </p>
      <ul>
        <li>
          <strong>Windows:</strong> {code('ping 192.168.1.1')}, then{' '}
          {code('ping example.com')}. Windows sends four test messages and stops
          by itself.
        </li>
        <li>
          <strong>macOS and Linux:</strong> {code('ping -c 4 192.168.1.1')},
          then {code('ping -c 4 example.com')}. The {code('-c 4')} part stops
          after four messages. Without it, ping runs until you press Ctrl+C.
        </li>
      </ul>
      <p>Your first result may look something like this (Windows):</p>
      <pre className={styles.output}>{WINDOWS}</pre>
      <p>And the second, to a distant server (macOS or Linux):</p>
      <pre className={styles.output}>{FAR}</pre>

      <h3>What the numbers mean</h3>
      <ul>
        <li>
          <strong>time=2ms</strong> or <strong>time=88.1 ms</strong>: the round
          trip, there and back, for one tiny message. It is latency, not
          bandwidth.
        </li>
        <li>
          <strong>The router is close.</strong> The message crosses a few
          metres, so the round trip is a few milliseconds.
        </li>
        <li>
          <strong>The distant server is far.</strong> The message crosses many
          devices and many kilometres, so the round trip is much longer. The
          size of the gap is the lesson: same computer, same plan, very
          different latency.
        </li>
        <li>
          <strong>Minimum, Maximum, Average (or min/avg/max):</strong> how much
          the times vary. The variation comes from queues and is called jitter.
        </li>
      </ul>
      <p>
        If you see <strong>Request timed out</strong> or no replies at all, that
        is not necessarily a fault. Some servers and some routers are set not to
        answer ping. Try a different well-known site. If the router does not
        answer either, check the address you used.
      </p>
      <p>
        Now compare: your plan&rsquo;s bandwidth did not change between the two
        commands, but the time did. That difference is the road, not the pipe.
        If you can, try again on Wi-Fi and then on a cable, and see which gives
        the more steady times.
      </p>
    </>
  );
}
