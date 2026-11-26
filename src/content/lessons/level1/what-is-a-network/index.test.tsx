// The lesson rendered through the REAL lesson page, curriculum and loader at
// its real URL (nothing about the lesson is mocked; progress is a fake).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { addDevices, cable, configure } from '@/labs/builderTestKit';
import { renderLessonPage } from '@/test/renderLessonPage';
import { quiz } from './quiz';

const ID = 'l1-what-is-a-network';
const PATH = `/learn/level-1/${ID}`;
const SIM = 'Simulation: a message travels from PC1 to PC2';

type User = ReturnType<typeof userEvent.setup>;

async function open() {
  const view = renderLessonPage(PATH);
  await screen.findByRole(
    'heading',
    { level: 1, name: 'What is a network' },
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

describe('lesson: What is a network', () => {
  it('shows every part in the order of the lesson recipe', async () => {
    await open();

    const h2 = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(h2).toEqual([
      'Think of it like this',
      'What makes something a network',
      'Devices and links: the two building blocks',
      'What a network lets devices share',
      'Hosts and network devices: users and helpers',
      'Addresses in one minute',
      'Common mistakes and myths',
      'Try it yourself',
      'Practice lab',
      'On your own computer',
      'Why it matters',
      'Check yourself',
      'Recap',
    ]);
    expect(
      screen.getAllByRole('button', { name: /^Go deeper:/ }).length,
    ).toBeGreaterThanOrEqual(6);
  });

  it('opens the lesson once', async () => {
    const { progress } = await open();
    await waitFor(() => {
      expect(progress.openLesson).toHaveBeenCalledTimes(1);
    });
    expect(progress.openLesson).toHaveBeenCalledWith(ID);
  });

  it('the simulation steps from PC1 to PC2 and, with the quiz, completes the lesson', async () => {
    const user = userEvent.setup();
    const { progress } = await open();
    const sim = screen.getByRole('group', { name: SIM });
    const caption = within(sim).getByRole('status');
    const picture = within(sim).getByRole('img');

    expect(caption).toHaveTextContent(/^PC1 has a message for PC2/);
    expect(picture).toHaveAccessibleName(/The message is at PC1\./);
    await user.click(within(sim).getByRole('button', { name: 'Next' }));
    expect(caption).toHaveTextContent(/SW1 is a switch/);
    expect(picture).toHaveAccessibleName(
      /The link from PC1 to SW1 is lit up\./,
    );
    await user.click(within(sim).getByRole('button', { name: 'Next' }));
    await user.click(within(sim).getByRole('button', { name: 'Next' }));
    expect(within(sim).getByText('Step 4 of 4')).toBeInTheDocument();
    expect(caption).toHaveTextContent(
      'PC2 receives the message. It crossed 2 links and passed through 1 switch on the way.',
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

  it('the try-it says in words whether the devices form a network', async () => {
    const user = userEvent.setup();
    await open();
    const card = screen.getByRole('heading', {
      name: 'Is it a network?',
    }).parentElement;
    if (card === null) throw new Error('no try-it card');
    const verdict = within(card).getByRole('status');

    expect(verdict).toHaveTextContent(
      'Not a network yet. Nothing is connected',
    );
    await user.click(within(card).getByRole('checkbox', { name: 'Laptop' }));
    expect(verdict).toHaveTextContent(
      'Laptop is connected, but it has no other device',
    );
    await user.click(within(card).getByRole('checkbox', { name: 'Printer' }));
    expect(verdict).toHaveTextContent('This is a network: Laptop and Printer');
    expect(verdict).toHaveTextContent('Laptop can print a page on Printer.');
    await user.click(
      within(card).getByRole('checkbox', { name: 'The switch has power' }),
    );
    expect(verdict).toHaveTextContent('The switch has no power');
  });

  it('the lab records completion once every goal is done', async () => {
    const user = userEvent.setup();
    const { progress } = await open();
    const lab = screen.getByRole('group', { name: 'Build your first network' });
    expect(within(lab).getByText('0 of 3 goals done')).toBeInTheDocument();

    await addDevices(user, 'Add a computer', 2);
    await addDevices(user, 'Add a switch');
    expect(progress.startLab).toHaveBeenCalledWith('lab-l1-first-network');
    await cable(user, 'PC1', 'Switch1');
    await cable(user, 'PC2', 'Switch1');
    await configure(user, 'PC1', '192.168.1.10', '255.255.255.0');
    expect(progress.completeLab).not.toHaveBeenCalled();
    await configure(user, 'PC2', '192.168.1.20', '255.255.255.0');

    expect(
      within(lab).getByText('All goals done. Nice work!'),
    ).toBeInTheDocument();
    expect(progress.completeLab).toHaveBeenCalledTimes(1);
    expect(progress.completeLab).toHaveBeenCalledWith('lab-l1-first-network');
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
    for (const command of [
      'ipconfig',
      'ifconfig en0',
      'ip addr',
      'ping 127.0.0.1',
      'ping -c 4 127.0.0.1',
    ]) {
      expect(within(part).getAllByText(command).length).toBeGreaterThan(0);
    }
    expect(part.textContent).not.toMatch(/localhost|Request timeout/);
  });

  it('has no axe violations', async () => {
    const { container } = await open();
    expect(await axe(container)).toHaveNoViolations();
  });
});
