import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Term } from './Term';

// A small stand-in glossary, so the tests never depend on (or add to) the real one.
vi.mock('@/content/glossary', () => ({
  glossary: {
    packet: {
      term: 'packet',
      definition: 'A small piece of data sent over a network.',
    },
    router: {
      term: 'router',
      definition: 'A device that passes packets between networks.',
    },
    markup: {
      term: 'markup',
      definition: 'Use <b>bold</b> and <img src=x onerror=alert(1)> here.',
    },
  },
}));

const PACKET = 'A small piece of data sent over a network.';

function setup(ui = <Term id="packet">packet</Term>) {
  const user = userEvent.setup();
  return { user, ...render(<p>Your computer sends a {ui} to a friend.</p>) };
}

const button = () => screen.getByRole('button', { name: 'packet' });

describe('Term: a known term', () => {
  it('shows a closed button and no definition at first', () => {
    setup();
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(PACKET)).not.toBeVisible();
  });

  it('opens on click, linked to the definition by aria-controls', async () => {
    const { user } = setup();
    await user.click(button());
    expect(button()).toHaveAttribute('aria-expanded', 'true');
    const definition = screen.getByText(PACKET);
    expect(definition).toBeVisible();
    expect(button().getAttribute('aria-controls')).toBe(definition.id);
    expect(definition.id).not.toBe('');
  });

  it('closes when clicked a second time', async () => {
    const { user } = setup();
    await user.click(button());
    await user.click(button());
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(PACKET)).not.toBeVisible();
  });

  it('opens and closes with Enter and with Space', async () => {
    const { user } = setup();
    await user.tab();
    expect(button()).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText(PACKET)).toBeVisible();
    await user.keyboard('{Enter}');
    expect(screen.getByText(PACKET)).not.toBeVisible();
    await user.keyboard(' ');
    expect(screen.getByText(PACKET)).toBeVisible();
    await user.keyboard(' ');
    expect(screen.getByText(PACKET)).not.toBeVisible();
  });

  it('closes on Escape, with focus on the button', async () => {
    const { user } = setup();
    await user.click(button());
    await user.keyboard('{Escape}');
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(PACKET)).not.toBeVisible();
    expect(button()).toHaveFocus();
  });

  it('closes on Escape even after focus has left the button', async () => {
    const { user } = setup();
    await user.click(button());
    button().blur();
    expect(screen.getByText(PACKET)).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.getByText(PACKET)).not.toBeVisible();
  });

  it('closes on a click outside, but not on a click inside the definition', async () => {
    const { user } = setup();
    await user.click(button());
    await user.click(screen.getByText(PACKET));
    expect(screen.getByText(PACKET)).toBeVisible();
    await user.click(document.body);
    expect(screen.getByText(PACKET)).not.toBeVisible();
  });

  it('closes when keyboard focus moves to another control', async () => {
    const { user } = setup(
      <>
        <Term id="packet">packet</Term> <a href="#next">next</a>
      </>,
    );
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByText(PACKET)).toBeVisible();
    await user.tab();
    expect(screen.getByRole('link', { name: 'next' })).toHaveFocus();
    expect(screen.getByText(PACKET)).not.toBeVisible();
  });

  it('opens again after it was closed with Escape', async () => {
    const { user } = setup();
    await user.click(button());
    await user.keyboard('{Escape}');
    await user.keyboard('{Enter}');
    expect(screen.getByText(PACKET)).toBeVisible();
  });

  it('shows one definition at a time', async () => {
    const { user } = setup(
      <>
        <Term id="packet">packet</Term> and <Term id="router">router</Term>
      </>,
    );
    await user.click(button());
    await user.click(screen.getByRole('button', { name: 'router' }));
    expect(screen.getByText(PACKET)).not.toBeVisible();
    expect(
      screen.getByText('A device that passes packets between networks.'),
    ).toBeVisible();
  });

  it('keeps the text the lesson wrote, not the glossary term', () => {
    setup(<Term id="packet">packets</Term>);
    expect(screen.getByRole('button', { name: 'packets' })).toBeInTheDocument();
  });

  it('shows the definition as plain text, never as markup', async () => {
    const { user, container } = setup(<Term id="markup">markup</Term>);
    await user.click(screen.getByRole('button', { name: 'markup' }));
    expect(
      screen.getByText(
        'Use <b>bold</b> and <img src=x onerror=alert(1)> here.',
      ),
    ).toBeVisible();
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('Term: an unknown term', () => {
  it('renders its children as plain text, with no button', () => {
    setup(<Term id="no-such-term">mystery</Term>);
    expect(
      screen.getByText(/Your computer sends a mystery to a friend/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('never throws, even for built-in object names or an empty id', () => {
    for (const id of ['constructor', '__proto__', 'toString', '']) {
      expect(() => render(<Term id={id}>word</Term>), id).not.toThrow();
    }
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Term: accessibility', () => {
  it('has no axe violations closed or open', async () => {
    const { user, container } = setup();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(button());
    expect(await axe(container)).toHaveNoViolations();
  });
});
