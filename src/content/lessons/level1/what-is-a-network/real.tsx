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

const WINDOWS_PING = `Pinging 127.0.0.1 with 32 bytes of data:
Reply from 127.0.0.1: bytes=32 time<1ms TTL=128
Reply from 127.0.0.1: bytes=32 time<1ms TTL=128
Reply from 127.0.0.1: bytes=32 time<1ms TTL=128
Reply from 127.0.0.1: bytes=32 time<1ms TTL=128

Ping statistics for 127.0.0.1:
    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 0ms, Maximum = 0ms, Average = 0ms`;

const MAC_PING = `PING 127.0.0.1 (127.0.0.1): 56 data bytes
64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.052 ms
64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.061 ms
64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.048 ms
64 bytes from 127.0.0.1: icmp_seq=3 ttl=64 time=0.055 ms

--- 127.0.0.1 ping statistics ---
4 packets transmitted, 4 packets received, 0.0% packet loss
round-trip min/avg/max/stddev = 0.048/0.054/0.061/0.005 ms`;

const cmd = (text: string) => <code className={styles.command}>{text}</code>;

/** "On your own computer": find your own address, then ping yourself. */
export function RealComputer() {
  return (
    <>
      <p>
        Only do this on your own device and network. Your own computer is a host
        on a real network. In two short steps you can see its address and send
        it a test message. Both commands only read information; they change
        nothing.
      </p>

      <h3>Step 1: find your own IP address</h3>
      <p>
        <strong>Windows:</strong> press Start, type {cmd('cmd')}, press Enter,
        then type {cmd('ipconfig')} and press Enter. Your output will look
        something like this:
      </p>
      <pre className={styles.output}>{WINDOWS_IPCONFIG}</pre>
      <p>What the lines mean:</p>
      <ul>
        <li>
          <strong>Wireless LAN adapter Wi-Fi</strong>: the network adapter. This
          computer uses a Wi-Fi link. If you use a cable, you will see{' '}
          <em>Ethernet adapter</em> instead. You may see several adapters; look
          for the one with an IPv4 Address.
        </li>
        <li>
          <strong>IPv4 Address</strong>: your computer&rsquo;s IP address on
          your home network, here 192.168.1.23.
        </li>
        <li>
          <strong>Subnet Mask</strong>: 255.255.255.0, so the first three
          numbers (192.168.1) are the network part.
        </li>
        <li>
          <strong>Default Gateway</strong>: the address of your home router.
          Your computer sends messages for other networks, such as the internet,
          to this address.
        </li>
        <li>
          <strong>Link-local IPv6 Address</strong> and{' '}
          <strong>DNS Suffix</strong>: you can ignore these for now. Level 3 and
          Level 6 explain them.
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
        The <em>inet</em> line shows the IP address, 192.168.1.23. The mask is
        written in hexadecimal, a way of writing numbers with the digits 0 to 9
        and the letters a to f: 0xffffff00 is the same mask as 255.255.255.0.
        The <em>ether</em> line is the adapter&rsquo;s hardware address.
      </p>
      <p>
        <strong>Linux:</strong> open a terminal and type {cmd('ip addr')}. Find
        your Wi-Fi or Ethernet adapter, often called wlan0 or eth0 (the names
        vary):
      </p>
      <pre className={styles.output}>{LINUX_IP_ADDR}</pre>
      <p>
        Here 192.168.1.23/24 is the IP address with its mask in slash form: /24
        means 255.255.255.0. On Linux, {cmd('ip addr')} also lists an adapter
        called lo with the address 127.0.0.1. On a Mac, {cmd('ifconfig')} with
        no adapter name lists every adapter, including lo0 with 127.0.0.1. That
        address is the next step.
      </p>

      <h3>Step 2: ping your own computer</h3>
      <p>
        Every computer has a <Term id="loopback-address">loopback address</Term>
        , 127.0.0.1. A message sent to it never leaves the computer. It checks
        that your computer&rsquo;s own network software works. The{' '}
        <Term id="ping">ping</Term> command sends a small test message and waits
        for a reply.
      </p>
      <p>
        <strong>Windows:</strong> type {cmd('ping 127.0.0.1')}. It sends four
        test messages and stops by itself:
      </p>
      <pre className={styles.output}>{WINDOWS_PING}</pre>
      <p>
        <strong>macOS and Linux:</strong> type {cmd('ping -c 4 127.0.0.1')}. The{' '}
        {cmd('-c 4')} means &ldquo;send four, then stop&rdquo;; without it, ping
        keeps going until you press Ctrl+C. The Mac output looks like this, and
        Linux looks very similar:
      </p>
      <pre className={styles.output}>{MAC_PING}</pre>
      <p>What the output means:</p>
      <ul>
        <li>
          <strong>Reply from 127.0.0.1</strong> or{' '}
          <strong>64 bytes from 127.0.0.1</strong>: one reply came back for one
          test message.
        </li>
        <li>
          <strong>time</strong>: how long the round trip took, in milliseconds
          (ms, thousandths of a second). It is tiny here because the message
          never left the computer.
        </li>
        <li>
          <strong>bytes</strong>: the size of each test message. Windows sends
          32 bytes of test data. macOS and Linux send 56, and show 64 because
          they count an 8-byte label added to the front.
        </li>
        <li>
          <strong>TTL</strong>: a number that limits how far a message may
          travel. You can ignore it for now; Level 3 explains it.
        </li>
        <li>
          <strong>4 received</strong> (or Received = 4): every test message got
          a reply.
        </li>
      </ul>
      <p>
        Want one more? Ping the Default Gateway address you found in step 1, for
        example {cmd('ping 192.168.1.1')} on Windows or{' '}
        {cmd('ping -c 4 192.168.1.1')} on macOS and Linux. This time the test
        message crosses a real link, to your home router and back. Most home
        routers reply. The times will be a little longer, because the message
        really travelled.
      </p>
    </>
  );
}
