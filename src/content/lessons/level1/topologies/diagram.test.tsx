import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { TopologyDiagram } from './diagram';
import { communicatingNodes, makeTopology } from './logic';

// Tests use non-scoped CSS module names (vite.config.ts), so the class names
// are the plain names from diagram.module.css.
function draw(
  kind: 'bus' | 'star' | 'ring' | 'mesh',
  broken: { links: string[]; nodes: string[] },
  options: { compact?: boolean; label?: string } = {},
) {
  const topology = makeTopology(kind, kind === 'star' ? 6 : 5);
  return render(
    <TopologyDiagram
      topology={topology}
      broken={broken}
      ok={communicatingNodes(topology, broken)}
      compact={options.compact ?? false}
      reducedMotion={false}
      label={options.label}
    />,
  );
}

describe('TopologyDiagram', () => {
  it('marks a cut cable with a word and a cross, not only a colour', () => {
    const { container } = draw('star', { links: ['n0-n3'], nodes: [] });
    expect(screen.getByText('cut')).toBeInTheDocument();
    expect(container.querySelectorAll('.cross')).toHaveLength(1);
    expect(container.querySelectorAll('line.cut')).toHaveLength(1);
    expect(screen.getAllByText('cut off')).toHaveLength(1);
  });

  it('marks a broken device with the word "down" and a cross', () => {
    const { container } = draw('ring', { links: [], nodes: ['n2'] });
    expect(screen.getByText('down')).toBeInTheDocument();
    expect(container.querySelectorAll('.crossLine')).toHaveLength(1);
    // Everyone else is cut off in a single ring.
    expect(screen.getAllByText('cut off')).toHaveLength(4);
  });

  it('writes nothing under a device that can talk', () => {
    draw('mesh', { links: ['n0-n1'], nodes: [] });
    expect(screen.queryByText('cut off')).toBeNull();
    expect(screen.queryByText('down')).toBeNull();
    expect(screen.getByText('cut')).toBeInTheDocument();
  });

  it('keeps a bus backbone live beside a broken device, and none after a cut', () => {
    const down = draw('bus', { links: [], nodes: ['n2'] });
    expect(down.container.querySelectorAll('line.backbone.live')).toHaveLength(
      4,
    );
    down.unmount();
    const cutBus = draw('bus', { links: ['n1-n2'], nodes: [] });
    expect(
      cutBus.container.querySelectorAll('line.backbone.live'),
    ).toHaveLength(0);
  });

  it('gives the star hub a wider box than the other devices', () => {
    const { container } = draw('star', { links: [], nodes: [] });
    const widths = [...container.querySelectorAll('rect.box')].map((r) =>
      Number(r.getAttribute('width')),
    );
    expect(widths.filter((w) => w > 44)).toHaveLength(1);
  });

  it('is hidden from screen readers without a label, and named with one', () => {
    const hidden = draw('ring', { links: [], nodes: [] });
    expect(hidden.container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.queryByRole('img')).toBeNull();
    hidden.unmount();
    draw('ring', { links: [], nodes: [] }, { label: 'A ring of five' });
    expect(screen.getByRole('img')).toHaveAccessibleName('A ring of five');
  });

  it('draws the compact (tall) version for a phone', () => {
    const wide = draw('bus', { links: [], nodes: [] });
    expect(wide.container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 400 250',
    );
    wide.unmount();
    const compact = draw('bus', { links: [], nodes: [] }, { compact: true });
    expect(compact.container.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 280 320',
    );
  });

  it('has no axe violations in any shape', async () => {
    for (const kind of ['bus', 'star', 'ring', 'mesh'] as const) {
      const { container, unmount } = draw(
        kind,
        { links: [], nodes: ['n1'] },
        { label: `Diagram of a ${kind}` },
      );
      expect(await axe(container)).toHaveNoViolations();
      unmount();
    }
  });
});
