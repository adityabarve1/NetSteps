// The lesson rendered through the REAL lesson page, curriculum and loader at
// its real URL (nothing about the lesson is mocked; progress is a fake).
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { renderLessonPage } from '@/test/renderLessonPage';
import { bandwidthDelayBits, breakdown } from './logic';
import { quiz } from './quiz';

const ID = 'l1-bandwidth-latency';
const PATH = `/learn/level-1/${ID}`;
const SIM =
  'Simulation: a file crossing a link, widening the pipe and shortening the road';

type User = ReturnType<typeof userEvent.setup>;

async function open() {
  const view = renderLessonPage(PATH);
  await screen.findByRole(
    'heading',
    { level: 1, name: 'Bandwidth vs latency' },
    { timeout: 5000 },
  );
  return view;
}

async function answerQuiz(user: User) {
  for (const q of quiz) {
    const right = q.options[q.correctIndex] ?? '';
    const card = screen.getByRole('group', {
      name: new RegExp(q.prompt.slice(0, 30)),
    });
    await user.click(within(card).getByRole('radio', { name: right }));
  }
  await user.click(screen.getByRole('button', { name: 'Submit answers' }));
}

// The answer to the practice problem on screen, worked out from its text.
function currentAnswer(): string {
  const lab = screen.getByRole('group', { name: 'Practice problems' });
  const m = /(\d+) megabytes \(MB\).*?(\d+) megabits per second/.exec(
    lab.textContent,
  );
  if (m === null) throw new Error('no transfer problem on screen');
  const seconds = (Number(m[1]) * 8) / Number(m[2]);
  return String(Math.round(seconds * 100) / 100);
}

async function solveLab(user: User) {
  const lab = screen.getByRole('group', { name: 'Practice problems' });
  for (let i = 0; i < 5; i += 1) {
    await user.type(within(lab).getByLabelText('Your answer'), currentAnswer());
    await user.click(within(lab).getByRole('button', { name: 'Check' }));
    await user.click(
      within(lab).getByRole('button', {
        name: i === 4 ? 'Finish' : 'Next problem',
      }),
    );
  }
}

const rowsOf = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((r) => [
      within(r).getByRole('rowheader').textContent,
      ...within(r)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ]);

