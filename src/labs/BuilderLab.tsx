import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BuilderCanvas } from '@/labs/BuilderCanvas';
import {
  MAX_DEVICES,
  builderReducer,
  canConnect,
  nextFreePosition,
  normalizeNetwork,
} from '@/labs/builderReducer';
import { ADD_LABEL, connectMessage, sanitizePalette } from '@/labs/builderText';
import { DevicePanel } from '@/labs/DevicePanel';
import { evaluateLab, type LabTask } from '@/labs/labTasks';
import { TaskChecklist } from '@/labs/TaskChecklist';
import { TerminalLab } from '@/labs/TerminalLab';
import type { DeviceKind, Network } from '@/netcore/network';
import type { TerminalOs } from '@/netcore/terminal';
import styles from './BuilderLab.module.css';

type BuilderLabProps = {
  /** Starting network. Repaired first if it is malformed. */
  initial?: Network;
  tasks: LabTask[];
  /** Which devices the learner may add. Unknown kinds and repeats are ignored. */
  palette: DeviceKind[];
  os?: TerminalOs;
  /** Called once, the first time every task is done (also at mount if `initial` already passes). */
  onAllDone?: () => void;
  /** Called whenever the network changes (not at mount). */
  onChange?: (net: Network) => void;
};

const EMPTY: Network = { devices: [], links: [] };

/**
 * The network builder: add computers, switches and servers, cable them up,
 * give them addresses, open a practice terminal and tick off the goals.
 * Everything is a simulation; it never touches the real network.
 */
