import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { SwitchingTimes } from './try';

describe('SwitchingTimes (try-it)', () => {
  it('starts at 8 KB, 3 links and 0.2 seconds of setup, with all three times', () => {
    render(<SwitchingTimes />);
    expect(screen.getByLabelText('Message size')).toHaveValue('8');
    expect(
      screen.getByRole('slider', { name: 'Links in a row (hops)' }),
    ).toHaveValue('3');
    expect(screen.getByLabelText('Circuit setup time')).toHaveValue('0.2');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      'Fastest here: packet switching, 0.08 seconds.',
    );
    expect(
      screen.getByText(/Circuit switching: 0.264 seconds/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Message switching: 0.192 seconds/),
    ).toBeInTheDocument();
  });

  it('with no setup the circuit wins over several links', () => {
    render(<SwitchingTimes />);
    fireEvent.change(screen.getByLabelText('Circuit setup time'), {
      target: { value: '0' },
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Fastest here: circuit switching, 0.064 seconds.',
    );
  });

  it('with one link packets and whole messages tie', () => {
    render(<SwitchingTimes />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } });
    expect(screen.getByRole('status')).toHaveTextContent(
      'packet switching and message switching tie at 0.064 seconds',
    );
    expect(screen.getByRole('status')).toHaveTextContent('crosses 1 link,');
  });

  it('a bigger message changes the packet count and the times', () => {
    render(<SwitchingTimes />);
    fireEvent.change(screen.getByLabelText('Message size'), {
      target: { value: '50' },
    });
    expect(screen.getByText(/so 50 KB is/)).toHaveTextContent('50 packets');
    // (50 + 3 - 1) packets times 0.008 seconds
    expect(
      screen.getByText(/Packet switching: 0.416 seconds/),
    ).toBeInTheDocument();
  });

  it('is operable with native controls and states what the model leaves out', () => {
    render(<SwitchingTimes />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '10');
    expect(screen.getByLabelText('Message size').tagName).toBe('SELECT');
    expect(screen.getByText(/leaves out packet headers/)).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<SwitchingTimes />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
