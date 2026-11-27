import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { curriculum } from '@/content/curriculum';
import {
  FIRST,
  SECOND,
  THIRD,
  level1Built,
  nothingBuilt,
  renderCourseMap,
} from '@/test/courseMapTestKit';
import { done, opened, stateOf, T1, T2, T3 } from '@/test/progressFixtures';

const lessonLinks = () =>
  screen
    .queryAllByRole('link')
    .filter((a) => a.getAttribute('href')?.startsWith('/learn/'));

describe('CourseMap: the main button', () => {
  it('a new learner sees "Start: <lesson title>" linking to the first lesson', () => {
    renderCourseMap();

    const start = screen.getByRole('link', {
      name: /^Start: What is a network/,
    });
    expect(start).toHaveAttribute('href', `/learn/level-1/${FIRST}`);
    expect(
      screen.queryByRole('link', { name: /Continue where you left off/ }),
    ).not.toBeInTheDocument();
  });

  it('a returning learner continues at the most recently opened lesson', () => {
    renderCourseMap({
      state: stateOf({
        [FIRST]: done(T1),
        [THIRD]: opened(T3),
        [SECOND]: opened(T2),
      }),
    });

    const go = screen.getByRole('link', {
      name: /Continue where you left off/,
    });
    expect(go).toHaveAttribute('href', `/learn/level-1/${THIRD}`);
    expect(screen.queryByRole('link', { name: /^Start: / })).toBeNull();
  });

  it('when only finished lessons have records, offers the next lesson', () => {
    renderCourseMap({ state: stateOf({ [FIRST]: done(T1) }) });

    const next = screen.getByRole('link', { name: /Start next lesson/ });
    expect(next).toHaveAttribute('href', `/learn/level-1/${SECOND}`);
  });

  it('a record for an unknown lesson id does not make a learner "returning"', () => {
    renderCourseMap({ state: stateOf({ 'l9-ghost': opened(T1) }) });

    expect(
      screen.getByRole('link', { name: /^Start: What is a network/ }),
    ).toBeInTheDocument();
  });

  it('says the learner is all caught up, with no button', () => {
    const everything = Object.fromEntries(
      (level1Built[0]?.lessons ?? []).map((l) => [l.id, done(T1)]),
    );
    renderCourseMap({ state: stateOf(everything) });

    expect(
      screen.getByText('You are all caught up. More lessons are on the way.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Start|Continue/ })).toBeNull();
  });

  it('with no built lesson at all, shows a note and no dead link', () => {
    renderCourseMap({ levels: nothingBuilt });

    expect(
      screen.getByText('Lessons are being written. Check back soon.'),
    ).toBeInTheDocument();
    expect(lessonLinks()).toHaveLength(0);
    expect(screen.queryByText(/lessons done/)).toBeNull();
  });

  it('shows no button while progress is loading', () => {
    renderCourseMap({ ready: false });

    expect(screen.queryByRole('link', { name: /Start|Continue/ })).toBeNull();
  });
});

describe('CourseMap: structure and progress', () => {
  it('has one h1 then one h2 per level, in order', () => {
    renderCourseMap();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Course map',
    );
    const h2 = screen.getAllByRole('heading', { level: 2 });
    expect(h2).toHaveLength(7);
    expect(h2[0]).toHaveTextContent('Level 1: Basics');
    expect(h2[6]).toHaveTextContent(/^Level 7: /);
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });

  it('shows the Level 1 ring as 1/6 and the overall count', () => {
    renderCourseMap({ state: stateOf({ [FIRST]: done(T1) }) });

    const section = screen.getByRole('region', { name: /Level 1: Basics/ });
    expect(
      within(section).getByRole('img', { name: '1 of 6 lessons done' }),
    ).toHaveTextContent('1/6');
    expect(screen.getByText('1 of 6 lessons done')).toBeInTheDocument();
  });

  it('Levels 2 to 7 say "Coming soon" and have no lesson links', () => {
    renderCourseMap();

    for (let n = 2; n <= 7; n += 1) {
      const section = screen.getByRole('region', {
        name: new RegExp(`^Level ${String(n)}:`),
      });
      expect(within(section).getByText('Coming soon')).toBeInTheDocument();
      expect(within(section).queryAllByRole('link')).toHaveLength(0);
      expect(within(section).queryByRole('img')).toBeNull();
    }
    const level1 = screen.getByRole('region', { name: /^Level 1:/ });
    expect(within(level1).getAllByRole('link')).toHaveLength(6);
    expect(lessonLinks()).toHaveLength(7); // six rows plus the main button
  });

  it('ignores records for lessons that are not in the curriculum', () => {
    renderCourseMap({
      state: stateOf({ 'l9-ghost': done(T1), [FIRST]: done(T1) }),
    });

    expect(
      screen.getByRole('img', { name: '1 of 6 lessons done' }),
    ).toBeVisible();
  });
});

describe('CourseMap: loading and account notes', () => {
  it('before ready shows busy skeleton lists, no rings, and does not crash', () => {
    renderCourseMap({ ready: false });

    expect(screen.getByText('Loading your progress')).toBeInTheDocument();
    const busy = document.querySelectorAll('ul[aria-busy="true"]');
    expect(busy).toHaveLength(7);
    expect(screen.queryByRole('img')).toBeNull();
    expect(lessonLinks()).toHaveLength(0);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(7);
  });

  it('once ready, lists are no longer busy', () => {
    renderCourseMap();

    expect(document.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it.each(['signed-out', 'unconfigured'] as const)(
    'a guest (%s) sees the save-on-this-device line with a sign-in link',
    (status) => {
      renderCourseMap({ status });

      expect(
        screen.getByText(/Your progress is saved on this device\./),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
        'href',
        '/login',
      );
    },
  );

  it.each(['signed-in', 'loading'] as const)(
    'shows no guest line while auth is %s',
    (status) => {
      renderCourseMap({ status });

      expect(screen.queryByText(/saved on this device/)).toBeNull();
      expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
    },
  );

  it('shows a calm note in a polite status region when saving is waiting', () => {
    renderCourseMap({ syncError: true });

    const note = screen.getByText(
      'We will finish saving your progress when you are back online.',
    );
    expect(screen.getByRole('status')).toContainElement(note);
  });

  it('has an empty status region and no note when saving is fine', () => {
    renderCourseMap();

    const region = screen.getByRole('status');
    expect(region).toBeEmptyDOMElement();
    expect(screen.queryByText(/finish saving/)).toBeNull();
  });
});

describe('CourseMap: smoke and accessibility', () => {
  it('the default export renders the real curriculum: Level 1 has its first lesson, Levels 2 to 7 are "Coming soon"', () => {
    renderCourseMap({ levels: null });

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(7);
    expect(
      screen.queryByText('Lessons are being written. Check back soon.'),
    ).toBeNull();
    const level1 = screen.getByRole('region', { name: /^Level 1:/ });
    expect(
      within(level1).getByRole('link', { name: /What is a network/ }),
    ).toHaveAttribute('href', `/learn/level-1/${FIRST}`);
    for (let n = 2; n <= 7; n += 1) {
      const section = screen.getByRole('region', {
        name: new RegExp(`^Level ${String(n)}:`),
      });
      expect(within(section).getByText('Coming soon')).toBeInTheDocument();
      expect(within(section).queryAllByRole('link')).toHaveLength(0);
    }
  });

  it.each([
    ['a new guest', {}],
    ['loading', { ready: false }],
    [
      'a returning signed-in learner',
      {
        status: 'signed-in' as const,
        state: stateOf({ [FIRST]: done(T1), [SECOND]: opened(T2) }),
      },
    ],
    ['a sync note', { syncError: true }],
    ['no built lessons', { levels: nothingBuilt }],
    ['the real curriculum', { levels: curriculum }],
  ])('has no axe violations for %s', async (_name, options) => {
    const { container } = renderCourseMap(options);

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('CourseMap: wide layout hooks', () => {
  it('puts the heading and the continue button above a grid holding every level', () => {
    const { container } = renderCourseMap();

    const grid = container.querySelector('.levels');
    expect(grid).not.toBeNull();
    expect(grid?.querySelectorAll('section')).toHaveLength(7);
    const top = container.querySelector('.top');
    expect(top).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(top).toContainElement(
      screen.getByRole('link', { name: /^Start: / }),
    );
    expect(grid).not.toContainElement(
      screen.getByRole('heading', { level: 1 }),
    );
  });
});
