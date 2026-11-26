import { useEffect, useId, useMemo, useRef } from 'react';
import { GoDeeper } from '@/content/components/GoDeeper';
import { LessonSection } from '@/content/components/LessonSection';
import { TableOfContents } from '@/content/components/TableOfContents';
import type { Lesson, LessonMeta } from '@/content/types';
import { LabFrame } from '@/pages/LabFrame';
import { LessonRunContext } from '@/pages/lessonRun';
import styles from '@/pages/LessonPage.module.css';
import { NextLesson } from '@/pages/NextLesson';
import { useDocumentTitle } from '@/pages/useDocumentTitle';
import { useActiveSection } from '@/pages/useActiveSection';
import { useLessonTracking } from '@/pages/useLessonTracking';
import { Quiz } from '@/quiz/Quiz';

type Part = { id: string; title: string };

// The fixed parts after the lesson's own sections, as the table of contents
// lists them.
function laterParts(lesson: Lesson): Part[] {
  return [
    { id: 'try-it', title: 'Try it yourself' },
    ...(lesson.labs.length > 0
      ? [{ id: 'practice-lab', title: 'Practice lab' }]
      : []),
    ...(lesson.realComputer !== undefined
      ? [{ id: 'on-your-computer', title: 'On your own computer' }]
      : []),
    { id: 'why-it-matters', title: 'Why it matters' },
    { id: 'check-yourself', title: 'Check yourself' },
    { id: 'recap', title: 'Recap' },
  ];
}

// The lesson loads after the route change, so the route change's focus could
// only land on <main> (or nowhere, after a retry removed the focused status).
// When the lesson shows, move focus to its h1 so a keyboard or screen reader
// user starts at the top. Only when focus is still on the page itself: if the
// learner already moved it to something, leave it there. That also makes
// StrictMode's second effect a no-op, since the h1 already has focus.
function useFocusHeading() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const active = document.activeElement;
    if (
      active === null ||
      active === document.body ||
      active.tagName === 'MAIN'
    ) {
      heading.current?.focus({ preventScroll: true });
    }
  }, []);
  return heading;
}

// One loaded lesson, in the order of spec section 7. The lesson owns where its
// simulation goes (inside a section body, using useLessonRun); this page only
// tracks progress. The parent keys this component by lesson id, so everything
// here starts fresh for each lesson.
export function LessonView({
  lesson,
  meta,
}: {
  lesson: Lesson;
  meta: LessonMeta;
}) {
  const tracking = useLessonTracking(lesson);
  useDocumentTitle(meta.title);
  const analogyId = useId();
  const headingRef = useFocusHeading();

  const parts = useMemo(
    () => [
      ...lesson.sections.map(({ id, title }) => ({ id, title })),
      ...laterParts(lesson),
    ],
    [lesson],
  );
  const ids = useMemo(() => parts.map((part) => part.id), [parts]);
  const activeId = useActiveSection(ids);

  return (
    <LessonRunContext value={tracking.run}>
      <article className={styles.page}>
        <h1 ref={headingRef} className={styles.title} tabIndex={-1}>
          {meta.title}
        </h1>
        <p className={styles.hook}>{lesson.hook}</p>

        <section className={styles.analogy} aria-labelledby={analogyId}>
          <h2 id={analogyId} className={styles.cardTitle}>
            Think of it like this
          </h2>
          {lesson.analogy}
        </section>

        <div className={styles.layout}>
          <div className={styles.tocColumn}>
            <TableOfContents sections={parts} activeId={activeId} />
          </div>
          <div className={styles.content}>
            {lesson.sections.map((section) => (
              <LessonSection
                key={section.id}
                id={section.id}
                title={section.title}
              >
                {section.body}
                {section.deeper?.map((block) => (
                  <GoDeeper key={block.title} title={block.title}>
                    {block.body}
                  </GoDeeper>
                ))}
              </LessonSection>
            ))}

            <LessonSection id="try-it" title="Try it yourself">
              <div className={styles.card}>{lesson.tryIt}</div>
            </LessonSection>

            {lesson.labs.length > 0 && (
              <LessonSection id="practice-lab" title="Practice lab">
                {lesson.labs.map((lab) => (
                  <LabFrame key={lab.id} lab={lab} />
                ))}
              </LessonSection>
            )}

            {lesson.realComputer !== undefined && (
              <LessonSection id="on-your-computer" title="On your own computer">
                {lesson.realComputer}
                <p className={styles.safety}>
                  Only do this on your own device and network.
                </p>
              </LessonSection>
            )}

            <LessonSection id="why-it-matters" title="Why it matters">
              {lesson.whyItMatters}
            </LessonSection>

            <LessonSection id="check-yourself" title="Check yourself">
              <div className={styles.quizWrap}>
                <Quiz
                  key={lesson.id}
                  questions={lesson.quiz}
                  onSubmit={tracking.onQuizSubmit}
                  previousBest={tracking.previousBest}
                />
              </div>
            </LessonSection>

            <LessonSection id="recap" title="Recap">
              <p className={styles.oneLine}>{lesson.recap.oneLine}</p>
              <ul className={styles.takeaways}>
                {lesson.recap.takeaways.map((takeaway) => (
                  <li key={takeaway}>{takeaway}</li>
                ))}
              </ul>
              <div className={styles.card}>{lesson.recap.cheatSheet}</div>
            </LessonSection>

            <NextLesson lessonId={lesson.id} />
          </div>
        </div>
      </article>
    </LessonRunContext>
  );
}
