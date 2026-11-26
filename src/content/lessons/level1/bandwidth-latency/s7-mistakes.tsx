import styles from './lesson.module.css';
import { Myths } from './myths';

type Symptom = { sign: string; likely: string; check: string };

const SYMPTOMS: Symptom[] = [
  {
    sign: 'Pages pause before they start, but then load quickly',
    likely: 'Latency (and round trips)',
    check: 'Ping a nearby and a distant address and compare',
  },
  {
    sign: 'Online game lags, or a call has gaps',
    likely: 'Latency or jitter, maybe a busy Wi-Fi link',
    check: 'Ping repeatedly and watch how much the times vary',
  },
  {
    sign: 'Big downloads take a long time',
    likely: 'Bandwidth, or a slower part on the path',
    check: 'Run a speed test and compare it with your plan',
  },
  {
    sign: 'Video drops to a lower quality',
    likely: 'Bandwidth, often shared with other devices',
    check: 'Pause other downloads and streams and try again',
  },
];

/** Section 7: common mistakes and myths. */
export function CommonMistakes() {
  return (
    <>
      <p>
        Almost everyone mixes these ideas up at first. Here are the seven
        mix-ups to watch for, each with the fact beside it.
      </p>
      <Myths />
      <p className={styles.note}>
        If you remember one sentence from this lesson, make it this one:{' '}
        <strong>
          bandwidth is how wide the road is, latency is how long the road is,
          and the total time depends on both.
        </strong>
      </p>
    </>
  );
}

/** Go deeper: which number to blame. */
export function WhichToBlameDeeper() {
  return (
    <>
      <p>
        When something feels slow, the way it feels hints at which number is the
        problem. This is a starting point, not a diagnosis.
      </p>
      <div data-prose="">
        <table className={styles.table}>
          <caption>What it feels like and where to look first</caption>
          <thead>
            <tr>
              <th scope="col">What you notice</th>
              <th scope="col">Likely cause</th>
              <th scope="col">What to check</th>
            </tr>
          </thead>
          <tbody>
            {SYMPTOMS.map((s) => (
              <tr key={s.sign}>
                <th scope="row">{s.sign}</th>
                <td data-label="Likely cause">{s.likely}</td>
                <td data-label="What to check">{s.check}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        One more effect: a full upload or download can fill the queues in your
        router, which raises the latency for everything else. That is why a big
        upload can make a video call stutter even though the call itself needs
        little bandwidth.
      </p>
    </>
  );
}
