import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TerminalLab } from '@/labs/TerminalLab';
import { labNet } from '@/netcore/terminal.fixtures';

const box = () => screen.getByLabelText<HTMLInputElement>('Command line');

describe('TerminalLab history keys', () => {
  it('recalls history with ArrowUp outside IME composition', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);
    await user.click(box());
    await user.paste('ipconfig');
    await user.keyboard('{Enter}{ArrowUp}');
    expect(box().value).toBe('ipconfig');
  });

  it('does nothing on ArrowUp or ArrowDown while an IME is composing', async () => {
    const user = userEvent.setup();
    render(<TerminalLab net={labNet()} hostId="pc1" os="windows" />);
    await user.click(box());
    await user.paste('ipconfig');
    await user.keyboard('{Enter}');
    await user.paste('draft');
    const up = fireEvent.keyDown(box(), { key: 'ArrowUp', isComposing: true });
    const down = fireEvent.keyDown(box(), {
      key: 'ArrowDown',
      isComposing: true,
    });
    expect(box().value).toBe('draft');
    // Not cancelled: the IME candidate list keeps its own arrow keys.
    expect(up).toBe(true);
    expect(down).toBe(true);
  });
});
