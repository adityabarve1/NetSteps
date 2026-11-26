import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { WaitTimes } from './try';

describe('WaitTimes (try-it)', () => {
  it('starts at 10 computers with both times and their limits', () => {
    render(<WaitTimes />);
    const slider = screen.getByRole('slider', {
      name: 'Computers asking for the file',
    });
    expect(slider).toHaveValue('10');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      'Client-server: 80 seconds, set by the server’s upload speed.',
    );
    expect(status).toHaveTextContent(
      'Peer-to-peer: 40 seconds, set by how much the peers can upload together.',
    );
    expect(status).toHaveTextContent(
      'Peer-to-peer finishes 40 seconds sooner.',
    );
  });

  it('updates the verdict for one computer and for 50', () => {
    render(<WaitTimes />);
    const slider = screen.getByRole('slider');
    const status = screen.getByRole('status');

    fireEvent.change(slider, { target: { value: '1' } });
    expect(status).toHaveTextContent(
      'Client-server: 16 seconds, set by the computer’s own download speed.',
    );
    expect(status).toHaveTextContent('Both ways take the same time here.');

    fireEvent.change(slider, { target: { value: '50' } });
    expect(status).toHaveTextContent('Client-server: 400 seconds');
    expect(status).toHaveTextContent('Peer-to-peer: 66.7 seconds');
  });

  it('shows the fixed numbers, with the file in megabits and megabytes', () => {
    render(<WaitTimes />);
    expect(
      screen.getByText('File: 800 megabits (100 megabytes)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Server upload: 100 Mbps')).toBeInTheDocument();
  });

  it('has the slider range 1 to 50 and no axe violations', async () => {
    const { container } = render(<WaitTimes />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '50');
    expect(await axe(container)).toHaveNoViolations();
  });
});
