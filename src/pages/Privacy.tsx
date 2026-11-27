// TEMPLATE: owner must review before launch (see docs/OWNER-SETUP.md)
import { siteConfig } from '@/config/site';
import { ProsePage } from '@/pages/ProsePage';

function Contact() {
  const email = siteConfig.contactEmail;
  if (email === undefined) {
    return (
      <p>
        Contact details are coming soon. Until then, please ask the person who
        runs this site.
      </p>
    );
  }
  return (
    <p>
      Questions about your data? Write to{' '}
      <a href={`mailto:${email}`}>{email}</a>.
    </p>
  );
}

export default function Privacy() {
  const { name, googleEnabled } = siteConfig;
  return (
    <ProsePage>
      <h1>Privacy Policy</h1>
      <p>
        This page explains what {name} stores about you, where it is kept and
        how to remove it. We keep it short on purpose.
      </p>

      <h2>You can learn without an account</h2>
      <p>
        You do not need an account to use {name}. As a guest, your progress
        stays in your browser on your own device. We do not receive it.
      </p>

      <h2>What we store if you create an account</h2>
      <ul>
        <li>Your email address, to let you sign in.</li>
        <li>
          Your lesson progress: which lessons you opened and which you finished,
          with the dates.
        </li>
        <li>Your quiz scores: the score of each quiz you submit.</li>
        <li>Your lab progress: which labs you started and finished.</li>
        {googleEnabled ? (
          <li>
            If you sign in with Google, the name and email that Google shares
            with us.
          </li>
        ) : null}
      </ul>
      <p>We do not store anything else about you, and we do not sell data.</p>

      <h2>Where it is stored</h2>
      <p>
        Account data is stored with Supabase, a hosted database service. Your
        data is only readable by your own signed-in account. Passwords are
        handled by Supabase and are never shown to us.
      </p>

      <h2>Cookies and localStorage</h2>
      <p>
        {name} uses your browser&apos;s localStorage, not tracking cookies. It
        remembers your theme (light, dark or system), your guest progress, and,
        when you are signed in, your sign-in session and any progress that could
        not be sent yet because you were offline. We do not use analytics or
        advertising trackers.
      </p>

      <h2>Deleting your data</h2>
      <p>
        You can delete your account at any time from your Profile page by
        choosing &ldquo;Delete my account&rdquo;. This permanently removes your
        email, progress, quiz scores and lab progress from the database, and it
        cannot be undone. Guest progress is separate: clear your browser&apos;s
        site data to remove it.
      </p>

      <h2>Contact</h2>
      <Contact />
    </ProsePage>
  );
}
