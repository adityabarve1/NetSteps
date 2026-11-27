import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { glossary } from '@/content/glossary';
import { KeyTerms } from '@/pages/KeyTerms';

describe('KeyTerms', () => {
  it('lists the lesson terms in the lesson order, from the shared glossary', () => {
    render(<KeyTerms ids={['protocol', 'network', 'link']} />);

    const aside = screen.getByRole('complementary', { name: 'Key terms' });
    const terms = within(aside)
      .getAllByRole('term')
      .map((dt) => dt.textContent);
    expect(terms).toEqual(['protocol', 'network', 'link']);
    const defs = within(aside)
      .getAllByRole('definition')
      .map((dd) => dd.textContent);
    expect(defs).toEqual([
      glossary.protocol?.definition,
      glossary.network?.definition,
      glossary.link?.definition,
    ]);
  });

  it('skips unknown ids silently, including object built-ins', () => {
    render(<KeyTerms ids={['network', 'no-such-term', 'constructor']} />);

    expect(screen.getAllByRole('term').map((dt) => dt.textContent)).toEqual([
      'network',
    ]);
  });

  it('renders nothing for an empty list or when no id is known', () => {
    const { container, rerender } = render(<KeyTerms ids={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<KeyTerms ids={['no-such-term']} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has a "Key terms" heading that names the region, one level-2 heading', () => {
    render(<KeyTerms ids={['network']} />);

    const heading = screen.getByRole('heading', { name: 'Key terms' });
    expect(heading.tagName).toBe('H2');
    expect(screen.getByRole('complementary')).toHaveAccessibleName('Key terms');
  });

  it('shows definitions as text, never as markup', () => {
    render(<KeyTerms ids={['network']} />);

    const dd = screen.getByRole('definition');
    expect(dd.children).toHaveLength(0);
  });

  it('is not a live region and has no axe violations', async () => {
    const { container } = render(<KeyTerms ids={['network', 'link']} />);

    expect(container.querySelector('[aria-live], [role="status"]')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });
});
