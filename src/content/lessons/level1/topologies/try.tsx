import { useState } from 'react';
import { cx } from '@/lib/cx';
import { useCompactLayout } from '@/sim/useCompactLayout';
import { useReducedMotion } from '@/sim/useReducedMotion';
import { TopologyDiagram } from './diagram';
import { linkLabel, nodeLabel } from './layout';
import { communicatingNodes, type TopologyKind } from './logic';
import { statusSentence, topologyOf } from './steps';
import styles from './try.module.css';

const SHAPES: { kind: TopologyKind; name: string; rule: string }[] = [
  {
    kind: 'bus',
    name: 'Bus',
    rule: 'In our bus model, one cut in the backbone stops everyone. A broken device only removes itself.',
  },
  {
    kind: 'star',
    name: 'Star',
    rule: 'In a star, a cut cable cuts off one device. A broken switch stops everyone.',
  },
  {
    kind: 'ring',
    name: 'Ring',
    rule: 'In a single ring, one cut link or one broken device stops everyone.',
  },
  {
    kind: 'mesh',
    name: 'Mesh',
    rule: 'In a mesh, traffic finds another route. A device is only cut off when all of its cables are cut.',
  },
];

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

/**
 * Try it: pick a shape, then break cables and devices with the buttons. The
 * verdict comes from `communicatingNodes` (pure, tested), so it always agrees
 * with the simulation.
 */
export function BreakIt() {
  const [kind, setKind] = useState<TopologyKind>('star');
  const [links, setLinks] = useState<string[]>([]);
  const [nodes, setNodes] = useState<string[]>([]);
  const compact = useCompactLayout();
  const reducedMotion = useReducedMotion();

  const topology = topologyOf(kind);
  const broken = { links, nodes };
  const ok = communicatingNodes(topology, broken);
  const shape = SHAPES.find((s) => s.kind === kind);
  const count = links.length + nodes.length;

  function pick(next: TopologyKind) {
    setKind(next);
    setLinks([]);
    setNodes([]);
  }
  function reset() {
    setLinks([]);
    setNodes([]);
  }

  return (
    <div className={styles.tryIt}>
      <h3 className={styles.title}>Break it and see who can still talk</h3>
      <p>
        Pick a shape. Then press the buttons to break a cable or a device, and
        press them again to repair it. Try the same break in all four shapes.
      </p>

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Shape</legend>
        <div className={styles.row}>
          {SHAPES.map((s) => (
            <label key={s.kind} className={styles.radio}>
              <input
                type="radio"
                name="topology-shape"
                checked={kind === s.kind}
                onChange={() => {
                  pick(s.kind);
                }}
              />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>

      <TopologyDiagram
        topology={topology}
        broken={broken}
        ok={ok}
        compact={compact}
        reducedMotion={reducedMotion}
      />

      <div className={styles.controls}>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Cables</legend>
          <div className={styles.row}>
            {topology.links.map((l) => (
              <button
                key={l.id}
                type="button"
                className={cx(styles.toggle, links.includes(l.id) && styles.on)}
                aria-pressed={links.includes(l.id)}
                onClick={() => {
                  setLinks((now) => toggle(now, l.id));
                }}
              >
                {links.includes(l.id) ? '✕ ' : ''}
                Cable {linkLabel(topology, l.id)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.group}>
          <legend className={styles.legend}>Devices</legend>
          <div className={styles.row}>
            {topology.nodes.map((id) => (
              <button
                key={id}
                type="button"
                className={cx(styles.toggle, nodes.includes(id) && styles.on)}
                aria-pressed={nodes.includes(id)}
                onClick={() => {
                  setNodes((now) => toggle(now, id));
                }}
              >
                {nodes.includes(id) ? '✕ ' : ''}
                {nodeLabel(topology, id) === 'Switch'
                  ? 'Switch'
                  : `Device ${nodeLabel(topology, id)}`}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <button type="button" className={styles.reset} onClick={reset}>
        Repair everything
      </button>

      <div
        role="status"
        className={cx(styles.verdict, ok.length > 0 && styles.verdictOk)}
      >
        <p className={styles.summary}>
          <span className={styles.badge}>
            {ok.length === 0 ? '✗ Stopped.' : '✓ Still working.'}
          </span>{' '}
          {count === 0
            ? 'Nothing is broken yet. '
            : `You broke ${String(links.length)} ${links.length === 1 ? 'cable' : 'cables'} and ${String(nodes.length)} ${nodes.length === 1 ? 'device' : 'devices'}. `}
          {statusSentence(topology, ok)}
        </p>
        <p className={styles.rule}>{shape?.rule}</p>
      </div>
    </div>
  );
}
