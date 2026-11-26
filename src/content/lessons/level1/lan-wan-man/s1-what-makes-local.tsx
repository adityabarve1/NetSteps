import { Term } from '@/content/components/Term';
import { ScopeSim } from './sim';

/** Section 1: sorting networks by reach, and the primary simulation. */
export function WhatMakesLocal() {
  return (
    <>
      <p>
        In the last lesson you saw that networks come in every size, from two
        devices to the whole internet. People sort them by one simple question:
        how far does the network reach? Four names cover the sizes, from
        smallest to largest:
      </p>
      <ul>
        <li>
          A <Term id="pan">PAN</Term> (personal area network) is the network
          around one person.
        </li>
        <li>
          A <Term id="lan">LAN</Term> (local area network) covers one place,
          such as a home or a school building.
        </li>
        <li>
          A <Term id="man">MAN</Term> (metropolitan area network) covers a whole
          city.
        </li>
        <li>
          A <Term id="wan">WAN</Term> (wide area network) joins places that are
          far apart, such as different cities or countries.
        </li>
      </ul>
      <p>
        The next four sections look at each one. First, watch all four at once.
        Step through with <strong>Next</strong>, or press <strong>Play</strong>.
        The rings grow outward, from one person to the whole world.
      </p>

      <ScopeSim />
      <p>Notice three things:</p>
      <ul>
        <li>
          Each ring contains the smaller ones. Your phone is in your PAN and, at
          the same time, on your home LAN.
        </li>
        <li>
          The rings are not to scale. The step from LAN to MAN is a jump from
          kilometres to tens of kilometres, and WAN has no upper limit.
        </li>
        <li>
          The campus step is still a LAN. The site got bigger, but the kind of
          network did not change.
        </li>
      </ul>

      <h3>What “local” really means</h3>
      <p>
        “Local” means two things at once. The devices are{' '}
        <strong>close together</strong>, on one site. And{' '}
        <strong>one person or organisation is in charge</strong> of the whole
        network: it decides who may join and it looks after the cables and
        boxes. Your home Wi-Fi is local in both ways. A link to a friend in
        another country is neither close nor run by you.
      </p>

      <h3>Why sort networks by reach at all?</h3>
      <p>
        Reach changes the problems. In your own home you can run a cable through
        the wall. Between two cities you cannot dig up other people&rsquo;s
        land, so you need different tools and you pay someone else for them. The
        names are a quick way to say what sort of network, and what sort of
        problems, you are talking about.
      </p>
    </>
  );
}

/** Go deeper: ownership and administration, the real difference. */
export function OwnershipDeeper() {
  return (
    <>
      <p>
        Distance is the part that is simple to measure, but many engineers say
        the real difference between a LAN and a WAN is who owns and runs the
        network.
      </p>
      <p>
        On a LAN, one owner decides everything. That owner buys the switches and
        access points, pulls the cables, picks the rules and fixes what breaks.
        This person or team is often called the network administrator. A WAN
        crosses land and seas that belong to other people. So its owner usually
        rents the long-distance lines from telecom companies and pays a monthly
        fee.
      </p>
      <p>
        This is a pattern, not a law. A very large company can own its own
        long-distance cables. A LAN in a block of flats may be run by the
        landlord, not by you. When the two ideas disagree, engineers often trust
        the ownership story more than the number of kilometres.
      </p>
    </>
  );
}

/** Go deeper: other area-network names. */
export function OtherNamesDeeper() {
  return (
    <>
      <p>
        You may meet other names. A <Term id="campus">campus</Term> is a group
        of buildings on one site that belong to one organisation, such as a
        university. A CAN (campus area network) is the network that joins those
        buildings. In practice most people still call it a LAN, or a campus LAN.
      </p>
      <p>
        Some books add a HAN (home area network) for the devices in one home,
        which is a small LAN. Names like these are shorthand and they are not
        used in the same way everywhere. The four in this lesson (PAN, LAN, MAN
        and WAN) are the ones you will meet most.
      </p>
    </>
  );
}
