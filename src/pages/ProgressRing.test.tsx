import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ProgressRing } from '@/pages/ProgressRing';

describe('ProgressRing', () => {
  it('shows done/total in the centre and a matching accessible name', () => {
    render(<ProgressRing done={1} total={6} />);

    const ring = screen.getByRole('img', { name: '1 of 6 lessons done' });
    expect(ring).toHaveTextContent('1/6');
  });

  it('uses the singular for a total of one', () => {
    render(<ProgressRing done={1} total={1} />);

    expect(
      screen.getByRole('img', { name: '1 of 1 lesson done' }),
    ).toBeInTheDocument();
  });

  it('is an empty ring with 0/0 when there is nothing to do, with no NaN', () => {
    const { container } = render(<ProgressRing done={0} total={0} />);

    expect(screen.getByRole('img')).toHaveTextContent('0/0');
    expect(container.innerHTML).not.toContain('NaN');
    expect(container.innerHTML).not.toContain('Infinity');
  });

  it.each([
    [9, 6, '6/6'],
    [-3, 6, '0/6'],
    [Number.NaN, 6, '0/6'],
    [2, Number.NaN, '0/0'],
    [2, -4, '0/0'],
    [Number.POSITIVE_INFINITY, 4, '0/4'],
    [1.7, 6, '1/6'],
  ])('sanitises done=%s total=%s to %s', (done, total, text) => {
    const { container } = render(<ProgressRing done={done} total={total} />);

    expect(screen.getByRole('img')).toHaveTextContent(text);
    expect(container.innerHTML).not.toContain('NaN');
  });

  it('draws the fill in proportion to the share done', () => {
    const { container } = render(<ProgressRing done={1} total={4} />);

    const fill = container.querySelector('[data-ring-fill]');
    const length = Number(fill?.getAttribute('data-ring-length'));
    const dash = String(fill?.getAttribute('stroke-dasharray')).split(' ');
    expect(Number(dash[0])).toBeCloseTo(length / 4, 3);
  });

  it('draws a full ring when everything is done', () => {
    const { container } = render(<ProgressRing done={6} total={6} />);

    const fill = container.querySelector('[data-ring-fill]');
    const length = Number(fill?.getAttribute('data-ring-length'));
    const dash = String(fill?.getAttribute('stroke-dasharray')).split(' ');
    expect(Number(dash[0])).toBeCloseTo(length, 3);
  });

  it('lets the caller name the ring', () => {
    render(<ProgressRing done={1} total={6} label="Level 1 progress" />);

    expect(
      screen.getByRole('img', {
        name: 'Level 1 progress: 1 of 6 lessons done',
      }),
    ).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<ProgressRing done={2} total={6} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
