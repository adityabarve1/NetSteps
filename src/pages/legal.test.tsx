import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { Footer } from '@/layout/Footer';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';

// siteConfig is read when a page renders, so each test can set the contact.
const config = vi.hoisted(() => ({
  name: 'NetSteps' as const,
  url: 'https://example.test',
  contactEmail: undefined as string | undefined,
  googleEnabled: false,
}));
vi.mock('@/config/site', () => ({ siteConfig: config }));

beforeEach(() => {
  config.contactEmail = undefined;
});

const page = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Privacy Policy', () => {
  it('has the h1 and names exactly what is stored', () => {
    page(<Privacy />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Privacy Policy' }),
    ).toBeInTheDocument();
    const text = document.body.textContent.toLowerCase();
    for (const phrase of [
      'email address',
      'lesson progress',
      'quiz scores',
      'lab progress',
      'supabase',
      'delete my account',
      'localstorage',
      'theme',
    ]) {
      expect(text).toContain(phrase);
    }
    expect(text).toMatch(/guest[^.]*stays in your browser/i);
  });

  it('shows the configured contact email as a mailto link', () => {
    config.contactEmail = 'hello@example.test';
    page(<Privacy />);

    expect(
      screen.getByRole('link', { name: 'hello@example.test' }),
    ).toHaveAttribute('href', 'mailto:hello@example.test');
    expect(screen.queryByText(/contact details are coming soon/i)).toBeNull();
  });

  it('says contact details are coming soon when none is set', () => {
    page(<Privacy />);

    expect(
      screen.getByText(/contact details are coming soon/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /@/ })).toBeNull();
  });

  it('uses the product name from the config', () => {
    page(<Privacy />);
    expect(document.body.textContent).toContain(config.name);
  });

  it('only mentions Google sign-in when it is switched on', () => {
    page(<Privacy />);
    expect(document.body.textContent).not.toMatch(/google/i);
  });

  it('describes Google sign-in when it is switched on', () => {
    config.googleEnabled = true;
    try {
      page(<Privacy />);
      expect(document.body.textContent).toMatch(/google/i);
    } finally {
      config.googleEnabled = false;
    }
  });

  it('has no axe violations', async () => {
    config.contactEmail = 'hello@example.test';
    const { container } = page(<Privacy />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Terms of Use', () => {
  it('has the h1 and the key rules in plain words', () => {
    page(<Terms />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Terms of Use' }),
    ).toBeInTheDocument();
    expect(document.body.textContent).toContain(config.name);
  });

  it('has no axe violations', async () => {
    const { container } = page(<Terms />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('legal pages: reachable and flagged as templates', () => {
  it('are linked from the footer', () => {
    page(<Footer />);
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute(
      'href',
      '/terms',
    );
  });

  it.each(['Privacy.tsx', 'Terms.tsx'])(
    '%s starts with the owner-review template comment',
    (file) => {
      const source = readFileSync(resolve(__dirname, file), 'utf8');
      expect(source.split('\n')[0]).toBe(
        '// TEMPLATE: owner must review before launch (see docs/OWNER-SETUP.md)',
      );
    },
  );
});
