# Owner setup checklist

Things only the site owner can do. Nothing here needs a secret in the code: the browser only ever holds the public anon key.

## 1. Deploy on Vercel

1. In Vercel: **Add New → Project → Import** the GitHub repo `adityabarve1/NetSteps`.
2. Production branch: the branch you want live (the work is on `phase-1-platform-and-level-1` until it is merged into `main`).
3. Framework preset **Vite**. `vercel.json` already sets install (`pnpm install --frozen-lockfile`), build (`pnpm build`), output (`dist`) and the single-page-app rewrite.
4. **Environment Variables** (Production and Preview). Copy the values from your own `.env.local`; never paste them in chat or commit them:

| Name                     | Value                                                                    |
| ------------------------ | ------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`      | your Supabase project URL                                                |
| `VITE_SUPABASE_ANON_KEY` | the public anon / publishable key only. Never a service-role/secret key. |
| `VITE_SITE_URL`          | the final site URL, no trailing slash (for example the `*.vercel.app` URL, then your domain) |
| `VITE_ENABLE_GOOGLE`     | `false` until Google sign-in is configured                               |
| `VITE_CONTACT_EMAIL`     | the address shown on the Privacy page (empty shows "coming soon")        |

   Without `VITE_SITE_URL` the build ships no sitemap, robots file or canonical/Open Graph URLs.
5. Deploy. After the first deploy, set `VITE_SITE_URL` to the real URL if you used a placeholder, and redeploy.

## 2. Supabase settings after deploy

- **Authentication → URL Configuration:** set **Site URL** to the deployed URL and add `<site url>/**` to **Redirect URLs** (also `http://localhost:5173/**` for local work).
- **Authentication → Providers → Email → Confirm email: turn it ON** for production. It was turned off only so `pnpm rls:check` could sign up throwaway users. With it off, anyone can create accounts with addresses they do not own.
- Anonymous sign-ins stay **off**.
- The project is labelled "production": treat it that way. Do not run `pnpm rls:check` against it with Confirm email on.
- Google sign-in is off. To enable: configure the provider in Supabase, then set `VITE_ENABLE_GOOGLE=true`.

## 3. Before real users

- **Review the Privacy and Terms pages.** They are plain-language templates (`// TEMPLATE` at the top of each file), not legal advice.
- Choose and set `VITE_CONTACT_EMAIL`.
- Open the live site and try: guest walkthrough of a lesson, sign up, sign in, progress sync, sign out, delete account (use a throwaway account).
- Check the live site in light and dark theme and at phone width.

## 4. Known limits

- Progress sync with the live service has been checked by the RLS check script, not end to end in a browser.
- The main script bundle is above Vite's 500 kB warning size for some chunks.
- Terminal simulator uses macOS-style "Request timeout" wording for Unix pings; Windows output differs.
