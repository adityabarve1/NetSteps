// The lesson rendered through the REAL lesson page, curriculum and loader at
// its real URL (nothing about the lesson is mocked; progress is a fake).
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { renderLessonPage } from '@/test/renderLessonPage';
import { SCOPES, scopeQuestions } from './logic';
import { quiz } from './quiz';

const ID = 'l1-lan-wan-man';
const PATH = `/learn/level-1/${ID}`;
const SIM = 'Simulation: networks from one person to the world';
const LAB = 'lab-l1-classify';

type User = ReturnType<typeof userEvent.setup>;

async function open() {
  const view = renderLessonPage(PATH);
  await screen.findByRole(
    'heading',
    { level: 1, name: 'LAN, WAN and MAN' },
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

// The scenario of the problem on screen, found by its text.
function currentScenario() {
  const lab = screen.getByRole('group', { name: 'Practice problems' });
  const text = lab.textContent;
  const found = scopeQuestions.find((q) => text.includes(q.prompt));
  if (found === undefined) throw new Error('no scenario on screen');
  return found;
}

async function solveLab(user: User) {
  const lab = screen.getByRole('group', { name: 'Practice problems' });
  for (let i = 0; i < 6; i += 1) {
    const answer = SCOPES.indexOf(currentScenario().scope);
    await user.type(within(lab).getByLabelText('Your answer'), String(answer));
    await user.click(within(lab).getByRole('button', { name: 'Check' }));
    await user.click(
      within(lab).getByRole('button', {
        name: i === 5 ? 'Finish' : 'Next problem',
      }),
    );
  }
}

describe('lesson: LAN, WAN and MAN', () => {
  it('shows every part in the order of the lesson recipe', async () => {
    await open();

    const h2 = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(h2).toEqual([
      'Think of it like this',
      'What makes a network “local”',
      'PAN: the network around one person',
      'LAN: one building, one owner',
      'MAN: a network the size of a city',
      'WAN: joining networks across cities and countries',
      'The internet: a network of networks',
      'Why the distance limits are only rules of thumb',
      'Try it yourself',
      'Practice lab',
      'On your own computer',
      'Why it matters',
      'Check yourself',
      'Recap',
    ]);
    expect(
      screen.getAllByRole('button', { name: /^Go deeper:/ }).length,
    ).toBeGreaterThanOrEqual(8);
  });

  it('opens the lesson once', async () => {
    const { progress } = await open();
    await waitFor(() => {
      expect(progress.openLesson).toHaveBeenCalledTimes(1);
    });
    expect(progress.openLesson).toHaveBeenCalledWith(ID);
  });

  it('the simulation grows from PAN to WAN and, with the quiz, completes the lesson', async () => {
    const user = userEvent.setup();
    const { progress } = await open();
    const sim = screen.getByRole('group', { name: SIM });
    const caption = within(sim).getByRole('status');
    const picture = within(sim).getByRole('img');

    expect(caption).toHaveTextContent(/^PAN: your phone plays music/);
    expect(picture).toHaveAccessibleName(/Now showing: Earbuds and phone/);
    await user.click(within(sim).getByRole('button', { name: 'Next' }));
    expect(caption).toHaveTextContent(/^LAN: at home/);
    for (let i = 0; i < 3; i += 1) {
      await user.click(within(sim).getByRole('button', { name: 'Next' }));
    }
    expect(within(sim).getByText('Step 5 of 5')).toBeInTheDocument();
    expect(caption).toHaveTextContent(/^WAN: a bank joins its offices/);
    expect(picture).toHaveAccessibleName(
      /Rings reached so far: PAN, LAN, MAN, WAN\.$/,
    );
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

  it('the try-it names the network for the distance on the slider', async () => {
    await open();
    const card = screen.getByRole('heading', {
      name: 'How far does it reach?',
    }).parentElement;
    if (card === null) throw new Error('no try-it card');
    const slider = within(card).getByRole('slider', {
      name: 'Distance between the farthest devices',
    });
    const verdict = within(card).getByRole('status');

    expect(verdict).toHaveTextContent(/^LAN local area network\./);
    fireEvent.change(slider, { target: { value: '0' } });
    expect(card).toHaveTextContent('Distance: 1 m');
    expect(slider).toHaveAttribute('aria-valuetext', '1 m: PAN');
    expect(verdict).toHaveTextContent(/^PAN personal area network\./);
    expect(verdict).toHaveTextContent('Example: Your phone and your wireless');
    fireEvent.change(slider, { target: { value: '200' } });
    expect(card).toHaveTextContent('Distance: 20,000 km');
    expect(slider).toHaveAttribute('aria-valuetext', '20,000 km: WAN');
    expect(verdict).toHaveTextContent(/^WAN wide area network\./);
    expect(card).toHaveTextContent(
      'WAN: more than about 100 km (you are here)',
    );
  });

  it('the lab marks a wrong answer, explains it, and records completion after six right ones', async () => {
    const user = userEvent.setup();
    const { progress } = await open();
    const frame = screen.getByRole('group', { name: 'Sort networks by reach' });
    expect(within(frame).getByText('Problem 1 of 6')).toBeInTheDocument();

    const right = SCOPES.indexOf(currentScenario().scope);
    const wrong = (right + 1) % 4;
    const field = within(frame).getByLabelText('Your answer');
    await user.type(field, String(wrong));
    expect(progress.startLab).toHaveBeenCalledWith(LAB);
    await user.click(within(frame).getByRole('button', { name: 'Check' }));
    expect(within(frame).getByRole('status')).toHaveTextContent(/Not quite/);
    expect(progress.completeLab).not.toHaveBeenCalled();
    await user.clear(field);

    await solveLab(user);
    expect(within(frame).getByRole('status')).toHaveTextContent(
      'You finished 6 problems.',
    );
    expect(progress.completeLab).toHaveBeenCalledTimes(1);
    expect(progress.completeLab).toHaveBeenCalledWith(LAB);
    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('the real-computer exercise starts with the safety line and uses only safe commands', async () => {
    await open();
    const part = screen.getByRole('region', { name: 'On your own computer' });
    expect(
      part.textContent.startsWith(
        'On your own computerOnly do this on your own device and network.',
      ),
    ).toBe(true);
    for (const command of ['ipconfig', 'ifconfig en0', 'ip addr']) {
      expect(within(part).getAllByText(command).length).toBeGreaterThan(0);
    }
    expect(part.textContent).not.toMatch(
      /localhost|Request timeout|nmap|scan|Lost/,
    );
  });

  it('has no axe violations', async () => {
    const { container } = await open();
    expect(await axe(container)).toHaveNoViolations();
  });
});
