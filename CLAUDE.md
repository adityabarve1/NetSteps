# NetSteps: agent rules

NetSteps is a public site that teaches computer networking from zero to advanced. Every lesson pairs plain-English theory with a step-through simulation, a quiz and a hands-on lab. Stack: React + Vite + TypeScript (strict), React Router, CSS Modules + CSS variables, Supabase (Auth + Postgres + RLS) as the only backend, Vitest + Testing Library + vitest-axe, ESLint 9 flat config, Prettier, pnpm.

Read before working:

- Spec (read-only): `docs/superpowers/specs/2026-11-18-computer-networks-learning-site-design.md` (section numbers like §7 refer to it)
- Phase 1 plan: `docs/superpowers/plans/2026-11-19-phase-1-platform-and-level-1.md` (24 tasks; "Global Constraints" and "Review Focus" at the top)
- Skills in `.claude/skills/`: `netsteps-coding` (recipes for lessons, sims, labs, glossary, migrations, pages) and `netsteps-lesson-writing` (lesson text, quizzes, accuracy checklist). Use them for those jobs.

## Hard rules (from the plan's Global Constraints)

- pnpm only. Never `npm`, `npx` or `yarn`. One lockfile: `pnpm-lock.yaml`. One-off tools: `pnpm dlx`. `.claude/settings.json` has deny rules for both the Bash and PowerShell tools (`Bash(npm *)`, `PowerShell(npm *)`, and the same for `npx` and `yarn`; each needs its own entry). They follow the documented rule syntax but were not tested end to end, and they are guardrails, not a security boundary. The `only-allow pnpm` preinstall script and CI are the backstop.
- Supabase is the only backend. The browser holds only `VITE_SUPABASE_ANON_KEY`. No service-role key anywhere, ever. RLS on every table.
- Lesson content lives in code, not the database. A lesson id (`l1-what-is-a-network`) is never reused or renamed once progress could exist.
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, `VITE_ENABLE_GOOGLE`, `VITE_CONTACT_EMAIL`. `.env.local` is git-ignored; only `.env.example` is committed.
- The product name "NetSteps" is defined once, in `src/config/site.ts`. Never hard-code it elsewhere.
- English only. No leaderboard, notes, forum or admin CMS.
- Every lesson follows the 10-part recipe of spec §7: hook, analogy, learn (titled sections + "Go deeper" blocks), watch it, try it, practice lab, why it matters, 5-question quiz, recap with cheat sheet, next-lesson link.
- Progress rules (spec §10): opening a lesson while signed in writes `in_progress` once; a lesson is `completed` when the primary simulation reached its last step AND the quiz was submitted (any score); labs never gate completion; "continue" = most recently opened incomplete lesson, else next in course order; progress % = completed / built lessons. Never write progress on every click.
- Accessibility: keyboard operable, captions in an ARIA live region (`role="status"`), `prefers-reduced-motion` honored, light and dark themes, no horizontal scroll at phone width.
- Pure TypeScript, no React imports (ESLint enforces this) in: `src/netcore/**`, `src/content/lessons/**/logic.ts`, `src/progress/logic.ts`, `src/sim/playerReducer.ts`, `src/quiz/scoreQuiz.ts`, `src/labs/practice.ts`, `src/labs/builderReducer.ts`.

## Commands

