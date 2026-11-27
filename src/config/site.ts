// The one place the product name and the env-derived settings are defined.
// Components read `siteConfig` instead of hard-coding the name.

const env: Record<string, string | undefined> = import.meta.env;

function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === '' ? undefined : trimmed;
}

const configuredUrl = trimmedOrUndefined(env.VITE_SITE_URL);

export interface SiteConfig {
  name: 'NetSteps';
  /** Public site URL without a trailing slash. */
  url: string;
  contactEmail: string | undefined;
  /** True only when Google sign-in has been switched on for this deployment. */
  googleEnabled: boolean;
}

export const siteConfig: SiteConfig = {
  name: 'NetSteps',
  url: (configuredUrl ?? window.location.origin).replace(/\/+$/, ''),
  contactEmail: trimmedOrUndefined(env.VITE_CONTACT_EMAIL),
  googleEnabled: trimmedOrUndefined(env.VITE_ENABLE_GOOGLE) === 'true',
};
