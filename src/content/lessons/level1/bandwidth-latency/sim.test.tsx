import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { TransferDiagram } from './sim';
import { transferSteps } from './steps';

// Tests use non-scoped CSS module names (vite.config.ts), so the class names
// are the plain names from sim.module.css.
const steps = transferSteps();
const at = (i: number) => {
  const s = steps[i];
  if (s === undefined) throw new Error('no step');
  return s;
};

function pipeSize(i: number) {
  const { container, unmount } = render(
    <TransferDiagram step={at(i)} reducedMotion />,
  );
  const pipe = container.querySelector('.pipe');
  const out = {
    h: Number(pipe?.getAttribute('height')),
    w: Number(pipe?.getAttribute('width')),
  };
  unmount();
  return out;
}

describe('TransferDiagram', () => {
  it('names the picture with the step label', () => {
    render(<TransferDiagram step={at(0)} reducedMotion={false} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Diagram: a file of 80 megabits crosses a pipe that carries 10 megabits per second, over a road with 50 milliseconds of delay. Sending takes 8 seconds, the delay is 0.05 seconds, and the total is 8.05 seconds.',
    );
  });

  it('writes the three numbers in words under the picture', () => {
    render(<TransferDiagram step={at(0)} reducedMotion={false} />);
    expect(
      screen.getByText(/Delay\s+\(latency\): 0\.05 s/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sending\s+\(bandwidth\): 8 s/),
    ).toBeInTheDocument();
    expect(screen.getByText('Total: 8.05 s')).toBeInTheDocument();
  });

  it('draws a thicker pipe for more bandwidth and a longer road for more delay', () => {
    // Step 0: 10 Mbps, 50 ms. Step 1: 100 Mbps, 50 ms. Step 4: 1000 Mbps, 100 ms.
    expect(pipeSize(1).h).toBeGreaterThan(pipeSize(0).h);
    expect(pipeSize(1).w).toBe(pipeSize(0).w);
    expect(pipeSize(4).w).toBeGreaterThan(pipeSize(0).w);
    // Step 3 has the same bandwidth as step 0 but a shorter road.
    expect(pipeSize(3).h).toBe(pipeSize(0).h);
    expect(pipeSize(3).w).toBeLessThan(pipeSize(0).w);
  });

  it('splits the bar by the delay share', () => {
    const { container } = render(
      <TransferDiagram step={at(2)} reducedMotion />,
    );
    const delay = container.querySelector<HTMLElement>('.delayPart');
    const send = container.querySelector<HTMLElement>('.sendPart');
    // Step 2: 0.05 of 0.13 seconds is about 38.5%.
    expect(parseFloat(delay?.style.width ?? '0')).toBeCloseTo(38.46, 1);
    expect(parseFloat(send?.style.width ?? '0')).toBeCloseTo(61.54, 1);
  });

  it('animates the data only when motion is allowed', () => {
    const { container, rerender } = render(
      <TransferDiagram step={at(0)} reducedMotion={false} />,
    );
    expect(container.querySelector('.dataLine')).toHaveClass('flow');
    rerender(<TransferDiagram step={at(0)} reducedMotion={true} />);
    expect(container.querySelector('.dataLine')).not.toHaveClass('flow');
  });

  it.each([0, 1, 2, 3, 4, 5, 6])('step %i has no axe violations', async (i) => {
    const { container } = render(
      <TransferDiagram step={at(i)} reducedMotion />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
