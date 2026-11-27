import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { CANVAS } from '@/labs/builderReducer';
import { addressLine, deviceLabel } from '@/labs/builderText';
import { DeviceIcon } from '@/labs/DeviceIcon';
import { cx } from '@/lib/cx';
import type { Device, Network } from '@/netcore/network';
import styles from './BuilderCanvas.module.css';

type BuilderCanvasProps = {
  net: Network;
  selectedId: string | null;
  /** The device a cable is being run from, or null. */
  connectingFromId: string | null;
  onActivate: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
};

const NUDGE = 16;
const DRAG_THRESHOLD_PX = 4;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-NUDGE, 0],
  ArrowRight: [NUDGE, 0],
  ArrowUp: [0, -NUDGE],
  ArrowDown: [0, NUDGE],
};

type Drag = {
  id: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

/**
 * The SVG canvas. Every device is a focusable button: Enter or Space selects
 * it, Shift plus an arrow key moves it, and dragging with a pointer moves it
 * too. Cables are drawn behind the devices.
 */
export function BuilderCanvas({
  net,
  selectedId,
  connectingFromId,
  onActivate,
  onMove,
}: BuilderCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const justDragged = useRef(false);
  const byId = new Map(net.devices.map((d) => [d.id, d]));

  function onPointerDown(event: PointerEvent<SVGGElement>, d: Device) {
    if (event.button !== 0) return;
    justDragged.current = false;
    drag.current = {
      id: d.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: d.x,
      originY: d.y,
      moved: false,
    };
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- jsdom and a few old browsers have no setPointerCapture
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<SVGGElement>) {
    const current = drag.current;
    const width = svgRef.current?.getBoundingClientRect().width ?? 0;
    if (current === null || width === 0) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (!current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    current.moved = true;
    const scale = CANVAS.width / width;
    onMove(
      current.id,
      current.originX + dx * scale,
      current.originY + dy * scale,
    );
  }

  function endDrag() {
    if (drag.current?.moved) justDragged.current = true;
    drag.current = null;
  }

  function onClick(id: string) {
    // The click that ends a drag must not also select the device.
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    onActivate(id);
  }

  function onKeyDown(event: KeyboardEvent<SVGGElement>, d: Device) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate(d.id);
      return;
    }
    const step = event.shiftKey ? ARROWS[event.key] : undefined;
    if (step !== undefined) {
      event.preventDefault();
      onMove(d.id, d.x + step[0], d.y + step[1]);
    }
  }

  return (
    <svg
      ref={svgRef}
      className={styles.canvas}
      viewBox={`0 0 ${String(CANVAS.width)} ${String(CANVAS.height)}`}
      role="group"
      aria-label="Network canvas"
    >
      {net.links.map((link) => {
        const a = byId.get(link.a);
        const b = byId.get(link.b);
        if (a === undefined || b === undefined) return null;
        const active = link.a === selectedId || link.b === selectedId;
        return (
          <g
            key={link.id}
            role="img"
            aria-label={`Cable between ${a.name} and ${b.name}`}
          >
            <line
              className={cx(styles.cable, active && styles.cableActive)}
              x1={a.x}
              y1={a.y - 14}
              x2={b.x}
              y2={b.y - 14}
            />
          </g>
        );
      })}
      {net.devices.map((d) => {
        const isSource = d.id === connectingFromId;
        const picking = connectingFromId !== null && !isSource;
        return (
          <g
            key={d.id}
            className={cx(
              styles.node,
              d.id === selectedId && styles.nodeSelected,
              isSource && styles.nodeSource,
              picking && styles.nodePicking,
            )}
            transform={`translate(${String(d.x)} ${String(d.y)})`}
            role="button"
            data-device-id={d.id}
            tabIndex={0}
            aria-label={deviceLabel(d)}
            aria-pressed={d.id === selectedId}
            onClick={() => {
              onClick(d.id);
            }}
            onKeyDown={(event) => {
              onKeyDown(event, d);
            }}
            onPointerDown={(event) => {
              onPointerDown(event, d);
            }}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <rect
              className={styles.box}
              x={-52}
              y={-36}
              width={104}
              height={92}
              rx={12}
            />
            <rect
              className={styles.ring}
              x={-46}
              y={-30}
              width={92}
              height={80}
              rx={8}
            />
            <DeviceIcon kind={d.kind} />
            <text className={styles.name} y={22} textAnchor="middle">
              {d.name}
            </text>
            <text className={styles.address} y={40} textAnchor="middle">
              {addressLine(d)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
