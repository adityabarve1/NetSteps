import { cx } from '@/lib/cx';
import { layoutTopology, nodeLabel, NODE_H, NODE_W } from './layout';
import type { Broken, Topology } from './logic';
import styles from './diagram.module.css';

// The star's centre is wider than the other boxes: its name is "Switch".
const HUB_W = 66;

type Props = {
  topology: Topology;
  broken: Broken;
  /** The devices that can still talk (from `communicatingNodes`). */
  ok: string[];
  /** Draw the tall, narrow version for a phone. */
  compact: boolean;
  reducedMotion: boolean;
  /** The picture's accessible name. Without it the picture is hidden from screen readers. */
  label?: string;
};

/**
 * One topology, drawn as SVG. A broken cable is dashed AND crossed out AND
 * labelled "cut"; a broken device is crossed out AND says "down"; a device that
 * cannot reach the others says "cut off". Colour is only a second signal.
 */
export function TopologyDiagram({
  topology,
  broken,
  ok,
  compact,
  reducedMotion,
  label,
}: Props) {
  const scene = layoutTopology(topology, compact);
  const okSet = new Set(ok);
  const badLinks = new Set(broken.links);
  const badNodes = new Set(broken.nodes);
  const a11y =
    label === undefined
      ? ({ 'aria-hidden': true } as const)
      : ({ role: 'img', 'aria-label': label } as const);

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${String(scene.width)} ${String(scene.height)}`}
      {...a11y}
    >
      {topology.kind === 'bus'
        ? scene.drops.map((d) => (
            <line
              key={d.node}
              className={cx(styles.drop, badNodes.has(d.node) && styles.dashed)}
              x1={d.segment.from.x}
              y1={d.segment.from.y}
              x2={d.segment.to.x}
              y2={d.segment.to.y}
            />
          ))
        : null}

      {topology.links.map((l) => {
        const seg = scene.links[l.id];
        if (seg === undefined) return null;
        const cut = badLinks.has(l.id);
        // A bus backbone carries traffic for everyone while it is whole, even
        // beside a device that is down.
        const live =
          topology.kind === 'bus'
            ? ok.length > 0 && !cut
            : okSet.has(l.a) && okSet.has(l.b);
        return (
          <g key={l.id}>
            <line
              className={cx(
                styles.link,
                topology.kind === 'bus' && styles.backbone,
                live && styles.live,
                cut && styles.cut,
                !reducedMotion && styles.fade,
              )}
              x1={seg.from.x}
              y1={seg.from.y}
              x2={seg.to.x}
              y2={seg.to.y}
            />
          </g>
        );
      })}

      {/* Cut marks are drawn after every cable, so no cable runs over their words. */}
      {topology.links.map((l) => {
        const seg = scene.links[l.id];
        if (seg === undefined || !badLinks.has(l.id)) return null;
        const mx = (seg.from.x + seg.to.x) / 2;
        const my = (seg.from.y + seg.to.y) / 2;
        return (
          <g
            key={l.id}
            className={styles.cross}
            transform={`translate(${String(mx)} ${String(my)})`}
          >
            <circle className={styles.crossBack} r={9} />
            <path d="M-5 -5 L5 5 M5 -5 L-5 5" />
            <text className={styles.cutWord} y={-14} textAnchor="middle">
              cut
            </text>
          </g>
        );
      })}

      {topology.nodes.map((id) => {
        const p = scene.nodes[id];
        if (p === undefined) return null;
        const down = badNodes.has(id);
        const good = okSet.has(id);
        const state = down ? 'down' : good ? '' : 'cut off';
        const hub = topology.kind === 'star' && id === topology.nodes[0];
        return (
          <g key={id} className={cx(good && styles.good)}>
            <rect
              className={cx(
                styles.box,
                hub && styles.hub,
                good && styles.boxGood,
                !good && styles.boxOff,
                !reducedMotion && styles.fade,
              )}
              x={p.x - (hub ? HUB_W : NODE_W) / 2}
              y={p.y - NODE_H / 2}
              width={hub ? HUB_W : NODE_W}
              height={NODE_H}
              rx={8}
            />
            {down ? (
              <path
                className={styles.crossLine}
                d={`M${String(p.x - 12)} ${String(p.y - 9)} L${String(p.x + 12)} ${String(p.y + 9)} M${String(p.x + 12)} ${String(p.y - 9)} L${String(p.x - 12)} ${String(p.y + 9)}`}
              />
            ) : null}
            <text
              className={cx(styles.name, down && styles.nameDown)}
              x={p.x}
              y={p.y + 5}
              textAnchor="middle"
            >
              {nodeLabel(topology, id)}
            </text>

            {state === '' ? null : (
              <text
                className={cx(styles.state, down && styles.stateDown)}
                x={scene.labelsBeside ? p.x + NODE_W / 2 + 6 : p.x}
                y={
                  scene.labelsBeside
                    ? p.y + 4
                    : scene.labelAbove.includes(id)
                      ? p.y - NODE_H / 2 - 7
                      : p.y + NODE_H / 2 + 14
                }
                textAnchor={scene.labelsBeside ? 'start' : 'middle'}
              >
                {state}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
