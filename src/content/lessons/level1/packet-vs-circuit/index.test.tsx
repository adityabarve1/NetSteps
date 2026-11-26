// The lesson rendered through the REAL lesson page, curriculum and loader at
// its real URL (nothing about the lesson is mocked; progress is a fake).
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { renderLessonPage } from '@/test/renderLessonPage';
import { quiz } from './quiz';

const ID = 'l1-packet-vs-circuit';
const PATH = `/learn/level-1/${ID}`;
const SIM = 'Simulation: packets and a circuit when a link breaks';
const LAB = 'lab-l1-packets';

type User = ReturnType<typeof userEvent.setup>;

async function open() {
  const view = renderLessonPage(PATH);
  await screen.findByRole(
    'heading',
    { level: 1, name: 'Packet vs circuit switching' },
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

// The right answer for the problem on screen, worked out from its own words.
function currentAnswer(): number {
  const lab = screen.getByRole('group', { name: 'Practice problems' });
  const m =
    /A (\d+) KB message is sent with at most (\d+) bytes per packet/.exec(
      lab.textContent,
    );
  if (m === null) throw new Error('no packet problem on screen');
  return Math.ceil((Number(m[1]) * 1000) / Number(m[2]));
}

async function solveLab(user: User, count: number) {
  const lab = screen.getByRole('group', { name: 'Practice problems' });
  for (let i = 0; i < count; i += 1) {
    await user.type(
      within(lab).getByLabelText('Your answer'),
      String(currentAnswer()),
    );
    await user.click(within(lab).getByRole('button', { name: 'Check' }));
    await user.click(
      within(lab).getByRole('button', {
        name: i === count - 1 ? 'Finish' : 'Next problem',
      }),
    );
  }
}

describe('lesson: Packet vs circuit switching', () => {
  it('shows every part in the order of the lesson recipe', async () => {
    await open();

    const h2 = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(h2).toEqual([
      'Think of it like this',
      'Why we need a switching method',
      'Circuit switching and the old phone network',
      'Packets: a message in numbered pieces',
      'Store and forward: how packets cross several hops',
      'Why packets share links efficiently',
      'Comparing circuit and packet switching',
      'Real examples: the internet, phones and video calls',
      'Try it yourself',
      'Practice lab',
      'On your own computer',
      'Why it matters',
      'Check yourself',
      'Recap',
      'Key terms',
    ]);
    expect(screen.getAllByRole('button', { name: /^Go deeper:/ })).toHaveLength(
      14,
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

    expect(caption).toHaveTextContent(/^You send a 5500-byte message/);
    await user.click(within(sim).getByRole('button', { name: 'Next' }));
    expect(caption).toHaveTextContent(/^The first three packets leave/);
    expect(picture).toHaveAccessibleName(/packets 1 and 3 are on route A/);
    for (let i = 0; i < 6; i += 1) {
      await user.click(within(sim).getByRole('button', { name: 'Next' }));
    }
    expect(caption).toHaveTextContent(/so the call drops/);
    expect(progress.completeLesson).not.toHaveBeenCalled();
    for (let i = 0; i < 2; i += 1) {
      await user.click(within(sim).getByRole('button', { name: 'Next' }));
    }
    expect(within(sim).getByText('Step 10 of 10')).toBeInTheDocument();
    expect(caption).toHaveTextContent(/^All six packets arrive/);
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

  it('the try-it controls change the verdict', async () => {
    await open();
    const card = screen.getByRole('heading', {
      name: 'How long does the message take?',
    }).parentElement;
    if (card === null) throw new Error('no try-it card');
    const status = within(card).getByRole('status');

    expect(status).toHaveTextContent('Fastest here: packet switching');
    fireEvent.change(within(card).getByLabelText('Circuit setup time'), {
      target: { value: '0' },
    });
    expect(status).toHaveTextContent('Fastest here: circuit switching');
    fireEvent.change(within(card).getByRole('slider'), {
      target: { value: '1' },
    });
    expect(status).toHaveTextContent('tie at 0.064 seconds');
  });

  it('the lab records completion after five right answers and not before', async () => {
    const user = userEvent.setup();
    const { progress } = await open();
    const frame = screen.getByRole('group', { name: 'Count the packets' });
    expect(within(frame).getByText('Problem 1 of 5')).toBeInTheDocument();

    const field = within(frame).getByLabelText('Your answer');
    await user.type(field, String(currentAnswer() + 1));
    expect(progress.startLab).toHaveBeenCalledWith(LAB);
    await user.click(within(frame).getByRole('button', { name: 'Check' }));
    expect(within(frame).getByRole('status')).toHaveTextContent(/Not quite/);
    expect(progress.completeLab).not.toHaveBeenCalled();
    await user.clear(field);

    await solveLab(user, 5);
    expect(within(frame).getByRole('status')).toHaveTextContent(
      'You finished 5 problems.',
    );
    expect(progress.completeLab).toHaveBeenCalledTimes(1);
    expect(progress.completeLab).toHaveBeenCalledWith(LAB);
    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('the real-computer exercise starts with the safety line and uses only tracing commands', async () => {
    await open();
    const part = screen.getByRole('region', { name: 'On your own computer' });
    expect(
      part.textContent.startsWith(
        'On your own computerOnly do this on your own device and network.',
      ),
    ).toBe(true);
    expect(within(part).getByText('tracert example.com')).toBeInTheDocument();
    expect(
      within(part).getByText('traceroute example.com'),
    ).toBeInTheDocument();
    expect(part.textContent).toMatch(/\* \* \*/);
    expect(part.textContent).toMatch(/Request timed out/);
    expect(part.textContent).not.toMatch(/nmap|scan|ipconfig|ping/i);
  });

  it('the worked tables match the formulas', async () => {
    await open();
    const split = screen.getByRole('table', {
      name: /A 3500-byte message cut into packets/,
    });
    const payloads = within(split)
      .getAllByRole('row')
      .slice(1)
      .map((r) => within(r).getByRole('cell').textContent);
    expect(payloads).toEqual([
      '1000 bytes',
      '1000 bytes',
      '1000 bytes',
      '500 bytes',
    ]);

    const pipeline = screen.getByRole('table', {
      name: /Eight packets crossing three links/,
    });
    const rows = within(pipeline).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(10);
    const last = within(rows.slice(-1)[0] ?? document.body)
      .getAllByRole('cell')
      .map((c) => c.textContent);
    expect(last).toEqual(['(idle)', '(idle)', 'packet 8']);
    expect(document.body.textContent).toMatch(
      /\(8 \+ 3 − 1\) × 1 = 10 seconds/,
    );
  });

  it('the sharing table shows the chance of overload for 35 users', async () => {
    await open();
    const table = screen.getByRole('table', {
      name: /More than 10 users active at once/,
    });
    const row = within(table).getByRole('row', { name: /^35/ });
    expect(row).toHaveTextContent('0.042 percent of the time');
  });

  it('ends with a link back to the course map, because it is the last built lesson', async () => {
    await open();
    expect(
      screen.getByRole('link', { name: 'Back to the course map' }),
    ).toHaveAttribute('href', '/learn');
    expect(
      screen.queryByRole('link', { name: /^Next:/ }),
    ).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = await open();
    expect(await axe(container)).toHaveNoViolations();
  });
});
