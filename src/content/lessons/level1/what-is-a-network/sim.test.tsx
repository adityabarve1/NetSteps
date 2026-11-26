import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { JourneyDiagram } from './sim';

// Tests use non-scoped CSS module names (vite.config.ts), so the class names
// are the plain names from sim.module.css.
const step = { caption: 'x', at: ['pc1', 'sw1'] };

describe('JourneyDiagram', () => {
  it('names the message holder and the lit link in its picture label', () => {
    render(<JourneyDiagram step={step} reducedMotion={false} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Diagram: PC1, switch SW1 and PC2 in a row, joined by two links. The message is at SW1. The link from PC1 to SW1 is lit up.',
    );
  });

  it('animates the message marker only when motion is allowed', () => {
    const { container, rerender } = render(
      <JourneyDiagram step={step} reducedMotion={false} />,
    );
    const marker = () => container.querySelector('.message');
    expect(marker()).toHaveClass('moving');

    rerender(<JourneyDiagram step={step} reducedMotion={true} />);
    expect(marker()).not.toHaveClass('moving');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <JourneyDiagram step={{ caption: 'x', at: ['pc1'] }} reducedMotion />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
