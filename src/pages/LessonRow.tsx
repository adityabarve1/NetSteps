import { Link } from 'react-router';
import type { LessonMeta } from '@/content/types';
import styles from '@/pages/CourseMap.module.css';
import type { LessonRecord } from '@/progress/types';

type Status = 'done' | 'in-progress' | 'not-started';

function statusOf(record: LessonRecord | undefined): Status {
  if (record === undefined) return 'not-started';
  return record.status === 'completed' ? 'done' : 'in-progress';
}

const STATUS_TEXT: Record<Status, string> = {
  done: 'Done',
  'in-progress': 'In progress',
  'not-started': 'Not started',
};

// A small picture next to the status words, so the status is never only a colour.
function StatusIcon({ status }: { status: Status }) {
  return (
    <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" className={styles.iconRing} />
      {status === 'done' && (
        <path d="M5 8.3l2 2 4-4.3" className={styles.iconMark} />
      )}
      {status === 'in-progress' && (
        <path d="M8 1.5a6.5 6.5 0 0 1 0 13z" className={styles.iconHalf} />
      )}
    </svg>
  );
}

type Props = {
  /** The id of the level section this row sits in; the link is built from it. */
  levelId: string;
  lesson: LessonMeta;
  record: LessonRecord | undefined;
  /** True when every lab of the lesson is completed (and it has labs). */
  labDone: boolean;
  /** Mark unbuilt lessons "Coming soon" (not needed when the level says so). */
  badgeUnbuilt: boolean;
};

export function LessonRow({
  levelId,
  lesson,
  record,
  labDone,
  badgeUnbuilt,
}: Props) {
  const minutes = `${String(lesson.minutes)} min`;

  if (!lesson.built) {
    return (
      <li className={styles.row}>
        <span className={styles.rowTitleText}>{lesson.title}</span>
        <span className={styles.meta}>{minutes}</span>
        {badgeUnbuilt && <span className={styles.soon}>Coming soon</span>}
      </li>
    );
  }

  const status = statusOf(record);
  return (
    <li className={styles.row}>
      <Link className={styles.rowLink} to={`/learn/${levelId}/${lesson.id}`}>
        {lesson.title}
      </Link>
      <span className={styles.meta}>{minutes}</span>
      <span className={styles.status} data-status={status}>
        <StatusIcon status={status} />
        {STATUS_TEXT[status]}
      </span>
      {labDone && <span className={styles.lab}>Lab done</span>}
    </li>
  );
}