describe('lesson: Bandwidth vs latency', () => {
  it('shows every part in the order of the lesson recipe', async () => {
    await open();

    const h2 = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(h2).toEqual([
      'Think of it like this',
      'Two numbers, not one: how much and how long',
      'Bandwidth: how much fits through each second',
      'Latency and its four sources of delay',
      'Throughput: the speed you actually get',
      'The bandwidth-delay product: data on the road',
      'Why small requests feel slow',
      'Common mistakes and myths about “speed”',
      'Try it yourself',
      'Practice lab',
      'On your own computer',
      'Why it matters',
      'Check yourself',
      'Recap',
      'Key terms',
    ]);
    expect(screen.getAllByRole('button', { name: /^Go deeper:/ })).toHaveLength(
      13,
    );
  });

  it('opens the lesson once', async () => {
    const { progress } = await open();
    await waitFor(() => {
      expect(progress.openLesson).toHaveBeenCalledTimes(1);
    });
    expect(progress.openLesson).toHaveBeenCalledWith(ID);
  });

  it('the simulation reaches its last step and, with the quiz, completes the lesson', async () => {
    const user = userEvent.setup();
    const { progress } = await open();
    const sim = screen.getByRole('group', { name: SIM });
    const caption = within(sim).getByRole('status');
    const picture = within(sim).getByRole('img');

    expect(caption).toHaveTextContent(/^A 10-megabyte file \(80 megabits\)/);
    expect(caption).toHaveTextContent('the total is 8.05 seconds');
    expect(picture).toHaveAccessibleName(/total is 8\.05 seconds/);
    await user.click(within(sim).getByRole('button', { name: 'Next' }));
    expect(caption).toHaveTextContent('80 ÷ 100 = 0.8 seconds');
    for (let i = 0; i < 5; i += 1) {
      await user.click(within(sim).getByRole('button', { name: 'Next' }));
    }
    expect(within(sim).getByText('Step 7 of 7')).toBeInTheDocument();
    expect(caption).toHaveTextContent('so the total is 0.09 seconds');
    expect(progress.completeLesson).not.toHaveBeenCalled();

    await answerQuiz(user);
    expect(progress.submitQuiz).toHaveBeenCalledWith(ID, 5, 5);
    expect(progress.completeLesson).toHaveBeenCalledTimes(1);
    expect(progress.completeLesson).toHaveBeenCalledWith(ID);
  });

  it('the quiz alone does not complete the lesson', async () => {
    const user = userEvent.setup();
    const { progress } = await open();
    expect(
      screen.getAllByRole('group', { name: /^Question \d of 5/ }),
    ).toHaveLength(5);

    await answerQuiz(user);
    expect(progress.submitQuiz).toHaveBeenCalledTimes(1);
    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('the try-it controls change the total and which part dominates', async () => {
    await open();
    const card = screen.getByRole('heading', {
      name: 'What are you waiting for?',
    }).parentElement;
    if (card === null) throw new Error('no try-it card');
    const status = within(card).getByRole('status');
    const bandwidth = within(card).getByRole('slider', {
      name: 'Bandwidth (the width of the pipe)',
    });
    const latency = within(card).getByRole('slider', {
      name: 'Latency (the length of the road)',
    });

    expect(status).toHaveTextContent('Mostly bandwidth. Total time: 3.25');
    // A native range input: the browser itself handles the arrow keys.
    expect(bandwidth).toHaveAttribute('type', 'range');
    fireEvent.change(bandwidth, { target: { value: '9' } });
    fireEvent.change(latency, { target: { value: '7' } });
    expect(status).toHaveTextContent('Total time: 0.532 seconds');
    expect(status).toHaveTextContent('Mostly latency');
    fireEvent.click(
      within(card).getByRole('radio', { name: 'A web request (1 kilobyte)' }),
    );
    expect(status).toHaveTextContent('Total time: 0.5 seconds');
  });

  it('the lab records completion once the five problems are done', async () => {
    const user = userEvent.setup();
    const { progress } = await open();
    const lab = screen.getByRole('group', {
      name: 'How long does the download take?',
    });
    expect(within(lab).getByText('Problem 1 of 5')).toBeInTheDocument();
    expect(progress.completeLab).not.toHaveBeenCalled();

    await solveLab(user);
    await waitFor(() => {
      expect(progress.completeLab).toHaveBeenCalledTimes(1);
    });
    expect(progress.completeLab).toHaveBeenCalledWith('lab-l1-transfer');
    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('the real-computer exercise starts with the safety line and covers every system', async () => {
    await open();
    const part = screen.getByRole('region', { name: 'On your own computer' });
    expect(
      part.textContent.startsWith(
        'On your own computerOnly do this on your own device and network.',
      ),
    ).toBe(true);
    for (const text of [
      'ping 192.168.1.1',
      'ping example.com',
      'ping -c 4 192.168.1.1',
      'ipconfig',
      'Windows',
      'macOS',
      'Linux',
    ]) {
      expect(part.textContent).toContain(text);
    }
    expect(part.textContent).not.toMatch(
      /tracert|nmap|netstat|arp |sudo|-f |-l /i,
    );
  });

  it('the worked tables match the formulas', async () => {
    await open();
    const links = screen.getByRole('table', {
      name: /Time until everything has arrived/,
    });
    expect(rowsOf(links).map((r) => r.slice(0, 3))).toEqual([
      ['A tiny request (1 kilobyte)', '0.1 seconds', '0.003 seconds'],
      ['A big file (1 gigabyte)', '8.1 seconds', '800.002 seconds'],
    ]);

    const bdp = screen.getByRole('table', { name: /Bits on the way at once/ });
    expect(rowsOf(bdp).map((r) => r[3])).toEqual([
      `${bandwidthDelayBits(100, 2).toLocaleString('en-US')} bits (25 KB)`,
      '2,000,000 bits (250 KB)',
      '100,000,000 bits (12.5 MB)',
    ]);

    const through = screen.getByRole('table', {
      name: /Bandwidth, total time and the throughput/,
    });
    expect(rowsOf(through).map((r) => r.slice(1))).toEqual([
      ['8.05 seconds', '9.94 Mbps', '99%'],
      ['0.13 seconds', '615 Mbps', '62%'],
      ['0.1 seconds', '0.08 Mbps', 'less than 1%'],
    ]);

    const requests = screen.getByRole('table', {
      name: /20 kilobytes of small pieces/,
    });
    expect(rowsOf(requests).map((r) => r.slice(1))).toEqual([
      ['20', '2 seconds'],
      ['1', '0.1 seconds'],
    ]);
  });

  it('the stated sizes of delay agree with the formulas', () => {
    // 1500 bytes = 12,000 bits = 0.012 megabits on a 100 Mbps link: 0.12 ms.
    const b = breakdown({ fileMb: 0.012, bandwidthMbps: 100, latencyMs: 0 });
    expect(b.transferSeconds * 1000).toBeCloseTo(0.12, 10);
    // 5 microseconds per kilometre: 1000 km is 5 ms, 5000 km is 25 ms.
    expect(1000 * 5e-3).toBe(5);
    expect(5000 * 5e-3).toBe(25);
  });

  it('has no axe violations', async () => {
    const { container } = await open();
    expect(await axe(container)).toHaveNoViolations();
  });
});
