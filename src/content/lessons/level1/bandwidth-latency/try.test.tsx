import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { WhatAreYouWaitingFor } from './try';

const bandwidth = () =>
  screen.getByRole('slider', { name: 'Bandwidth (the width of the pipe)' });
const latency = () =>
  screen.getByRole('slider', { name: 'Latency (the length of the road)' });

describe('WhatAreYouWaitingFor (try-it)', () => {
  it('starts with a 4 MB photo at 10 Mbps and 50 ms: 3.25 seconds, mostly bandwidth', () => {
    render(<WhatAreYouWaitingFor />);
    expect(bandwidth()).toHaveAttribute(
      'aria-valuetext',
      '10 megabits per second',
    );
    expect(latency()).toHaveAttribute('aria-valuetext', '50 milliseconds');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      'Mostly bandwidth. Total time: 3.25 seconds.',
    );
    expect(status).toHaveTextContent(
      'Delay (latency): 0.05 seconds. Sending (bandwidth): 3.2 seconds.',
    );
    expect(status).toHaveTextContent('A wider pipe would help a lot');
  });

  it('a web request on a fast, long link is mostly latency', () => {
    render(<WhatAreYouWaitingFor />);
    fireEvent.click(
      screen.getByRole('radio', { name: 'A web request (1 kilobyte)' }),
    );
    fireEvent.change(bandwidth(), { target: { value: '9' } }); // 1000 Mbps
    fireEvent.change(latency(), { target: { value: '5' } }); // 100 ms
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      'Mostly latency. Total time: 0.1 seconds.',
    );
    expect(status).toHaveTextContent(
      'Sending (bandwidth): less than 0.001 seconds',
    );
    expect(status).toHaveTextContent('A wider pipe would barely help');
    expect(screen.getByText('1000 Mbps')).toBeInTheDocument();
    expect(screen.getByText('100 ms')).toBeInTheDocument();
  });

  it('a game update on the slowest link is mostly bandwidth', () => {
    render(<WhatAreYouWaitingFor />);
    fireEvent.click(
      screen.getByRole('radio', { name: 'A game update (2000 megabytes)' }),
    );
    fireEvent.change(bandwidth(), { target: { value: '0' } });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Mostly bandwidth. Total time: 16000 seconds.',
    );
  });

  it('the file choice is a labelled radio group and the sliders are native range inputs', () => {
    render(<WhatAreYouWaitingFor />);
    const group = screen.getByRole('group', { name: 'File to send' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(
      screen.getByRole('radio', { name: 'A photo (4 megabytes)' }),
    ).toBeChecked();

    // Native range inputs: the browser itself handles arrow keys, Home and End.
    for (const slider of [bandwidth(), latency()]) {
      expect(slider.tagName).toBe('INPUT');
      expect(slider).toHaveAttribute('type', 'range');
    }
  });

  it('has the slider ranges from the step lists and no axe violations', async () => {
    const { container } = render(<WhatAreYouWaitingFor />);
    expect(bandwidth()).toHaveAttribute('max', '9');
    expect(latency()).toHaveAttribute('max', '7');
    expect(await axe(container)).toHaveNoViolations();
  });
});
