import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { siteConfig } from '@/config/site';
import {
  A,
  B,
  D,
  defaultLoad,
  loadLessonMock,
  makeLesson,
} from '@/test/lessonTestKit';
import { renderLessonPage } from '@/test/renderLessonPage';

vi.mock('@/content/curriculum', async () => {
  const kit = await import('@/test/lessonTestKit');
  return { curriculum: kit.testCurriculum, findLesson: kit.testFindLesson };
});
vi.mock('@/content/loaders', async () => {
  const kit = await import('@/test/lessonTestKit');
  return { loadLesson: kit.loadLessonMock };
});

const at = (levelId: string, id: string) => `/learn/${levelId}/${id}`;

beforeEach(() => {
  loadLessonMock.mockReset();
  loadLessonMock.mockImplementation(defaultLoad);
  document.title = 'Before';
});

describe('LessonPage content', () => {
  it('renders the parts of the lesson in the recipe order', async () => {
    renderLessonPage(at('level-1', A));
    await screen.findByRole('heading', { level: 1, name: 'Lesson A' });

    const headings = screen
      .getAllByRole('heading')
      .map((h) => `${h.tagName} ${h.textContent}`);
    expect(headings).toEqual([
      'H1 Lesson A',
      'H2 Think of it like this',
      'H2 The basics',
      'H2 Going further',
      'H3 Go deeper: Deeper title',
      'H2 Try it yourself',
      'H2 Practice lab',
      'H3 Main lab',
      'H2 Why it matters',
      'H2 Check yourself',
      'H2 Recap',
    ]);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the hook, the analogy, the recap and the cheat sheet', async () => {
    renderLessonPage(at('level-1', A));

    expect(await screen.findByText(/You press play/)).toBeVisible();
    expect(screen.getByText('Houses on streets.')).toBeVisible();
    expect(screen.getByText('A network moves data.')).toBeVisible();
    expect(screen.getByText('Takeaway two.')).toBeVisible();
    expect(screen.getByText('The cheat sheet.')).toBeVisible();
    expect(screen.getByText('Move the slider.')).toBeVisible();
    expect(screen.getByText('It shows up everywhere.')).toBeVisible();
  });

  it('has a table of contents that links to every section and the later parts', async () => {
    renderLessonPage(at('level-1', A));
    const nav = await screen.findByRole('navigation', {
      name: 'In this lesson',
    });

    const links = within(nav)
      .getAllByRole('link')
      .map((a) => [a.textContent, a.getAttribute('href')]);
    expect(links).toEqual([
      ['The basics', '#basics'],
      ['Going further', '#more'],
      ['Try it yourself', '#try-it'],
      ['Practice lab', '#practice-lab'],
      ['Why it matters', '#why-it-matters'],
      ['Check yourself', '#check-yourself'],
      ['Recap', '#recap'],
    ]);
    for (const [, href] of links) {
      expect(document.getElementById(String(href).slice(1))).not.toBeNull();
    }
  });

  it('marks the section in view as current in the table of contents', async () => {
    let callback: IntersectionObserverCallback = () => undefined;
    class FakeObserver {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
    }
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    try {
      renderLessonPage(at('level-1', A));
      await screen.findByRole('heading', { level: 1 });
      const target = document.getElementById('more');
      expect(target).not.toBeNull();

      act(() => {
        callback(
          [
            {
              target,
              isIntersecting: true,
            } as unknown as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        );
      });

      expect(
        screen.getByRole('link', { name: 'Going further' }),
      ).toHaveAttribute('aria-current', 'true');
      expect(
        screen.getByRole('link', { name: 'The basics' }),
      ).not.toHaveAttribute('aria-current');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('works without IntersectionObserver (as in jsdom)', async () => {
    renderLessonPage(at('level-1', A));

    expect(
      await screen.findByRole('navigation', { name: 'In this lesson' }),
    ).toBeVisible();
  });

  it('shows the real-computer exercise with a safety line only when the lesson has one', async () => {
    loadLessonMock.mockImplementation((id) =>
      Promise.resolve(
        id === A
          ? makeLesson(A, { realComputer: 'Run ping on your computer.' })
          : makeLesson(id),
      ),
    );
    const { unmount } = renderLessonPage(at('level-1', A));

    expect(
      await screen.findByRole('heading', {
        level: 2,
        name: 'On your own computer',
      }),
    ).toBeVisible();
    expect(screen.getByText('Run ping on your computer.')).toBeVisible();
    expect(
      screen.getByText('Only do this on your own device and network.'),
    ).toBeVisible();
    unmount();

    renderLessonPage(at('level-1', B));
    await screen.findByRole('heading', { level: 1, name: 'Lesson B' });
    expect(
      screen.queryByRole('heading', { name: 'On your own computer' }),
    ).not.toBeInTheDocument();
  });

  it('omits the practice lab section when the lesson has no labs', async () => {
    loadLessonMock.mockResolvedValue(makeLesson(A, { labs: [] }));
    renderLessonPage(at('level-1', A));
    await screen.findByRole('heading', { level: 1 });

    expect(
      screen.queryByRole('heading', { name: 'Practice lab' }),
    ).not.toBeInTheDocument();
  });

  it('puts the quiz in a "Check yourself" section, with its result heading below it', async () => {
    const user = userEvent.setup();
    renderLessonPage(at('level-1', A));
    const section = (
      await screen.findByRole('heading', { level: 2, name: 'Check yourself' })
    ).closest('section');
    if (section === null) throw new Error('The quiz section is missing');
    const inQuiz = within(section);
    for (let n = 1; n <= 5; n++) {
      await user.click(
        inQuiz.getByRole('radio', { name: `Option ${String(n)}.0` }),
      );
    }
    await user.click(inQuiz.getByRole('button', { name: 'Submit answers' }));

    expect(inQuiz.getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(
      0,
    );
    expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('sets the page title while the lesson is shown and restores it after', async () => {
    const { unmount } = renderLessonPage(at('level-1', A));
    await screen.findByRole('heading', { level: 1 });

    expect(document.title).toBe(`Lesson A - ${siteConfig.name}`);
    unmount();
    expect(document.title).toBe('Before');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderLessonPage(at('level-1', A));
    await screen.findByRole('heading', { level: 1 });

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('next lesson link', () => {
  it('points to the next built lesson in the same level', async () => {
    renderLessonPage(at('level-1', A));

    const link = await screen.findByRole('link', { name: 'Next: Lesson B' });
    expect(link).toHaveAttribute('href', at('level-1', B));
  });

  it('skips unbuilt lessons and crosses into the next level', async () => {
    renderLessonPage(at('level-1', B));

    const link = await screen.findByRole('link', { name: 'Next: Lesson D' });
    expect(link).toHaveAttribute('href', at('level-2', D));
  });

  it('points back to the course map after the last built lesson', async () => {
    renderLessonPage(at('level-2', D));

    const link = await screen.findByRole('link', {
      name: 'Back to the course map',
    });
    expect(link).toHaveAttribute('href', '/learn');
    expect(
      screen.queryByRole('link', { name: /^Next:/ }),
    ).not.toBeInTheDocument();
  });

  it('opens the next lesson when followed', async () => {
    const user = userEvent.setup();
    renderLessonPage(at('level-1', A));
    await user.click(
      await screen.findByRole('link', { name: 'Next: Lesson B' }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lesson B' }),
    ).toBeVisible();
    await waitFor(() => {
      expect(document.title).toBe(`Lesson B - ${siteConfig.name}`);
    });
  });
});

describe('LessonPage: wide layout hooks', () => {
  it('has a side column with the table of contents and a content column with the lesson', async () => {
    const { container } = renderLessonPage(at('level-1', A));
    const nav = await screen.findByRole('navigation', {
      name: 'In this lesson',
    });

    const layout = container.querySelector('.layout');
    expect(layout?.querySelector('.tocColumn')).toContainElement(nav);
    const content = layout?.querySelector('.content');
    expect(content).toContainElement(
      screen.getByRole('group', { name: 'sim-main' }),
    );
    expect(content).toContainElement(
      screen.getByRole('group', { name: 'Main lab' }),
    );
    expect(content).not.toContainElement(nav);
  });
});
