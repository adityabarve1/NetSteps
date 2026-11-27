import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AuthContext } from '@/auth/useAuth';
import type { AuthContextValue, AuthResult } from '@/auth/useAuth';
import Profile from '@/pages/Profile';
import { emptyProgress } from '@/progress/logic';
import type { ProgressState } from '@/progress/types';
import { ProgressContext } from '@/progress/useProgress';
import { deferred } from '@/test/fakeSupabase';
import { Elsewhere, Where } from '@/test/probes';
import { done, opened, stateOf, T1 } from '@/test/progressFixtures';

interface Options {
  status?: AuthContextValue['status'];
  state?: ProgressState;
  ready?: boolean;
  deleteAccount?: () => Promise<AuthResult>;
}

function renderProfile({
  status = 'signed-in',
  state = emptyProgress(),
  ready = true,
  deleteAccount = () => Promise.resolve({ ok: true }),
}: Options = {}) {
  const auth: AuthContextValue = {
    status,
    user:
      status === 'signed-in'
        ? { id: 'u1', email: 'ada@example.com', displayName: null }
        : null,
    passwordRecovery: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    updatePassword: vi.fn(),
    deleteAccount: vi.fn(deleteAccount),
    registerBeforeSignOut: () => () => undefined,
  };
  const progress = {
    state,
    ready,
    syncError: false,
    droppedCount: 0,
    openLesson: vi.fn(),
    submitQuiz: vi.fn(),
    completeLesson: vi.fn(),
    startLab: vi.fn(),
    completeLab: vi.fn(),
  };
  const view = render(
    <MemoryRouter initialEntries={['/profile']}>
      <AuthContext value={auth}>
        <ProgressContext value={progress}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="/" element={<Elsewhere />} />
            <Route path="/login" element={<h1>Login page</h1>} />
          </Routes>
          <Where />
        </ProgressContext>
      </AuthContext>
    </MemoryRouter>,
  );
  return { auth, ...view };
}

const L1 = 'l1-what-is-a-network';
const L2 = 'l1-lan-wan-man';

afterEach(() => {
  localStorage.clear();
});

type User = ReturnType<typeof userEvent.setup>;

async function openDialog(user: User) {
  await user.click(screen.getByRole('button', { name: 'Delete my account' }));
  return screen.getByRole('dialog');
}

async function confirmDelete(user: User) {
  await openDialog(user);
  await user.type(screen.getByLabelText(/Type DELETE/), 'DELETE');
  await user.click(
    screen.getByRole('button', { name: 'Delete my account forever' }),
  );
}

describe('Profile: the summary', () => {
  it('shows the email, overall percentage, per-level counts and finished labs', () => {
    renderProfile({
      state: {
        lessons: { [L1]: done(T1), [L2]: opened(T1) },
        labs: {
          'lab-a': { status: 'completed', completedAt: T1 },
          'lab-b': { status: 'started' },
          'lab-c': { status: 'completed', completedAt: T1 },
        },
      },
    });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Profile' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    // One of six built lessons is done.
    expect(screen.getByText('17%')).toBeInTheDocument();
    const level1 = screen.getByRole('listitem', { name: /Level 1/ });
    expect(within(level1).getByText('1 of 6 lessons done')).toBeInTheDocument();
    expect(screen.getByText('2 labs completed')).toBeInTheDocument();
  });

  it('shows 0% and 0 labs for a new learner, and unbuilt levels as coming soon', () => {
    renderProfile();

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 labs completed')).toBeInTheDocument();
    const level2 = screen.getByRole('listitem', { name: /Level 2/ });
    expect(within(level2).getByText('Coming soon')).toBeInTheDocument();
  });

  it('says "1 lab completed" in the singular', () => {
    renderProfile({
      state: { lessons: {}, labs: { x: { status: 'completed' } } },
    });
    expect(screen.getByText('1 lab completed')).toBeInTheDocument();
  });

  it('waits for progress to load instead of showing a false 0%', () => {
    renderProfile({ ready: false });
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.getByText('Loading your progress…')).toBeInTheDocument();
  });

  it('redirects a signed-out visitor to the login page with the way back', () => {
    renderProfile({ status: 'signed-out' });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/login?next=%2Fprofile',
    );
  });

  it('has no axe violations', async () => {
    const { container } = renderProfile({
      state: stateOf({ [L1]: done(T1) }),
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Profile: the delete dialog', () => {
  it('opens a labelled dialog and puts focus inside it', async () => {
    const user = userEvent.setup();
    renderProfile();

    const dialog = await openDialog(user);

    expect(dialog).toHaveAccessibleName('Delete your account?');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText(/Type DELETE/)).toHaveFocus();
  });

  it('keeps the confirm button disabled until DELETE is typed exactly', async () => {
    const user = userEvent.setup();
    renderProfile();
    await openDialog(user);
    const confirm = screen.getByRole('button', {
      name: 'Delete my account forever',
    });
    const field = screen.getByLabelText(/Type DELETE/);

    expect(confirm).toBeDisabled();
    await user.type(field, 'delete');
    expect(confirm).toBeDisabled();
    await user.clear(field);
    await user.type(field, 'DELETE');
    expect(confirm).toBeEnabled();
  });

  it('closes on Escape and on Cancel, returning focus to the trigger', async () => {
    const user = userEvent.setup();
    const { auth } = renderProfile();
    const trigger = screen.getByRole('button', { name: 'Delete my account' });

    await openDialog(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await openDialog(user);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(auth.deleteAccount).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup();
    renderProfile();
    const dialog = await openDialog(user);
    await user.type(screen.getByLabelText(/Type DELETE/), 'DELETE');

    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('has no axe violations with the dialog open', async () => {
    const user = userEvent.setup();
    const { container } = renderProfile();
    await openDialog(user);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Profile: deleting the account', () => {
  it("deletes, clears that account's queued writes, and goes to the home page", async () => {
    const user = userEvent.setup();
    localStorage.setItem('netsteps.pending.u1.000-a', '{}');
    localStorage.setItem('netsteps.pending.u2.000-a', '{}');
    const { auth } = renderProfile();

    await confirmDelete(user);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
    });
    expect(auth.deleteAccount).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('netsteps.pending.u1.000-a')).toBeNull();
    expect(localStorage.getItem('netsteps.pending.u2.000-a')).toBe('{}');
  });

  it('shows a failure in an alert, keeps the account and the queue, and allows a retry', async () => {
    const user = userEvent.setup();
    localStorage.setItem('netsteps.pending.u1.000-a', '{}');
    const { auth } = renderProfile({
      deleteAccount: () =>
        Promise.resolve({
          ok: false,
          message: 'We could not reach the server.',
        }),
    });

    await confirmDelete(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We could not reach the server.',
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/profile');
    expect(localStorage.getItem('netsteps.pending.u1.000-a')).toBe('{}');
    const confirm = screen.getByRole('button', {
      name: 'Delete my account forever',
    });
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => {
      expect(auth.deleteAccount).toHaveBeenCalledTimes(2);
    });
  });

  it('disables every button while deleting, so it cannot be sent twice', async () => {
    const user = userEvent.setup();
    const pending = deferred<AuthResult>();
    const { auth } = renderProfile({ deleteAccount: () => pending.promise });

    await confirmDelete(user);

    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(auth.deleteAccount).toHaveBeenCalledTimes(1);

    pending.resolve({ ok: false, message: 'Nope' });
    await screen.findByRole('alert');
  });
});
