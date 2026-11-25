import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Term } from './Term';

vi.mock('@/content/glossary', () => ({
  glossary: {
    packet: {
      term: 'packet',
      definition: 'A small piece of data sent over a network.',
    },
  },
}));

const DEFINITION = 'A small piece of data sent over a network.';
const button = () => screen.getByRole('button', { name: 'packet' });

describe('Term: Escape', () => {
  it('returns focus to the button when focus already fell to the page', async () => {
    const user = userEvent.setup();
    render(
      <p>
        a <Term id="packet">packet</Term>
      </p>,
    );
    await user.click(button());
    button().blur();
    expect(document.body).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(button()).toHaveAttribute('aria-expanded', 'false');
    expect(button()).toHaveFocus();
  });

  it('does not steal focus that went to another control', async () => {
    const user = userEvent.setup();
    render(
      <p>
        a <Term id="packet">packet</Term> <input aria-label="Other" />
      </p>,
    );
    await user.click(button());
    await user.click(screen.getByLabelText('Other'));
    await user.keyboard('{Escape}');
    expect(screen.getByLabelText('Other')).toHaveFocus();
  });

  it('marks the key as handled so an outer dialog can ignore it', async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    document.addEventListener('keydown', outer);
    render(
      <p>
        a <Term id="packet">packet</Term>
      </p>,
    );
    await user.click(button());
    const proceed = fireEvent.keyDown(button(), { key: 'Escape' });
    document.removeEventListener('keydown', outer);
    expect(proceed).toBe(false);
  });

  it('ignores an Escape that something else already handled', async () => {
    const user = userEvent.setup();
    render(
      <p>
        a <Term id="packet">packet</Term>
      </p>,
    );
    await user.click(button());
    const first = (event: KeyboardEvent) => {
      event.preventDefault();
    };
    // Capture phase on window runs before the Term's document listener.
    window.addEventListener('keydown', first, true);
    fireEvent.keyDown(button(), { key: 'Escape' });
    window.removeEventListener('keydown', first, true);
    expect(button()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(DEFINITION)).toBeVisible();
  });
});
