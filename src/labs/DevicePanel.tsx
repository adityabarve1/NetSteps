import { useId } from 'react';
import { KIND_NAME } from '@/labs/builderText';
import { cx } from '@/lib/cx';
import { parseIPv4, parseMask } from '@/netcore/ipv4';
import type { Device } from '@/netcore/network';
import styles from './BuilderLab.module.css';

export type PanelCable = { id: string; otherName: string };

type DevicePanelProps = {
  device: Device;
  cables: PanelCable[];
  connecting: boolean;
  terminalOpen: boolean;
  onConfig: (ip: string, mask: string, gateway: string) => void;
  onStartConnect: () => void;
  onCancelConnect: () => void;
  onRemoveCable: (linkId: string) => void;
  onRemoveDevice: () => void;
  onToggleTerminal: () => void;
};

type FieldProps = {
  label: string;
  value: string;
  example: string;
  invalidHint: string;
  valid: (value: string) => boolean;
  onChange: (value: string) => void;
};

// Generous: the box never cuts off a real address, and a hostile paste stays small.
const MAX_FIELD = 64;

function Field({
  label,
  value,
  example,
  invalidHint,
  valid,
  onChange,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const exampleId = `${id}-example`;
  const invalid = value !== '' && !valid(value);
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={MAX_FIELD}
        value={value}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${exampleId} ${hintId}` : exampleId}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <p id={exampleId} className={styles.fieldNote}>
        For example {example}
      </p>
      {invalid ? (
        <p id={hintId} className={styles.fieldError}>
          {invalidHint}
        </p>
      ) : null}
    </div>
  );
}

/** Settings for the selected device: address, cables, terminal and removal. */
export function DevicePanel({
  device,
  cables,
  connecting,
  terminalOpen,
  onConfig,
  onStartConnect,
  onCancelConnect,
  onRemoveCable,
  onRemoveDevice,
  onToggleTerminal,
}: DevicePanelProps) {
  const ip = device.ip ?? '';
  const mask = device.mask ?? '';
  const gateway = device.gateway ?? '';
  const isSwitch = device.kind === 'switch';
  return (
    <section className={styles.card} aria-label={`Settings for ${device.name}`}>
      <h3 className={styles.cardTitle}>
        {device.name}{' '}
        <span className={styles.kind}>({KIND_NAME[device.kind]})</span>
      </h3>
      <p className={styles.note}>
        Change its settings here, connect it to another device, or remove it.
      </p>
      {isSwitch ? (
        <p className={styles.note}>
          A switch has no address of its own. It passes traffic between the
          devices cabled to it.
        </p>
      ) : (
        <>
          <Field
            label="IP address"
            value={ip}
            example="192.168.1.10"
            invalidHint="That is not a valid IPv4 address yet. Use four numbers from 0 to 255 with dots between them."
            valid={(v) => parseIPv4(v) !== null}
            onChange={(v) => {
              onConfig(v, mask, gateway);
            }}
          />
          <Field
            label="Subnet mask"
            value={mask}
            example="255.255.255.0 or /24"
            invalidHint="That is not a valid subnet mask yet. Try 255.255.255.0 or /24."
            valid={(v) => parseMask(v) !== null}
            onChange={(v) => {
              onConfig(ip, v, gateway);
            }}
          />
          <Field
            label="Gateway (optional)"
            value={gateway}
            example="192.168.1.1"
            invalidHint="That is not a valid IPv4 address yet. Use four numbers from 0 to 255 with dots between them."
            valid={(v) => parseIPv4(v) !== null}
            onChange={(v) => {
              onConfig(ip, mask, v);
            }}
          />
        </>
      )}

      <div className={styles.buttons}>
        {connecting ? (
          <button
            type="button"
            className={styles.button}
            onClick={onCancelConnect}
          >
            Cancel connecting
          </button>
        ) : (
          <button
            type="button"
            className={styles.button}
            onClick={onStartConnect}
          >
            {`Connect ${device.name} to another device`}
          </button>
        )}
        {isSwitch ? null : (
          <button
            type="button"
            className={styles.button}
            aria-expanded={terminalOpen}
            onClick={onToggleTerminal}
          >
            {terminalOpen ? 'Close terminal' : 'Open terminal'}
          </button>
        )}
      </div>

      {cables.length > 0 ? (
        <ul className={styles.cableList}>
          {cables.map((cable) => (
            <li key={cable.id}>
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  onRemoveCable(cable.id);
                }}
              >
                {`Remove cable to ${cable.otherName}`}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        className={cx(styles.button, styles.danger)}
        onClick={onRemoveDevice}
      >
        Remove device
      </button>
    </section>
  );
}
