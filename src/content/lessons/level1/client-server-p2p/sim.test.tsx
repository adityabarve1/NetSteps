import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { DistributionDiagram } from './sim';
import { distributionSteps } from './steps';

// Tests use non-scoped CSS module names (vite.config.ts), so the class names
// are the plain names from sim.module.css.
const steps = distributionSteps();
const at = (i: number) => {
  const s = steps[i];
  if (s === undefined) throw new Error('no step');
  return s;
};

describe('DistributionDiagram', () => {
  it('names the picture with the step label', () => {
    render(<DistributionDiagram step={at(2)} reducedMotion={false} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Diagram: one server and 10 clients. The server sends a separate copy of the file to each client. Time: 80 seconds. The limit is the server’s upload speed.',
    );
  });

  it('draws one arrow per client and no dashed peer lines in client-server', () => {
    const { container } = render(
      <DistributionDiagram step={at(1)} reducedMotion={false} />,
    );
    expect(container.querySelectorAll('.serverLine')).toHaveLength(5);
    expect(container.querySelectorAll('.peerLine')).toHaveLength(0);
    expect(container.querySelectorAll('.client')).toHaveLength(5);
  });

  it('draws dashed peer lines between neighbours in peer-to-peer', () => {
    const { container } = render(
      <DistributionDiagram step={at(5)} reducedMotion={false} />,
    );
    // 10 peers in a column: one curve between each neighbour.
    expect(container.querySelectorAll('.peerLine')).toHaveLength(9);
    expect(container.querySelectorAll('.thinLine')).toHaveLength(10);
    expect(container.querySelectorAll('.serverLine')).toHaveLength(0);
  });

  it('in the compact layout the peers form a grid of 13 dashed links', () => {
    const { container } = render(
      <DistributionDiagram step={at(5)} reducedMotion={false} compact />,
    );
    // Two rows of 5: 8 links along the rows and 5 across.
    expect(container.querySelectorAll('.peerLine')).toHaveLength(13);
  });

  it('a single peer has no peer lines', () => {
    const { container } = render(
      <DistributionDiagram step={at(3)} reducedMotion={false} />,
    );
    expect(container.querySelectorAll('.peerLine')).toHaveLength(0);
  });

  it('shows two bars in the comparison step, one otherwise', () => {
    const one = render(
      <DistributionDiagram step={at(0)} reducedMotion={false} />,
    );
    expect(one.container.querySelectorAll('.bar')).toHaveLength(1);
    one.unmount();
    const two = render(
      <DistributionDiagram step={at(6)} reducedMotion={false} />,
    );
    expect(two.container.querySelectorAll('.bar')).toHaveLength(2);
    expect(two.container.querySelectorAll('.barPeer')).toHaveLength(1);
    expect(screen.getByText('Client-server: 80 seconds')).toBeInTheDocument();
    expect(screen.getByText('Peer-to-peer: 40 seconds')).toBeInTheDocument();
  });

  it('bars are in proportion: 40 seconds is half of 80', () => {
    const { container } = render(
      <DistributionDiagram step={at(6)} reducedMotion={false} />,
    );
    const [a, b] = Array.from(container.querySelectorAll('.bar')).map((r) =>
      Number(r.getAttribute('width')),
    );
    expect(a).toBe(360);
    expect(b).toBe(180);
  });

  it('animates the arrows only when motion is allowed', () => {
    const { container, rerender } = render(
      <DistributionDiagram step={at(1)} reducedMotion={false} />,
    );
    expect(container.querySelector('.serverLine')).toHaveClass('flow');
    rerender(<DistributionDiagram step={at(1)} reducedMotion={true} />);
    expect(container.querySelector('.serverLine')).not.toHaveClass('flow');
  });

  it('uses a taller drawing in the compact layout and keeps the same words', () => {
    const { container } = render(
      <DistributionDiagram step={at(2)} reducedMotion compact />,
    );
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(
      '0 0 260 234',
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(/10 clients/);
  });

  it.each([0, 1, 2, 3, 4, 5, 6])('step %i has no axe violations', async (i) => {
    const { container } = render(
      <DistributionDiagram step={at(i)} reducedMotion />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
