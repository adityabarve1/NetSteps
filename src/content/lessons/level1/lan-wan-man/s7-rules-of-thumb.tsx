import styles from './lesson.module.css';

type Case = { case: string; byDistance: string; inPractice: string };

const CASES: Case[] = [
  {
    case: 'A university campus 5 km across, run by one IT team',
    byDistance: 'MAN',
    inPractice: 'Usually called a campus LAN, because one owner runs it.',
  },
  {
    case: 'Two offices of one firm in the same city, joined by a rented line',
    byDistance: 'MAN',
    inPractice:
      'Often called a WAN, because the line is rented from a provider.',
  },
  {
    case: 'Two buildings 1 km apart, joined by a fibre cable the owner laid',
    byDistance: 'LAN',
    inPractice: 'Called a LAN. Both the distance and the owner agree.',
  },
  {
    case: 'A video call from your bedroom to another country',
    byDistance: 'WAN',
    inPractice:
      'Your home is a LAN. The call also crosses WANs and the wider internet.',
  },
];

/** Section 7: the distance limits are rules of thumb. */
export function RulesOfThumb() {
  return (
    <>
      <p>
        This lesson used four distance limits: about 10 metres for a PAN, up to
        about 2 kilometres for a LAN, up to about 100 kilometres for a MAN, and
        more than that for a WAN. They are <strong>rules of thumb</strong>. No
        official standard fixes these exact numbers, and different books and
        teachers pick different ones. Use them to get a first guess, then ask
        better questions.
      </p>

      <h3>Three questions that work better than a number</h3>
      <ol>
        <li>
          <strong>How far apart are the devices?</strong> This gives the first
          guess.
        </li>
        <li>
          <strong>Who runs the links?</strong> One owner points to a LAN. Lines
          rented from a provider point to a WAN.
        </li>
        <li>
          <strong>What joins the devices?</strong> Cables and Wi-Fi inside one
          site are typical for a LAN. Long-distance lines are typical for a WAN.
        </li>
      </ol>

      <h3>Four awkward cases</h3>
      <div data-prose="">
        <table className={styles.table}>
          <caption>
            When distance and everyday use do not give the same answer.
          </caption>
          <thead>
            <tr>
              <th scope="col">Case</th>
              <th scope="col">By distance</th>
              <th scope="col">In practice</th>
            </tr>
          </thead>
          <tbody>
            {CASES.map((c) => (
              <tr key={c.case}>
                <th scope="row">{c.case}</th>
                <td data-label="By distance">{c.byDistance}</td>
                <td data-label="In practice">{c.inPractice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        None of these cases is a mistake. The names are tools for talking, and a
        good engineer says what they mean: &ldquo;a campus LAN across five
        kilometres&rdquo; says more than any single word.
      </p>
    </>
  );
}

/** Go deeper: technology has outgrown the old numbers. */
export function OutgrownDeeper() {
  return (
    <>
      <p>
        In the past, each size often needed its own technology. That is less
        true now. Ethernet, the usual LAN technology, can run over fibre for
        long distances too: some fibre versions reach 10 kilometres and others
        40 kilometres without extra equipment. That is the distance of a MAN,
        reached with a LAN technology.
      </p>
      <p>
        So when you meet one of these names in a book or a job advert, ask what
        it means there. The ownership question (who runs it?) stays useful
        longer than the distance question.
      </p>
    </>
  );
}
