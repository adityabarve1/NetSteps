// The lesson rendered through the REAL lesson page, curriculum and loader at
// its real URL (nothing about the lesson is mocked; progress is a fake).
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { addDevices, cable, configure } from '@/labs/builderTestKit';
import { renderLessonPage } from '@/test/renderLessonPage';
import { quiz } from './quiz';

const ID = 'l1-client-server-p2p';
const PATH = `/learn/level-1/${ID}`;
const SIM =
  'Simulation: sending one file to many computers, client-server and peer-to-peer';

type User = ReturnType<typeof userEvent.setup>;

async function open() {
  const view = renderLessonPage(PATH);
  await screen.findByRole(
    'heading',
    { level: 1, name: 'Client-server vs peer-to-peer' },
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

describe('lesson: Client-server vs peer-to-peer', () => {
  it('shows every part in the order of the lesson recipe', async () => {
    await open();

    const h2 = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(h2).toEqual([
      'Think of it like this',
      'The client-server idea: one asks, one serves',
      'Servers and clients in real life',
      'Strengths and weaknesses of client-server',
      'Peer-to-peer: everyone serves everyone',
      'Hybrid models: servers and peers together',
      'Scaling and the single point of failure',
      'Try it yourself',
      'Practice lab',
      'On your own computer',
      'Why it matters',
      'Check yourself',
      'Recap',
      'Key terms',
    ]);
    expect(screen.getAllByRole('button', { name: /^Go deeper:/ })).toHaveLength(
      12,
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

    expect(caption).toHaveTextContent(/^One client asks the server/);
    expect(picture).toHaveAccessibleName(/one server and 1 client\./);
    await user.click(within(sim).getByRole('button', { name: 'Next' }));
    expect(caption).toHaveTextContent('4000 ÷ 100 = 40 seconds');
    expect(picture).toHaveAccessibleName(/5 clients/);
    for (let i = 0; i < 5; i += 1) {
      await user.click(within(sim).getByRole('button', { name: 'Next' }));
    }
    expect(within(sim).getByText('Step 7 of 7')).toBeInTheDocument();
    expect(caption).toHaveTextContent(
      /client-server takes 80 seconds and peer-to-peer takes 40 seconds/,
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

  it('the try-it slider changes both times in the status', async () => {
    await open();
    const card = screen.getByRole('heading', {
      name: 'How long will everyone wait?',
    }).parentElement;
    if (card === null) throw new Error('no try-it card');
    const slider = within(card).getByRole('slider');
    const status = within(card).getByRole('status');

    expect(status).toHaveTextContent('Client-server: 80 seconds');
    // A native range input: the browser itself handles the arrow keys, Home and End.
    expect(slider.tagName).toBe('INPUT');
    expect(slider).toHaveAttribute('type', 'range');
    fireEvent.change(slider, { target: { value: '50' } });
    expect(status).toHaveTextContent('Client-server: 400 seconds');
    expect(status).toHaveTextContent('Peer-to-peer: 66.7 seconds');
    fireEvent.change(slider, { target: { value: '1' } });
    expect(status).toHaveTextContent('Both ways take the same time here.');
  });

  it('the lab records completion once every goal is done', async () => {
    const user = userEvent.setup();
    const { progress } = await open();
    const lab = screen.getByRole('group', {
      name: 'A server and three computers',
    });
    expect(within(lab).getByText('0 of 2 goals done')).toBeInTheDocument();

    await addDevices(user, 'Add a computer', 3);
    await addDevices(user, 'Add a server');
    await addDevices(user, 'Add a switch');
    expect(progress.startLab).toHaveBeenCalledWith('lab-l1-server');
    for (const name of ['PC1', 'PC2', 'PC3', 'Server1']) {
      await cable(user, name, 'Switch1');
    }
    await configure(user, 'PC1', '192.168.1.10', '255.255.255.0');
    await configure(user, 'PC2', '192.168.1.11', '255.255.255.0');
    await configure(user, 'PC3', '192.168.1.12', '255.255.255.0');
    expect(progress.completeLab).not.toHaveBeenCalled();
    await configure(user, 'Server1', '192.168.1.100', '255.255.255.0');

    expect(
      within(lab).getByText('All goals done. Nice work!'),
    ).toBeInTheDocument();
    expect(progress.completeLab).toHaveBeenCalledTimes(1);
    expect(progress.completeLab).toHaveBeenCalledWith('lab-l1-server');
    expect(progress.completeLesson).not.toHaveBeenCalled();
  });

  it('the real-computer exercise starts with the safety line and uses only the Network tab', async () => {
    await open();
    const part = screen.getByRole('region', { name: 'On your own computer' });
    expect(
      part.textContent.startsWith(
        'On your own computerOnly do this on your own device and network.',
      ),
    ).toBe(true);
    expect(within(part).getAllByText('Network').length).toBeGreaterThan(0);
    expect(part.textContent).not.toMatch(/localhost|ping|ipconfig|console/i);
  });

  it('the worked table matches the formulas, including the tie at two clients', async () => {
    await open();
    const table = screen.getByRole('table', {
      name: /One 800-megabit file, a server that uploads/,
    });
    const rows = within(table).getAllByRole('row').slice(1);
    const cells = rows.map((r) =>
      within(r)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    );
    expect(
      rows.map((r) => within(r).getByRole('rowheader').textContent),
    ).toEqual(['1', '2', '3', '5', '10', '20', '50']);
    expect(cells.map((c) => c[1])).toEqual([
      '16 seconds',
      '16 seconds',
      '24 seconds',
      '40 seconds',
      '80 seconds',
      '160 seconds',
      '400 seconds',
    ]);
    expect(screen.getByText(/two times tie at 16 seconds/)).toBeInTheDocument();
  });

  it('says the peer-to-peer model starts from an original source', async () => {
    await open();
    expect(document.body.textContent).toMatch(
      /the original source, which uploads at 100 Mbps/,
    );
    expect(document.body.textContent).not.toMatch(/no single main computer/);
  });

  it('has no axe violations', async () => {
    const { container } = await open();
    expect(await axe(container)).toHaveNoViolations();
  });
});
