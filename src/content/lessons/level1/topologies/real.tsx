import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

// The addresses are examples: your numbers will differ.
const WINDOWS_IPCONFIG = `Windows IP Configuration

Wireless LAN adapter Wi-Fi:

   IPv4 Address. . . . . . . . . . . : 192.168.1.23
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1`;

const MAC_ROUTE = `   route to: default
destination: default
       mask: default
    gateway: 192.168.1.1
  interface: en0
...`;

const LINUX_IP_ROUTE = `default via 192.168.1.1 dev wlan0 ...
192.168.1.0/24 dev wlan0 ... src 192.168.1.23 ...`;

const cmd = (text: string) => <code className={styles.command}>{text}</code>;

/** "On your own computer": find the router at the centre of your home star. */
export function RealComputer() {
  return (
    <>
      <p>
        Only do this on your own device and network. In this step you look up
        the address of the centre of your own home star: the router. Each
        command only reads information. It changes nothing and sends nothing to
        other devices.
      </p>

      <h3>Find your default gateway</h3>
      <p>
        Your computer keeps the address of the router, its{' '}
        <Term id="default-gateway">default gateway</Term>, because it sends
        every message for outside your home there first. Your numbers will
        differ from the samples below.
      </p>
      <p>
        <strong>Windows:</strong> press Start, type {cmd('cmd')}, press Enter,
        then type {cmd('ipconfig')} and press Enter. Find the adapter you use
        (Wi-Fi or Ethernet). A sample:
      </p>
      <pre className={styles.output}>{WINDOWS_IPCONFIG}</pre>
      <p>
        <strong>macOS:</strong> open Terminal and type{' '}
        {cmd('route -n get default')}. Look for the line that starts with{' '}
        <em>gateway</em>. (In the sample, &ldquo;...&rdquo; stands for more
        lines that you can ignore.)
      </p>
      <pre className={styles.output}>{MAC_ROUTE}</pre>
      <p>
        <strong>Linux:</strong> open a terminal and type {cmd('ip route')}. Look
        for the line that starts with <em>default via</em>. (In the sample,
        &ldquo;...&rdquo; stands for more text on the same line.)
      </p>
      <pre className={styles.output}>{LINUX_IP_ROUTE}</pre>

      <p>What it means:</p>
      <ul>
        <li>
          <strong>Default Gateway</strong>, <strong>gateway</strong> or{' '}
          <strong>default via</strong>: the address of your router. In the
          samples that is 192.168.1.1. Home routers often use 192.168.1.1 or
          192.168.0.1, but yours may differ.
        </li>
        <li>
          <strong>The router is the centre of your star.</strong> Every device
          at home, on Wi-Fi or on a cable, has its own link to it. If it loses
          power, they all lose the network at the same time.
        </li>
        <li>
          <strong>If there is no gateway line:</strong> the adapter you looked
          at is usually not connected to a network. On Windows, check the other
          adapters in the same output.
        </li>
      </ul>
      <p>
        Now look at your home as a topology. Count the devices that connect to
        your router: phones, laptops, a TV, a console. Each one is a spoke.
        Which of them would still work if the router lost power? (In a typical
        home none of them can reach the internet, and they cannot reach each
        other either, because the router box holds the switch and the Wi-Fi
        access point.)
      </p>
    </>
  );
}
