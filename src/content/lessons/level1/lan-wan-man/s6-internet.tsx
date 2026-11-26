import { Term } from '@/content/components/Term';

/** Section 6: the internet as a network of networks. */
export function InternetOfNetworks() {
  return (
    <>
      <p>
        Now put the sizes together. The <Term id="internet">internet</Term> is
        not one more size on the list. It is a network of networks: millions of
        LANs, MANs and WANs, run by thousands of different organisations, all
        joined so that they can pass data to each other. No one organisation
        owns it or runs all of it.
      </p>

      <h3>One request, step by step</h3>
      <p>
        Suppose you open a page from a server in another country. Here is the
        route, from your device outward:
      </p>
      <ol>
        <li>
          Your laptop sends the request over your home <strong>LAN</strong>, by
          Wi-Fi, to your router.
        </li>
        <li>
          The router passes it to your provider&rsquo;s network. Near your home
          this part is often city sized, like a <strong>MAN</strong>.
        </li>
        <li>
          Your provider hands it on over long-distance links, a{' '}
          <strong>WAN</strong>, often to other providers on the way.
        </li>
        <li>
          At the far end, the data reaches the <strong>LAN</strong> of the
          company that runs the server.
        </li>
      </ol>
      <p>
        The reply travels back the same way. So one page load crosses LANs, a
        MAN and WANs, owned by several different organisations. Your laptop only
        ever talked to the first device, your router. The routers along the way
        passed the data on.
      </p>

      <h3>Is the internet a WAN?</h3>
      <p>
        Some books call the internet &ldquo;the biggest WAN&rdquo;. That is a
        fair first picture, but it hides something. A WAN is usually built for
        one organisation, such as Acme&rsquo;s rented line. The internet belongs
        to no single organisation. It is better to say that the internet{' '}
        <strong>joins many networks</strong>, including LANs and WANs, and that
        WANs are some of the parts it is made from.
      </p>
      <p>
        Your own home, in turn, is a LAN that is a small part of the internet.
        When someone says the internet is down, the question to ask is which
        part: your LAN, the line to your provider, or something far away.
      </p>
    </>
  );
}

/** Go deeper: private line or over the internet. */
export function TwoWaysDeeper() {
  return (
    <>
      <p>
        A company with several sites has two main ways to join them. It can rent
        a private line, like Acme did. Only its own traffic uses that line, so
        it is predictable, but it costs more. Or it can send its data over the
        internet, which is cheaper, and protect it with a{' '}
        <Term id="vpn">VPN</Term>. A VPN wraps the data in an encrypted tunnel,
        so that the networks in between cannot read it.
      </p>
      <p>
        Many organisations use both. A later level covers VPNs. For now,
        remember the choice: a private line, or a shared network with a tunnel.
      </p>
    </>
  );
}
