import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/useAuth';
import { curriculum } from '@/content/curriculum';
import { DeleteAccountDialog } from '@/pages/DeleteAccountDialog';
import styles from '@/pages/Profile.module.css';
import { ProsePage } from '@/pages/ProsePage';
import { clearAccountData } from '@/progress/clearAccountData';
import { levelProgress, overallProgress } from '@/progress/logic';
import { useProgress } from '@/progress/useProgress';

// Signed-in only: the route sits inside <ProtectedRoute />.
export default function Profile() {
  const { user, deleteAccount } = useAuth();
  const { state, ready } = useProgress();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const overall = overallProgress(state, curriculum);
  const percent =
    overall.total === 0 ? 0 : Math.round((overall.done / overall.total) * 100);
  const labsDone = Object.values(state.labs).filter(
    (lab) => lab.status === 'completed',
  ).length;

  // Resolves to an error message, or null once the account is gone.
  async function remove(): Promise<string | null> {
    const result = await deleteAccount();
    if (!result.ok) return result.message;
    if (user !== null) clearAccountData(user.id);
    // Leave now, before the signed-out state sends this page to the login page.
    void navigate('/', { replace: true });
    return null;
  }

  return (
    <ProsePage>
      <h1>Profile</h1>
      <p>
        Signed in as <strong>{user?.email ?? 'your account'}</strong>
      </p>

      <h2>Your progress</h2>
      {ready ? (
        <>
          <p className={styles.overall}>
            <span className={styles.percent}>{percent}%</span> of the lessons
            built so far are done.
          </p>
          <ul className={styles.levels}>
            {curriculum.map((level) => {
              const { done, total } = levelProgress(state, level);
              const labelId = `profile-level-${String(level.number)}`;
              return (
                <li key={level.id} aria-labelledby={labelId}>
                  <span id={labelId}>
                    Level {level.number}: {level.title}
                  </span>
                  <span className={styles.count}>
                    {total === 0
                      ? 'Coming soon'
                      : `${String(done)} of ${String(total)} ${total === 1 ? 'lesson' : 'lessons'} done`}
                  </span>
                </li>
              );
            })}
          </ul>
          <p>
            {labsDone} {labsDone === 1 ? 'lab' : 'labs'} completed
          </p>
        </>
      ) : (
        <p role="status">Loading your progress…</p>
      )}

      <h2>Delete your account</h2>
      <p>
        This permanently removes your account and all of your progress. It
        cannot be undone.
      </p>
      <button
        type="button"
        className={styles.danger}
        onClick={() => {
          setDialogOpen(true);
        }}
      >
        Delete my account
      </button>
      {dialogOpen ? (
        <DeleteAccountDialog
          onConfirm={remove}
          onClose={() => {
            setDialogOpen(false);
          }}
        />
      ) : null}
    </ProsePage>
  );
}
