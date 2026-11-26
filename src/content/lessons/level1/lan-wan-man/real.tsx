import { Term } from '@/content/components/Term';
import styles from './lesson.module.css';

const WINDOWS_IPCONFIG = `Windows IP Configuration


Wireless LAN adapter Wi-Fi:

   Connection-specific DNS Suffix  . :
   Link-local IPv6 Address . . . . . : fe80::1c2d:4e5f:6a7b:8c9d%12
   IPv4 Address. . . . . . . . . . . : 192.168.1.23
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1`;

// Long lines are shortened with "..." so the sample fits a phone screen.
const MAC_IFCONFIG = `en0: flags=8863<UP,BROADCAST,...> mtu 1500
	ether 3c:22:fb:1a:7f:04
	inet6 fe80::1c2d:4e5f:6a7b:8c9d%en0 prefixlen 64 ...
	inet 192.168.1.23 netmask 0xffffff00 broadcast ...
	status: active`;

const LINUX_IP_ADDR = `2: wlan0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 ...
    link/ether 3c:22:fb:1a:7f:04 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.23/24 brd 192.168.1.255 scope global ...`;

const cmd = (text: string) => <code className={styles.command}>{text}</code>;

/** "On your own computer": read your own address and decide if it is a LAN. */
export function RealComputer() {
  return (
    <>
      <p>
        Only do this on your own device and network. Your own computer is
        probably on a LAN right now. In three short steps you can read its
        address, find the range it belongs to and decide whether that range is a
        home-style LAN. The commands only read information; they change nothing.
      </p>

      <h3>Step 1: read your IP address and mask</h3>
      <p>
        <strong>Windows:</strong> press Start, type {cmd('cmd')}, press Enter,
        then type {cmd('ipconfig')} and press Enter. Your output will look
        something like this:
      </p>
      <pre className={styles.output}>{WINDOWS_IPCONFIG}</pre>
      <p>What the lines mean:</p>
      <ul>
        <li>
          <strong>Wireless LAN adapter Wi-Fi</strong>: the adapter in use. A
          cable shows as <em>Ethernet adapter</em> instead. You may see several
          adapters; use the one you are really connected with, the one that has
          an IPv4 Address.
        </li>
        <li>
          <strong>IPv4 Address</strong>: your computer&rsquo;s{' '}
          <Term id="ip-address">IP address</Term>, here 192.168.1.23.
        </li>
        <li>
          <strong>Subnet Mask</strong>: the{' '}
          <Term id="subnet-mask">subnet mask</Term>, here 255.255.255.0. The
          first three numbers (192.168.1) name your network and the last number
          names the device.
        </li>
        <li>
          <strong>Default Gateway</strong>: the{' '}
          <Term id="default-gateway">default gateway</Term>, here 192.168.1.1.
          It is your router, the device at the edge of your LAN.
        </li>
        <li>
          <strong>Link-local IPv6 Address</strong> and{' '}
          <strong>DNS Suffix</strong>: you can ignore these for now.
        </li>
      </ul>
      <p>
        <strong>macOS:</strong> open Terminal (in Applications, then Utilities)
        and type {cmd('ifconfig en0')}. On most Macs, en0 is the Wi-Fi adapter.
        Look for the line that starts with <em>inet</em>. (In these samples,
        &ldquo;...&rdquo; marks the end of a long line that was cut short.)
      </p>
      <pre className={styles.output}>{MAC_IFCONFIG}</pre>
      <p>
        The <em>inet</em> line shows the IP address, 192.168.1.23. The{' '}
        <em>netmask</em> is written in hexadecimal, a way of writing numbers
        with the digits 0 to 9 and the letters a to f: 0xffffff00 is the same
        mask as 255.255.255.0. This command does not print the gateway.
      </p>
      <p>
        <strong>Linux:</strong> open a terminal and type {cmd('ip addr')}. Find
        your Wi-Fi or Ethernet adapter, often called wlan0 or eth0 (the names
        vary):
      </p>
      <pre className={styles.output}>{LINUX_IP_ADDR}</pre>
      <p>
        Here 192.168.1.23/24 is the IP address with its mask in slash form: /24
        means 255.255.255.0. This command does not print the gateway either.
      </p>

      <h3>Step 2: is the address private?</h3>
      <p>
        Look at the first numbers of your IP address. Addresses from three
        ranges are <Term id="private-address">private</Term>. They are meant for
        use inside LANs and are not used on the public internet:
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>The three private ranges (RFC 1918).</caption>
          <thead>
            <tr>
              <th scope="col">Starts with</th>
              <th scope="col">Full range</th>
              <th scope="col">Often found in</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">10.</th>
              <td data-label="Full range">10.0.0.0 to 10.255.255.255</td>
              <td data-label="Often found in">Offices, schools, some homes</td>
            </tr>
            <tr>
              <th scope="row">172.16. to 172.31.</th>
              <td data-label="Full range">172.16.0.0 to 172.31.255.255</td>
              <td data-label="Often found in">Companies, virtual machines</td>
            </tr>
            <tr>
              <th scope="row">192.168.</th>
              <td data-label="Full range">192.168.0.0 to 192.168.255.255</td>
              <td data-label="Often found in">Most home routers</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul>
        <li>
          <strong>Be careful with 172.</strong> Only 172.16 to 172.31 is
          private. An address such as 172.32.4.9 is not.
        </li>
        <li>
          <strong>169.254.x.x</strong> is a different case. Your computer made
          that address up for itself because it could not get one from the
          network. It is not a working LAN address; check your Wi-Fi or cable.
        </li>
      </ul>

      <h3>Step 3: decide what it tells you</h3>
      <p>
        In the sample, 192.168.1.23 starts with 192.168, so it is a private
        address, and your computer is on a LAN, most likely your home network.
        The mask 255.255.255.0 (or /24) leaves room for up to 254 devices in
        that LAN.
      </p>
      <p className={styles.note}>
        What the numbers do not tell you: the address says nothing about
        distance. Your router also has a second address, given by your internet
        provider, on the other side. It is a different address and it does not
        appear in this output. The router joins your small LAN to everything
        else.
      </p>
      <p>
        Try this: write down your address and mask, then say which of the three
        private ranges you are in. If it is in none of them, your network is set
        up differently. That is possible, and whoever runs your network can tell
        you why.
      </p>
    </>
  );
}
