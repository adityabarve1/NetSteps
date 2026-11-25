import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SimPlayer } from '@/sim/SimPlayer';
import {
  caption,
  fourSteps,
  renderStep,
  type TestStep,
} from '@/sim/simTestKit';

function setup(steps: TestStep[] = fourSteps, stepMs?: number) {
  return render(
    <SimPlayer<TestStep>
      id="sim-p"
      steps={steps}
      caption={caption}
      render={renderStep}
      stepMs={stepMs}
    />,
  );
}

const button = (name: string) => screen.getByRole('button', { name });

describe('SimPlayer focus hand-off from the keyboard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves focus to Play when End disables the focused Next button', async () => {
    const user = userEvent.setup();
    setup();
    button('Next').focus();
    await user.keyboard('{End}');
    expect(button('Next')).toBeDisabled();
    expect(document.activeElement).toBe(button('Play again'));
  });

  it('moves focus to Play when ArrowRight reaches the last step from Next', async () => {
    const user = userEvent.setup();
    setup();
    button('Next').focus();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(button('Next')).toBeDisabled();
    expect(document.activeElement).toBe(button('Play again'));
  });

  it('moves focus to Next when Home disables the focused Back button', async () => {
    const user = userEvent.setup();
    setup();
    button('Next').focus();
    await user.keyboard('{ArrowRight}');
    button('Back').focus();
    await user.keyboard('{Home}');
    expect(button('Back')).toBeDisabled();
    expect(document.activeElement).toBe(button('Next'));
  });

  it('does not steal focus from the speed menu or the group', async () => {
    const user = userEvent.setup();
    setup();
    const group = screen.getByRole('group');
    group.focus();
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(group);
  });

  it('ignores arrow keys typed in a textarea or an editable element', () => {
    render(
      <SimPlayer<TestStep>
        id="sim-t"
        steps={fourSteps}
        caption={caption}
        render={(step) => (
          <div>
            <textarea aria-label="Notes" />
            <div contentEditable suppressContentEditableWarning>
              {`edit ${String(step.n)}`}
            </div>
          </div>
        )}
      />,
    );
    const editable = screen.getByText('edit 0');
    fireEvent.keyDown(screen.getByLabelText('Notes'), { key: 'ArrowRight' });
    fireEvent.keyDown(editable, { key: 'ArrowRight' });
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });
});

describe('SimPlayer with one step', () => {
  it('disables Play and Reset, with a sensible name', () => {
    setup([{ n: 0 }]);
    expect(button('Play')).toBeDisabled();
    expect(button('Reset')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Play again' })).toBeNull();
  });

  it('keeps Play enabled with two steps', () => {
    setup([{ n: 0 }, { n: 1 }]);
    expect(button('Play')).toBeEnabled();
    expect(button('Reset')).toBeEnabled();
  });
});

describe('SimPlayer stepMs validation', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([NaN, 0, -5, Infinity])(
    'falls back to 1800 ms for stepMs=%s',
    (stepMs) => {
      vi.useFakeTimers();
      setup(fourSteps, stepMs);
      fireEvent.click(button('Play'));
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(1799);
      });
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    },
  );
});
