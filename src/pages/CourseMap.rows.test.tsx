import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { curriculum } from '@/content/curriculum';
import {
  FIRST,
  SECOND,
  THIRD,
  level1Built,
  partlyBuilt,
  renderCourseMap,
} from '@/test/courseMapTestKit';
import type { ProgressState } from '@/progress/types';
import { done, opened, stateOf, T1, T2 } from '@/test/progressFixtures';

// Minutes come from the curriculum, which a lesson task may adjust.
function minutesOf(id: string): number {
  const lesson = curriculum
    .flatMap((level) => level.lessons)
    .find((l) => l.id === id);
  if (lesson === undefined) throw new Error(`No lesson ${id}`);
  return lesson.minutes;
}

function row(title: string): HTMLElement {
  const item = screen
    .getAllByRole('listitem')
    .find((li) => li.textContent.includes(title));
  if (item === undefined) throw new Error(`No row for ${title}`);
  return item;
}

const withLabs = (
  state: ProgressState,
  labs: ProgressState['labs'],
): ProgressState => ({ ...state, labs });

describe('CourseMap lesson rows', () => {
  it('shows title, minutes, status text, and a link to the lesson', () => {
    renderCourseMap({
      state: stateOf({ [FIRST]: done(T1), [SECOND]: opened(T2) }),
    });

    const first = row('What is a network');
    expect(within(first).getByRole('link')).toHaveAttribute(
      'href',
      `/learn/level-1/${FIRST}`,
    );
    expect(first).toHaveTextContent(`${String(minutesOf(FIRST))} min`);
    expect(first).toHaveTextContent('Done');
    expect(row('LAN, WAN and MAN')).toHaveTextContent('In progress');
    expect(row('Topologies')).toHaveTextContent('Not started');
    expect(row('Topologies')).toHaveTextContent(
      `${String(minutesOf('l1-topologies'))} min`,
    );
  });

  it('shows "Lab done" only when every lab of the lesson is completed', () => {
    const base = stateOf({ [FIRST]: done(T1) });
    const { unmount } = renderCourseMap({
      state: withLabs(base, {
        'lab-a': { status: 'completed', completedAt: T1 },
        'lab-b': { status: 'completed', completedAt: T1 },
      }),
    });
    expect(row('What is a network')).toHaveTextContent('Lab done');
    unmount();

    renderCourseMap({
      state: withLabs(base, {
        'lab-a': { status: 'completed', completedAt: T1 },
        'lab-b': { status: 'started' },
      }),
    });
    expect(row('What is a network')).not.toHaveTextContent(/Lab/);
  });

  it('shows no lab marker for a lesson without labs, or when no lab is done', () => {
    renderCourseMap({
      state: withLabs(stateOf({ [SECOND]: done(T1) }), {
        'lab-a': { status: 'completed', completedAt: T1 },
      }),
    });

    expect(row('LAN, WAN and MAN')).not.toHaveTextContent(/Lab/);
    expect(row('What is a network')).not.toHaveTextContent(/Lab/);
  });

  it('in a partly built level, built lessons are links and the rest are plain "Coming soon"', () => {
    renderCourseMap({ levels: partlyBuilt });

    expect(
      within(row('What is a network')).getByRole('link'),
    ).toBeInTheDocument();
    const third = row('Topologies');
    expect(within(third).queryByRole('link')).toBeNull();
    expect(third).toHaveTextContent('Coming soon');
    expect(third).not.toHaveTextContent(/Not started|Done|In progress/);
    expect(screen.queryByRole('link', { name: /Topologies/ })).toBeNull();
    expect(
      screen.getByRole('img', { name: '0 of 2 lessons done' }),
    ).toBeInTheDocument();
  });

  it('a record for an unbuilt lesson does not show as done', () => {
    renderCourseMap({
      levels: partlyBuilt,
      state: stateOf({ [THIRD]: done(T1) }),
    });

    expect(row('Topologies')).not.toHaveTextContent('Done');
    expect(
      screen.getByRole('img', { name: '0 of 2 lessons done' }),
    ).toBeVisible();
  });

  it('rows in a level with no built lessons are plain text without repeated badges', () => {
    renderCourseMap();

    const section = screen.getAllByRole('region').at(1);
    expect(section).toBeDefined();
    if (section === undefined) return;
    const items = within(section).getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(1);
    for (const li of items) {
      expect(within(li).queryByRole('link')).toBeNull();
      expect(li).not.toHaveTextContent(/Not started|Done|In progress/);
    }
  });
});

describe('CourseMap edges', () => {
  it('builds each lesson link from the level section it sits in', () => {
    const levels = level1Built.map((level, i) =>
      i === 0
        ? {
            ...level,
            lessons: level.lessons.map((l) => ({ ...l, levelId: 'level-9' })),
          }
        : level,
    );
    renderCourseMap({ levels });

    expect(within(row('What is a network')).getByRole('link')).toHaveAttribute(
      'href',
      `/learn/level-1/${FIRST}`,
    );
    expect(screen.getByRole('link', { name: /^Start: / })).toHaveAttribute(
      'href',
      `/learn/level-1/${FIRST}`,
    );
  });

  it('hides the "N of M lessons done" summary until progress is ready', () => {
    const { unmount } = renderCourseMap({ ready: false });
    expect(screen.queryByText(/lessons? done/)).not.toBeInTheDocument();
    unmount();

    renderCourseMap({ ready: true });
    expect(screen.getByText('0 of 6 lessons done')).toBeInTheDocument();
  });

  it('does not read a prototype property as the record of a lesson named "constructor"', () => {
    const levels = level1Built.map((level, i) =>
      i === 0
        ? {
            ...level,
            lessons: level.lessons.map((l, n) =>
              n === 0 ? { ...l, id: 'constructor' } : l,
            ),
          }
        : level,
    );
    renderCourseMap({ levels });

    expect(row('What is a network')).toHaveTextContent('Not started');
    expect(screen.getByRole('link', { name: /^Start: / })).toHaveAttribute(
      'href',
      '/learn/level-1/constructor',
    );
  });

  it('uses an own record named "constructor" like any other', () => {
    const levels = level1Built.map((level, i) =>
      i === 0
        ? {
            ...level,
            lessons: level.lessons.map((l, n) =>
              n === 0 ? { ...l, id: 'constructor' } : l,
            ),
          }
        : level,
    );
    renderCourseMap({ levels, state: stateOf({ constructor: done(T1) }) });

    expect(row('What is a network')).toHaveTextContent('Done');
  });

  it('ignores a completed lab that is not one of the lesson labs', () => {
    renderCourseMap({
      state: withLabs(stateOf({ [FIRST]: done(T1) }), {
        'lab-a': { status: 'completed', completedAt: T1 },
        'lab-stranger': { status: 'completed', completedAt: T1 },
      }),
    });

    expect(row('What is a network')).not.toHaveTextContent('Lab done');
  });
});
