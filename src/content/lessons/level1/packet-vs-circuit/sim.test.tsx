import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { SwitchingDiagram } from './sim';
import { switchingSteps } from './steps';

// Tests use non-scoped CSS module names (vite.config.ts), so the class names
// are the plain names from sim.module.css.
const steps = switchingSteps();
const at = (i: number) => {
  const s = steps[i];
  if (s === undefined) throw new Error('no step');
  return s;
};

describe('SwitchingDiagram', () => {
  it('names the picture with the step label', () => {
    render(<SwitchingDiagram step={at(0)} reducedMotion={false} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Diagram: your device, two routers and your friend’s device. Six numbered packets wait at your device. Nothing has been sent yet.',
    );
  });

  it('draws the four devices, four links and one square per packet', () => {
    const { container } = render(
      <SwitchingDiagram step={at(2)} reducedMotion={false} />,
    );
    expect(container.querySelectorAll('.device')).toHaveLength(2);
    expect(container.querySelectorAll('.router')).toHaveLength(2);
    expect(container.querySelectorAll('line')).toHaveLength(4);
    expect(container.querySelectorAll('.packet')).toHaveLength(6);
    // Route B squares are dashed (a second cue besides position).
    expect(container.querySelectorAll('.packetB')).toHaveLength(3);
  });

  it('puts packets that share a route at different points', () => {
    const { container } = render(
      <SwitchingDiagram step={at(2)} reducedMotion={false} />,
    );
    const spots = Array.from(container.querySelectorAll('.packet')).map(
      (r) => `${r.getAttribute('x') ?? ''},${r.getAttribute('y') ?? ''}`,
    );
    expect(new Set(spots).size).toBe(6);
  });

  it('shows the cross and the word broken only after the link breaks', () => {
    const before = render(
      <SwitchingDiagram step={at(6)} reducedMotion={false} />,
    );
    expect(before.container.querySelectorAll('.broken')).toHaveLength(0);
    expect(screen.queryByText('broken')).not.toBeInTheDocument();
    before.unmount();
    const after = render(
      <SwitchingDiagram step={at(7)} reducedMotion={false} />,
    );
    expect(after.container.querySelectorAll('.broken')).toHaveLength(1);
    expect(screen.getByText('broken')).toBeInTheDocument();
    expect(screen.getByText('Call dropped')).toBeInTheDocument();
  });

  it('marks the reserved route with words while a circuit is set up or active', () => {
    const { container, rerender } = render(
      <SwitchingDiagram step={at(5)} reducedMotion={false} />,
    );
    expect(screen.getByText('Reserved for one call')).toBeInTheDocument();
    expect(container.querySelectorAll('.reserved')).toHaveLength(2);
    expect(container.querySelectorAll('.flow')).toHaveLength(0);
    rerender(<SwitchingDiagram step={at(6)} reducedMotion={false} />);
    expect(container.querySelectorAll('.flow')).toHaveLength(2);
  });

  it('stops the moving dashes for reduced motion', () => {
    const { container } = render(
      <SwitchingDiagram step={at(6)} reducedMotion />,
    );
    expect(container.querySelectorAll('.reserved')).toHaveLength(2);
    expect(container.querySelectorAll('.flow')).toHaveLength(0);
  });

  it('uses a taller drawing in the compact layout and keeps the same words', () => {
    const { container } = render(
      <SwitchingDiagram step={at(4)} reducedMotion compact />,
    );
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe(
      '0 0 260 270',
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(/in order, 1 to 6/);
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])(
    'step %i has no axe violations',
    async (i) => {
      const { container } = render(
        <SwitchingDiagram step={at(i)} reducedMotion />,
      );
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
