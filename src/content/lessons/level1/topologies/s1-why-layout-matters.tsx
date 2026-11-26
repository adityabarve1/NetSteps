import { Term } from '@/content/components/Term';
import { TopologyDiagram } from './diagram';
import { sceneDescription, topologyOf } from './steps';
import { communicatingNodes, type TopologyKind } from './logic';
import styles from './lesson.module.css';

const SHAPES: { kind: TopologyKind; caption: string }[] = [
  { kind: 'bus', caption: 'Bus: devices tap into one shared cable.' },
  { kind: 'star', caption: 'Star: every device has a cable to the centre.' },
  { kind: 'ring', caption: 'Ring: devices are joined in a closed loop.' },
  { kind: 'mesh', caption: 'Mesh: every device is joined to every other.' },
];

/** The four shapes, drawn once with nothing broken. */
function ShapesFigure() {
  const none = { links: [], nodes: [] };
  return (
    <ul className={styles.shapes}>
      {SHAPES.map((s) => {
        const t = topologyOf(s.kind);
        const ok = communicatingNodes(t, none);
        return (
          <li key={s.kind}>
            <figure>
              <TopologyDiagram
                topology={t}
                broken={none}
                ok={ok}
                compact={false}
                reducedMotion
                label={sceneDescription(t, none, ok)}
              />
              <figcaption>{s.caption}</figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}

/** Section 1: what a topology is and what to compare. */
export function WhyLayoutMatters() {
  return (
    <>
      <p>
        You can join the same five devices to each other in many different ways.
        You could run one long cable past all of them, or give each device its
        own cable to a box in the middle. The way the devices and links are
        arranged is called the network&rsquo;s{' '}
        <Term id="topology">topology</Term>. The word means &ldquo;the shape of
        the network&rdquo;.
      </p>

      <h3>The four basic shapes</h3>
      <p>
        Engineers draw each device as a dot, called a{' '}
        <Term id="node">node</Term>, and each link as a line. Four patterns
        appear again and again: the <Term id="bus-topology">bus</Term>, the{' '}
        <Term id="star-topology">star</Term>, the{' '}
        <Term id="ring-topology">ring</Term> and the{' '}
        <Term id="mesh-topology">mesh</Term>. Here they are, with five devices
        each (the star has a <Term id="switch">switch</Term> in the middle as
        well). Each later section takes one shape in turn.
      </p>
      <ShapesFigure />

      <h3>Three questions to ask about any shape</h3>
      <p>The shape decides how a network behaves. Ask three questions:</p>
      <ol className={styles.steps}>
        <li>
          <strong>How much cable and equipment does it need?</strong> More links
          and more sockets cost more money.
        </li>
        <li>
          <strong>What happens when one part breaks?</strong> A cable can be cut
          and a device can lose power.
        </li>
        <li>
          <strong>How much work is it to add one more device?</strong> Some
          shapes need a new cable to every other device. Others need only one.
        </li>
      </ol>
      <p>
        The second question matters most. A part that stops the whole network
        when it fails is called a{' '}
        <Term id="single-point-of-failure">single point of failure</Term>. Some
        shapes have one. Others have none, and they pay for that with more
        cable.
      </p>

      <h3>A worked example: one break, four shapes</h3>
      <p>
        Imagine five devices, A to E. One cable fails. In a star it is the cable
        from the switch to C, and only C goes offline. In a bus it is a piece of
        the shared cable, and (in our model) all five go offline. The same break
        does very different damage, depending on the shape. The rest of this
        lesson shows exactly why.
      </p>
      <p className={styles.note}>
        Our model is deliberately simple. It follows the rules that textbooks
        and exams use for each shape. Real networks add extra parts to avoid
        these failures, and the &ldquo;Go deeper&rdquo; blocks say where.
      </p>
    </>
  );
}

/** Go deeper: nodes and links as a graph. */
export function GraphDeeper() {
  return (
    <>
      <p>
        Mathematicians call a drawing of dots and lines a graph. The dots are
        nodes (or vertices) and the lines are links (or edges). Everything in
        this lesson can be stated about graphs: &ldquo;a bus has n &minus; 1
        links&rdquo; and &ldquo;a mesh has n(n &minus; 1) / 2 links&rdquo; are
        facts about counting edges.
      </p>
      <p>
        The number of links at one node is its <em>degree</em>. In a star, the
        centre has a high degree and every other node has degree 1. In a ring,
        every node has degree 2. In a full mesh of n nodes, every node has
        degree n &minus; 1. High degree means more sockets on that device.
      </p>
    </>
  );
}

/** Go deeper: what a node can be. */
export function NodeKindsDeeper() {
  return (
    <>
      <p>
        In a topology diagram, a node can be any device that takes part: a
        laptop, a printer, a switch or a router. The drawings in this lesson
        label every node with a letter and call them devices.
      </p>
      <p>
        There is one rule to keep in mind from the last lesson. An ordinary
        computer does not pass other devices&rsquo; messages along. In a ring or
        a mesh, nodes must pass messages along for each other, so in a real ring
        or mesh those nodes are network devices such as switches and routers,
        not plain computers.
      </p>
    </>
  );
}
