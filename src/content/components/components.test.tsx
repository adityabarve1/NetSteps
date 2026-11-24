import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { GoDeeper } from './GoDeeper';
import { LessonSection } from './LessonSection';
import { TableOfContents } from './TableOfContents';

const sections = [
  { id: 'what-it-is', title: 'What a network is' },
  { id: 'why-it-exists', title: 'Why networks exist' },
  { id: 'how-it-works', title: 'How a message travels' },
];

describe('LessonSection', () => {
  it('renders a labelled section with an h2 and an anchor id', () => {
    render(
      <LessonSection id="what-it-is" title="What a network is">
        <p>Body text.</p>
      </LessonSection>,
    );
    const region = screen.getByRole('region', { name: 'What a network is' });
    expect(region).toHaveAttribute('id', 'what-it-is');
    expect(
      within(region).getByRole('heading', {
        level: 2,
        name: 'What a network is',
      }),
    ).toBeInTheDocument();
    expect(within(region).getByText('Body text.')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <LessonSection id="a" title="A section">
        <p>Body text.</p>
      </LessonSection>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('GoDeeper', () => {
  const setup = () => {
    const user = userEvent.setup();
    const view = render(
      <GoDeeper title="Header fields">
        <p>Twenty bytes of detail.</p>
      </GoDeeper>,
    );
    return { user, ...view };
  };
  const toggle = () => screen.getByRole('button', { name: /Header fields/ });

  it('is collapsed by default and says so', () => {
    setup();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Twenty bytes of detail.')).not.toBeVisible();
  });

  it('names itself as a "Go deeper" block with its title', () => {
    setup();
    expect(toggle()).toHaveAccessibleName(/Go deeper.*Header fields/);
  });

  it('opens and closes on click, and aria-controls points at the content', async () => {
    const { user } = setup();
    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    const content = screen.getByText('Twenty bytes of detail.');
    expect(content).toBeVisible();
    expect(
      document.getElementById(toggle().getAttribute('aria-controls') ?? ''),
    ).toContainElement(content);
    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(content).not.toBeVisible();
  });

  it('is operable from the keyboard with Enter and Space', async () => {
    const { user } = setup();
    await user.tab();
    expect(toggle()).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Twenty bytes of detail.')).toBeVisible();
    await user.keyboard(' ');
    expect(screen.getByText('Twenty bytes of detail.')).not.toBeVisible();
    await user.keyboard('{Enter}');
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('has no axe violations closed or open, inside a section', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LessonSection id="s" title="A section">
        <GoDeeper title="Header fields">
          <p>Twenty bytes of detail.</p>
        </GoDeeper>
      </LessonSection>,
    );
    expect(await axe(container)).toHaveNoViolations();
    await user.click(toggle());
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('TableOfContents', () => {
  it('lists every section title as an anchor link to its id', () => {
    render(<TableOfContents sections={sections} />);
    const nav = screen.getByRole('navigation', { name: /in this lesson/i });
    const links = within(nav).getAllByRole('link');
    expect(links.map((a) => a.textContent)).toEqual(
      sections.map((s) => s.title),
    );
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '#what-it-is',
      '#why-it-exists',
      '#how-it-works',
    ]);
  });

  it('marks only the active section with aria-current="true"', () => {
    render(<TableOfContents sections={sections} activeId="why-it-exists" />);
    const current = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'true');
    expect(current.map((a) => a.textContent)).toEqual(['Why networks exist']);
    for (const link of screen.getAllByRole('link')) {
      if (link.textContent !== 'Why networks exist') {
        expect(link).not.toHaveAttribute('aria-current');
      }
    }
  });

  it('moves the marker when activeId changes', () => {
    const { rerender } = render(
      <TableOfContents sections={sections} activeId="what-it-is" />,
    );
    rerender(<TableOfContents sections={sections} activeId="how-it-works" />);
    expect(
      screen.getByRole('link', { name: 'How a message travels' }),
    ).toHaveAttribute('aria-current', 'true');
    expect(
      screen.getByRole('link', { name: 'What a network is' }),
    ).not.toHaveAttribute('aria-current');
  });

  it('marks nothing without an activeId or with an unknown one', () => {
    const { rerender } = render(<TableOfContents sections={sections} />);
    expect(document.querySelector('[aria-current]')).toBeNull();
    rerender(<TableOfContents sections={sections} activeId="nope" />);
    expect(document.querySelector('[aria-current]')).toBeNull();
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<TableOfContents sections={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('has no axe violations, with and without an active section', async () => {
    const { container, rerender } = render(
      <TableOfContents sections={sections} />,
    );
    expect(await axe(container)).toHaveNoViolations();
    rerender(<TableOfContents sections={sections} activeId="how-it-works" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
