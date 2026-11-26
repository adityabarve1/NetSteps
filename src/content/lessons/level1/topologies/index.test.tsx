// The lesson rendered through the REAL lesson page, curriculum and loader at
// its real URL (nothing about the lesson is mocked; progress is a fake).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { addDevices, cable, configure, node } from '@/labs/builderTestKit';
import { renderLessonPage } from '@/test/renderLessonPage';
import { quiz } from './quiz';

const ID = 'l1-topologies';
const PATH = `/learn/level-1/${ID}`;
const SIM =
  'Simulation: four network shapes and what happens when a part breaks';
const LAB = 'lab-l1-star';

type User = ReturnType<typeof userEvent.setup>;

async function open() {
  const view = renderLessonPage(PATH);
  await screen.findByRole(
    'heading',
    { level: 1, name: 'Topologies' },
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

function tryItCard(): HTMLElement {
  const card = screen.getByRole('heading', {
    name: 'Break it and see who can still talk',
  }).parentElement;
  if (card === null) throw new Error('no try-it card');
  return card;
}

describe('lesson: Topologies', () => {
  it('shows every part in the order of the lesson recipe', async () => {
    await open();
    const h2 = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(h2).toEqual([
      'Think of it like this',
      'Why the layout of a network matters',
      'Bus: one shared cable',
      'Star: everything through one centre',
      'Ring: a closed loop',
      'Mesh and partial mesh: many routes',
      'Comparing cost, cable and what breaks',
      'Logical versus physical topology',
      'Try it yourself',
      'Practice lab',
      'On your own computer',
      'Why it matters',
      'Check yourself',
      'Recap',
      'Key terms',
    ]);
    expect(
      screen.getAllByRole('button', { name: /^Go deeper:/ }).length,
    ).toBeGreaterThanOrEqual(7);
  });

  it('opens the lesson once', async () => {
    const { progress } = await open();
    await waitFor(() => {
      expect(progress.openLesson).toHaveBeenCalledTimes(1);
    });
    expect(progress.openLesson).toHaveBeenCalledWith(ID);
  });

  it('the simulation reaches its last step, and with the quiz completes the lesson', async () => {
    const user = userEvent.setup();
    const { progress } = await open();
    const sim = screen.getByRole('group', { name: SIM });
    const caption = within(sim).getByRole('status');
    const picture = within(sim).getByRole('img');

    expect(caption).toHaveTextContent(/^Bus: five devices tap into one shared/);
    expect(picture).toHaveAccessibleName(
      /bus network of 5 devices\. Nothing is broken\. All 5 devices can talk/,
    );
    await user.click(within(sim).getByRole('button', { name: 'Next' }));
    expect(picture).toHaveAccessibleName(
      /The cable B to C is cut\. No device can talk to another\./,
    );
    for (let i = 0; i < 10; i += 1) {
      await user.click(within(sim).getByRole('button', { name: 'Next' }));
    }
    expect(within(sim).getByText('Step 12 of 12')).toBeInTheDocument();
    expect(picture).toHaveAccessibleName(/mesh network/);
    expect(caption).toHaveTextContent(
      'B, C, D and E can still talk (4 of 5 devices).',
    );
    expect(progress.completeLesson).not.toHaveBeenCalled();

    await answerQuiz(user);
    expect(progress.submitQuiz).toHaveBeenCalledWith(ID, 5, 5);
    expect(progress.completeLesson).toHaveBeenCalledTimes(1);
    expect(progress.completeLesson).toHaveBeenCalledWith(ID);
  });

  it('marks cut cables, down devices and cut-off devices with words, not only colour', async () => {
    const user = userEvent.setup();
    await open();
    const sim = screen.getByRole('group', { name: SIM });
    for (let i = 0; i < 4; i += 1) {
      await user.click(within(sim).getByRole('button', { name: 'Next' }));
    }
    // Step 5: star, spoke to C cut.
    expect(within(sim).getByText('cut')).toBeInTheDocument();
    expect(within(sim).getByText('cut off')).toBeInTheDocument();
    await user.click(within(sim).getByRole('button', { name: 'Next' }));
    // Step 6: the switch is down.
    expect(within(sim).getByText('down')).toBeInTheDocument();
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

  it('the try-it says who can still talk after each break, using buttons', async () => {
    const user = userEvent.setup();
    await open();
    const card = tryItCard();
    const verdict = within(card).getByRole('status');
    expect(verdict).toHaveTextContent('Nothing is broken yet.');
    expect(verdict).toHaveTextContent(
      'All 5 computers and the switch can talk',
    );

    // Star: cut the cable to C.
    await user.click(
      within(card).getByRole('button', { name: 'Cable Switch to C' }),
    );
    expect(verdict).toHaveTextContent('You broke 1 cable and 0 devices.');
    expect(verdict).toHaveTextContent(
      'Switch, A, B, D and E can still talk (the switch and 4 of 5 computers).',
    );
    // Break the switch itself: nobody talks.
    await user.click(within(card).getByRole('button', { name: 'Switch' }));
    expect(verdict).toHaveTextContent('Stopped.');
    expect(verdict).toHaveTextContent('No device can talk to another.');
    // Repair everything.
    await user.click(
      within(card).getByRole('button', { name: 'Repair everything' }),
    );
    expect(verdict).toHaveTextContent('Nothing is broken yet.');

    // The same cut in a ring stops everyone; changing shape clears the breaks.
    await user.click(within(card).getByRole('radio', { name: 'Ring' }));
    await user.click(
      within(card).getByRole('button', { name: 'Cable B to C' }),
    );
    expect(verdict).toHaveTextContent('No device can talk to another.');
    await user.click(within(card).getByRole('radio', { name: 'Mesh' }));
    expect(verdict).toHaveTextContent('Nothing is broken yet.');
    await user.click(
      within(card).getByRole('button', { name: 'Cable A to B' }),
    );
    expect(verdict).toHaveTextContent('All 5 devices can talk');
    // A pressed button says so to assistive technology.
    expect(
      within(card).getByRole('button', { name: /Cable A to B/ }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('the lab records completion once the star is built and every computer can ping', async () => {
    const user = userEvent.setup();
    const { progress } = await open();
    const lab = screen.getByRole('group', { name: 'Build a star' });
    expect(within(lab).getByText('0 of 2 goals done')).toBeInTheDocument();

    await addDevices(user, 'Add a computer', 4);
    await addDevices(user, 'Add a switch');
    expect(progress.startLab).toHaveBeenCalledWith(LAB);
    for (const pc of ['PC1', 'PC2', 'PC3', 'PC4']) {
      await cable(user, pc, 'Switch1');
    }
    expect(within(lab).getByText('1 of 2 goals done')).toBeInTheDocument();
    await configure(user, 'PC1', '192.168.1.10', '255.255.255.0');
    await configure(user, 'PC2', '192.168.1.11', '255.255.255.0');
    await configure(user, 'PC3', '192.168.1.12', '255.255.255.0');
    expect(progress.completeLab).not.toHaveBeenCalled();
    await configure(user, 'PC4', '192.168.1.13', '255.255.255.0');

    expect(
      within(lab).getByText('All goals done. Nice work!'),
    ).toBeInTheDocument();
    expect(progress.completeLab).toHaveBeenCalledTimes(1);
    expect(progress.completeLab).toHaveBeenCalledWith(LAB);
    expect(progress.completeLesson).not.toHaveBeenCalled();

    // The guided note: remove one cable and the star is no longer complete.
    await user.click(node('PC3'));
    await user.click(
      screen.getByRole('button', { name: 'Remove cable to Switch1' }),
    );
    expect(within(lab).getByText('0 of 2 goals done')).toBeInTheDocument();
  });

  it('the lab instructions use the real builder button labels', async () => {
    await open();
    const lab = screen.getByRole('group', { name: 'Build a star' });
    for (const label of [
      'Add a computer',
      'Add a switch',
      'Connect PC1 to another device',
      'Gateway (optional)',
      'Open terminal',
      'Remove cable to Switch1',
      'Remove device',
    ]) {
      expect(lab.textContent).toContain(label);
    }
    expect(
      within(lab).getByRole('button', { name: 'Add a computer' }),
    ).toBeInTheDocument();
  });

  it('the real-computer exercise starts with the safety line and uses only safe commands', async () => {
    await open();
    const part = screen.getByRole('region', { name: 'On your own computer' });
    expect(
      part.textContent.startsWith(
        'On your own computerOnly do this on your own device and network.',
      ),
    ).toBe(true);
    for (const command of ['ipconfig', 'route -n get default', 'ip route']) {
      expect(within(part).getAllByText(command).length).toBeGreaterThan(0);
    }
    expect(part.textContent).not.toMatch(
      /localhost|Request timeout|nmap|\bscan(ner|ning)?\b|Lost =/i,
    );
  });

  it('has no axe violations', async () => {
    const { container } = await open();
    expect(await axe(container)).toHaveNoViolations();
  });
});