| Command                        | Use                                                        |
| ------------------------------ | ---------------------------------------------------------- |
| `pnpm dev`                     | Vite dev server (http://localhost:5173)                    |
| `pnpm test <path>`             | Run one test file or folder while iterating (`vitest run`) |
| `pnpm check`                   | typecheck + lint + format check + all tests. The gate.     |
| `pnpm build`                   | `tsc -b` then `vite build`                                 |
| `pnpm format`                  | Prettier write (fixes `format:check` failures)             |
| `pnpm typecheck` / `pnpm lint` | Single steps of `pnpm check`                               |

`rls:check` (Task 3) and `seo`/`prebuild` (Task 22) scripts do not exist until those tasks land.

## Definition of done

1. Run `pnpm check`. It must pass with pristine output: no warnings, no skipped or `.only` tests.
2. Never claim success, "fixed" or "passing" without having run the command and read its output in this session.
3. For any UI change, open it in `pnpm dev`, exercise it in light and dark theme and at phone width, and say what you saw. Tests passing is not the same as the page working.
4. A phase is only done when `pnpm build` also passes and the Task 24 guest walkthrough works.

## TDD for pure logic

For the pure-logic files above: write the failing test first, run it and watch it fail for the right reason, then implement, then run it green. Tests sit beside the file (`logic.ts` and `logic.test.ts`). Include the awkward inputs: empty, malformed, boundary and hostile values must return a friendly result or throw a documented `RangeError`, never crash (Review Focus RF1 to RF5 in the plan name the cases that must be pinned).

## Code rules

- No `any`. No `@ts-ignore` (use `@ts-expect-error` with a reason only if truly unavoidable).
- Every `eslint-disable` needs a reason after `--` on the same comment. Unused disables are errors.
- Files stay under 300 lines (ESLint `max-lines`, blanks and comments excluded). Split by responsibility; lessons are split one file per section.
- Named exports everywhere, except lazy-loaded pages and lesson `index.tsx` (default export).
- Import from `src` with the `@/` alias. Exception: files run by `tsx` in `scripts/` cannot use `@/`; use relative paths and type-only imports.
- `import type` for types (`verbatimModuleSyntax` is on). `noUncheckedIndexedAccess` is on: handle `undefined` from index access.
- No `console` in `src/` (allowed in `scripts/`). Floating promises are errors: `await`, `.catch`, or `void` with a reason.
- React hooks rules are errors, including the React Compiler rules: do not call `setState` synchronously in an effect body; derive values during render or update state from event handlers and subscription callbacks.
- Styling: CSS Modules (`*.module.css`) and CSS variables from `src/theme/tokens.css`. No hard-coded colors or inline styles for theming.
- Tests: Testing Library queries by role/label, `userEvent`, and `vitest-axe` (`toHaveNoViolations`) for pages and components. `window.matchMedia` is stubbed to `matches: false` in `src/test/setup.ts`; override it in the test that needs a match. Add `// @vitest-environment node` at the top of tests that only touch the filesystem.

## Security rules

- Never commit secrets, `.env.local` or any key. The anon key is the only Supabase key the app may read.
- Every new table gets, in the same migration: `enable row level security`, explicit policies (`user_id = auth.uid()`; `profiles` uses `id = auth.uid()`), no anon access, `on delete cascade` to `auth.users`, AND a new case in `scripts/rls-check.ts`. Migrations are plain SQL in `supabase/migrations/`, numbered `000N_name.sql`.
- `security definer` functions set `search_path = ''`, revoke from `public, anon`, grant to `authenticated` only.
- Never use `dangerouslySetInnerHTML`, `innerHTML` or `eval`. Validate redirects with `safeNextPath`.
- Do not claim the database is verified until `pnpm rls:check` has run against a live project; until then write "RLS check pending owner setup".

## Safety rules for labs and exercises

- No scanning, hacking or attack tools in any exercise (no port scanners, packet crafting, exploits). Attack topics are simulation-only.
- "On your own computer" exercises use only safe, read-only commands (`ipconfig`, `ifconfig`, `ping`, `tracert`/`traceroute`, `nslookup`, `arp -a`, DevTools Network tab) and must say: use this only on your own device and network.
- Terminal and builder simulators never touch the real network; they only read the in-memory `Network` object.

## Process rules

- Follow the plan task by task, in order, and write the failing test first. Do not build features from later tasks early.
- Never edit the spec silently. If the spec or plan is wrong or ambiguous, stop and ask; if an edit is approved, say exactly what changed.
- Commits: conventional (`feat:`, `fix:`, `test:`, `chore:`, `docs:`) with the session's required `Co-Authored-By` trailer. Only commit when the owner wants local commits. Never push.
- Do not delete `docs/`, `.git/` or `.superpowers/`. Do not add dependencies the plan does not list without saying why.
- Keep changes small and in scope. No speculative abstractions, no unrequested files.

## Layout

```
src/config/site.ts      product name and env-derived config      src/lib/       supabase client, safeNext
src/theme/  src/layout/ shell, tokens, header, footer            src/routes.tsx src/main.tsx
src/auth/   src/progress/  accounts, pure progress logic, stores  src/pages/     route pages (lazy)
src/content/            types, curriculum, loaders, glossary, components, lessons/level1/<slug>/
src/sim/ src/quiz/ src/netcore/ src/labs/   step player, quiz, simulated network + terminal, labs
src/test/setup.ts       jest-dom + vitest-axe + matchMedia stub  scripts/       tsx scripts (rls-check, seo)
supabase/migrations/    plain SQL                                  docs/          spec, plans, owner setup
```

## Tooling notes

- TypeScript is pinned to 6.0.x because `typescript-eslint` does not support TypeScript 7 yet. ESLint is pinned to 9 (the plan's choice; `eslint-plugin-jsx-a11y` does not support 10). Do not upgrade either without checking `pnpm lint` still works.
- `vitest-axe` 0.1 does not type its matcher for Vitest 5, so `src/test/vitest-axe.d.ts` augments `vitest` itself.
- Line endings are LF everywhere (`.gitattributes`, Prettier `endOfLine: 'lf'`), even on Windows.
