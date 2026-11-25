import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  FIRST,
  SECOND,
  THIRD,
  partlyBuilt,
  renderCourseMap,
} from '@/pages/courseMapTestKit';
import type { ProgressState } from '@/progress/types';
import { done, opened, stateOf, T1, T2 } from '@/test/progressFixtures';

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
    expect(first).toHaveTextContent('12 min');
    expect(first).toHaveTextContent('Done');
    expect(row('LAN, WAN and MAN')).toHaveTextContent('In progress');
    expect(row('Topologies')).toHaveTextContent('Not started');
    expect(row('Topologies')).toHaveTextContent('12 min');
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