export function BuilderLab({
  initial,
  tasks,
  palette,
  os = 'windows',
  onAllDone,
  onChange,
}: BuilderLabProps) {
  const [net, dispatch] = useReducer(builderReducer, initial, (start) =>
    normalizeNetwork(start ?? EMPTY),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const kinds = useMemo(() => sanitizePalette(palette), [palette]);
  const results = useMemo(() => evaluateLab(tasks, net), [tasks, net]);
  const allDone = results.length > 0 && results.every((r) => r.done);
  const full = net.devices.length >= MAX_DEVICES;

  const selected = net.devices.find((d) => d.id === selectedId);
  const connectingFrom = net.devices.find((d) => d.id === connectingId);
  const terminalDevice = net.devices.find(
    (d) => d.id === terminalId && d.kind !== 'switch',
  );
  const nameOf = (id: string) =>
    net.devices.find((d) => d.id === id)?.name ?? id;

  // Callbacks are read through refs so a new function identity never re-fires them.
  const onAllDoneRef = useRef(onAllDone);
  const onChangeRef = useRef(onChange);
  const announced = useRef(false);
  const lastNet = useRef(net);
  useEffect(() => {
    onAllDoneRef.current = onAllDone;
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (allDone && !announced.current) {
      announced.current = true;
      onAllDoneRef.current?.();
    }
  }, [allDone]);
  useEffect(() => {
    if (lastNet.current === net) return;
    lastNet.current = net;
    onChangeRef.current?.(net);
  }, [net]);

  function addDevice(kind: DeviceKind) {
    const action = {
      type: 'addDevice',
      kind,
      ...nextFreePosition(net),
    } as const;
    const next = builderReducer(net, action);
    const added = next.devices[next.devices.length - 1];
    dispatch(action);
    if (next === net || added === undefined) return;
    setSelectedId(added.id);
    setConnectingId(null);
    setStatus(`Added ${added.name}.`);
  }

  function activate(id: string) {
    if (connectingFrom !== undefined) {
      setConnectingId(null);
      if (id === connectingFrom.id) {
        setStatus('Cancelled. No cable was added.');
        return;
      }
      const check = canConnect(net, connectingFrom.id, id);
      if (check.ok) dispatch({ type: 'connect', a: connectingFrom.id, b: id });
      setStatus(connectMessage(check, connectingFrom.name, nameOf(id)));
      return;
    }
    setSelectedId(id);
    setStatus(
      `Selected ${nameOf(id)}. You can change its settings in the panel.`,
    );
  }

  function cancelConnecting() {
    if (connectingFrom === undefined) return;
    setConnectingId(null);
    setStatus('Cancelled. No cable was added.');
  }

  function removeDevice(id: string) {
    const name = nameOf(id);
    dispatch({ type: 'removeDevice', id });
    setSelectedId(null);
    setConnectingId(null);
    setTerminalId((open) => (open === id ? null : open));
    setStatus(`Removed ${name} and its cables.`);
  }

  function removeCable(linkId: string) {
    const link = net.links.find((l) => l.id === linkId);
    dispatch({ type: 'disconnect', linkId });
    if (link !== undefined) {
      setStatus(
        `Removed the cable between ${nameOf(link.a)} and ${nameOf(link.b)}.`,
      );
    }
  }

  const cables =
    selected === undefined
      ? []
      : net.links
          .filter((l) => l.a === selected.id || l.b === selected.id)
          .map((l) => ({
            id: l.id,
            otherName: nameOf(l.a === selected.id ? l.b : l.a),
          }));

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Escape from any focused control inside cancels connecting; the region itself is not a control
    <section
      className={styles.lab}
      aria-label="Network builder"
      onKeyDown={(event) => {
        if (event.key === 'Escape') cancelConnecting();
      }}
    >
      <p className={styles.safety}>
        Everything here is a simulation. Nothing you do touches your real
        network.
      </p>

      <div className={styles.toolbar}>
        {kinds.length === 0 ? (
          <p className={styles.note}>This lab has no devices to add.</p>
        ) : (
          kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              className={styles.button}
              disabled={full}
              onClick={() => {
                addDevice(kind);
              }}
            >
              {ADD_LABEL[kind]}
            </button>
          ))
        )}
      </div>
      {full ? (
        <p className={styles.note}>
          The canvas holds up to {MAX_DEVICES} devices. Remove one to add
          another.
        </p>
      ) : null}
      <p className={styles.hint}>
        Select a device to set its address. To run a cable, select a device,
        press its Connect button, then pick the second device. Drag a device to
        move it, or hold Shift and press an arrow key. Press Escape to cancel.
      </p>
      <p role="status" className={styles.status}>
        {connectingFrom === undefined
          ? status
          : `Now pick the device to connect to ${connectingFrom.name}.`}
      </p>

      <div className={styles.layout}>
        <div className={styles.canvasWrap}>
          <BuilderCanvas
            net={net}
            selectedId={selected?.id ?? null}
            connectingFromId={connectingFrom?.id ?? null}
            onActivate={activate}
            onMove={(id, x, y) => {
              dispatch({ type: 'moveDevice', id, x, y });
            }}
          />
          {net.devices.length === 0 ? (
            <p className={styles.empty}>
              {kinds.includes('pc')
                ? 'Add a computer to get started.'
                : 'Add a device to get started.'}
            </p>
          ) : null}
        </div>
        <div className={styles.side}>
          <TaskChecklist results={results} />
          {selected === undefined ? (
            <p className={styles.note}>
              Select a device on the canvas to set its address, connect it or
              open a terminal.
            </p>
          ) : (
            <DevicePanel
              key={selected.id}
              device={selected}
              cables={cables}
              connecting={connectingFrom !== undefined}
              terminalOpen={terminalDevice?.id === selected.id}
              onConfig={(ip, mask, gateway) => {
                dispatch({
                  type: 'setConfig',
                  id: selected.id,
                  ip,
                  mask,
                  gateway,
                });
              }}
              onStartConnect={() => {
                setConnectingId(selected.id);
              }}
              onCancelConnect={cancelConnecting}
              onRemoveCable={removeCable}
              onRemoveDevice={() => {
                removeDevice(selected.id);
              }}
              onToggleTerminal={() => {
                setTerminalId(
                  terminalDevice?.id === selected.id ? null : selected.id,
                );
              }}
            />
          )}
        </div>
      </div>

      {terminalDevice === undefined ? null : (
        <section
          className={styles.card}
          aria-label={`Terminal on ${terminalDevice.name}`}
        >
          <h3 className={styles.cardTitle}>
            Terminal on {terminalDevice.name}
          </h3>
          <TerminalLab
            key={terminalDevice.id}
            net={net}
            hostId={terminalDevice.id}
            os={os}
          />
        </section>
      )}
    </section>
  );
}
