// TEMPLATE: owner must review before launch (see docs/OWNER-SETUP.md)
import { siteConfig } from '@/config/site';
import { ProsePage } from '@/pages/ProsePage';

export default function Terms() {
  const { name } = siteConfig;
  return (
    <ProsePage>
      <h1>Terms of Use</h1>
      <p>
        By using {name} you agree to these terms. If you do not agree, please do
        not use the site.
      </p>

      <h2>What {name} is</h2>
      <p>
        {name} is a free site that teaches computer networking with lessons,
        simulations, quizzes and labs. It is meant for learning.
      </p>

      <h2>Your account</h2>
      <p>
        Keep your password to yourself. You are responsible for what happens
        under your account. You can delete it at any time from your Profile
        page.
      </p>

      <h2>Using the site fairly</h2>
      <ul>
        <li>Do not try to break, overload or get around the site.</li>
        <li>
          Do not try to read or change other people&apos;s data. Each account
          can only see its own.
        </li>
        <li>
          The labs and simulators only use a pretend network inside the page.
          Where a lesson suggests a command on your own computer, use it only on
          your own device and network.
        </li>
      </ul>

      <h2>Our content</h2>
      <p>
        The lessons, simulations and quizzes belong to the people who made{' '}
        {name}. You may use them to learn and share links to them. Please do not
        copy the site and present it as your own.
      </p>

      <h2>No guarantees</h2>
      <p>
        We try to be accurate, but {name} is provided &ldquo;as is&rdquo;. It
        may contain mistakes, change, or be unavailable at times. To the extent
        the law allows, we are not liable for loss caused by using the site. Do
        not rely on it for anything safety-critical or for an exam without
        checking other sources.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The page always shows the current version,
        and using the site after a change means you accept it.
      </p>
    </ProsePage>
  );
}
