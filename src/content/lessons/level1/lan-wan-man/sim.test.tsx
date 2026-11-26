import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { describeStep, scopeSteps } from './logic';
import { ScopeDiagram } from './scopeDiagram';

const [earbuds, , campus, , world] = scopeSteps;
if (earbuds === undefined || campus === undefined || world === undefined) {
  throw new Error('missing steps');
}

describe('ScopeDiagram', () => {
  it('changes its text alternative with the step', () => {
    const { rerender } = render(
      <ScopeDiagram step={earbuds} reducedMotion={false} compact={false} />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /Now showing: Earbuds and phone, a PAN \(personal area network\)\. Rings reached so far: PAN\.$/,
    );
    rerender(
      <ScopeDiagram step={world} reducedMotion={false} compact={false} />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(
      /Now showing: Different countries, a WAN \(wide area network\)\. Rings reached so far: PAN, LAN, MAN, WAN\.$/,
    );
  });

  it('says the campus step is still a LAN', () => {
    expect(describeStep(campus)).toContain('a LAN (local area network)');
    expect(describeStep(campus)).toContain('Rings reached so far: PAN, LAN.');
  });

  it('marks exactly one ring as current, and the earlier ones as reached', () => {
    const { container } = render(
      <ScopeDiagram step={campus} reducedMotion compact={false} />,
    );
    expect(container.querySelectorAll('.ring.now')).toHaveLength(1);
    expect(container.querySelectorAll('.ring.reached')).toHaveLength(1);
    expect(container.querySelectorAll('.ring.future')).toHaveLength(2);
  });

  it('draws bands instead of rings on a phone, with a marker on the current one', () => {
    const { container } = render(
      <ScopeDiagram step={campus} reducedMotion compact />,
    );
    expect(container.querySelectorAll('circle')).toHaveLength(0);
    expect(container.querySelectorAll('.band')).toHaveLength(4);
    expect(container.querySelector('.now')?.textContent).toContain('▶ LAN');
  });

  it('animates only when motion is allowed', () => {
    const { container, rerender } = render(
      <ScopeDiagram step={earbuds} reducedMotion={false} compact={false} />,
    );
    expect(container.firstElementChild).toHaveClass('animated');
    rerender(<ScopeDiagram step={earbuds} reducedMotion compact={false} />);
    expect(container.firstElementChild).not.toHaveClass('animated');
  });

  it.each([false, true])(
    'has no axe violations (compact: %s)',
    async (compact) => {
      const { container } = render(
        <ScopeDiagram step={world} reducedMotion compact={compact} />,
      );
      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
