# NetSteps Phase 1 (Platform + Level 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NetSteps app (landing, auth, saved progress, course map, lesson page, step player, quiz, glossary, lab framework) plus Level 1 (6 full-depth lessons, each with a simulation and a lab), ready to deploy.

**Architecture:** A React + Vite + TypeScript single-page app. Networking logic, progress logic and the simulated-network engine are pure TypeScript (no React) and unit-tested; React components only render state produced by that logic. Supabase (Auth + Postgres + RLS) is the only backend; lessons live in code and load lazily. Progress goes to `localStorage` for guests and to Supabase for signed-in users, merged on first sign-in.

**Tech Stack:** pnpm, React, React Router, TypeScript (strict), Vite, Vitest + Testing Library + vitest-axe, ESLint 9 (flat config) + typescript-eslint + jsx-a11y + react-hooks, Prettier, CSS Modules + CSS variables, `@supabase/supabase-js`, `tsx` for scripts.

**Spec:** `docs/superpowers/specs/2026-11-18-computer-networks-learning-site-design.md` (read it first; section numbers below refer to it).

## Global Constraints

- **pnpm only.** Never `npm`, `npx` or `yarn`; one lockfile `pnpm-lock.yaml`; use `pnpm dlx` for one-off tools. (§5)
- React + Vite + TypeScript **strict**. Supabase is the **only** backend: browser holds only `VITE_SUPABASE_ANON_KEY`; **no service-role key** anywhere; **RLS on every table**. (§5, §10)
- Lesson content lives in code, not the database. Lesson IDs are never reused or renamed once progress could exist. (§5)
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`, plus `VITE_ENABLE_GOOGLE` and `VITE_CONTACT_EMAIL` (plan additions). `.env.local` is git-ignored; only `.env.example` is committed.
- Product name **NetSteps**, defined once in `src/config/site.ts`.
- English only. No leaderboard, notes, forum or admin CMS. No scanning, hacking or attack tools in any exercise; real-computer exercises use only safe read-only commands on the learner's own device and say so. (§3)
- Every lesson follows the 10-part recipe of §7: hook, analogy, learn (titled sections + "Go deeper" blocks), watch it, try it, practice lab, why it matters, 5-question quiz, recap with cheat sheet, next-lesson link. No word limit on theory; plain-language rules of §7 apply (short sentences, ~8th-grade core text, terms defined on first use via the glossary).
- Progress rules (§10): open a lesson while signed in writes `in_progress` once; a lesson is `completed` when the primary simulation reached its last step **and** the quiz was submitted (any score); labs never gate completion; "continue" = most recently opened incomplete lesson, else next in course order; progress % = completed ÷ built lessons.
- Accessibility (§2): keyboard operable, captions in an ARIA live region, `prefers-reduced-motion` honored, light/dark themes, phone-width layout with no horizontal scroll.
- Networking logic is pure TypeScript, separate from rendering, and unit-tested with Vitest (§8). No React imports in `src/netcore/**`, `src/content/lessons/**/logic.ts`, `src/progress/logic.ts`, `src/progress/parse.ts`, `src/sim/playerReducer.ts`, `src/quiz/scoreQuiz.ts`, `src/labs/practice.ts`, `src/labs/builderReducer.ts`.
- Definition of done for every task: `pnpm check` (typecheck + lint + format check + tests) passes. Phase done: also `pnpm build` passes and the walkthrough in Task 24 works.
- Commits: conventional commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`) ending with the session's required `Co-Authored-By` trailer. Commit steps run only after the owner has confirmed local commits are wanted; never push.

## Review Focus

Behaviors the spec implies but never states, most likely to bite a real user first. Each has a pinning test in the owning task (tagged RF1 to RF5).

1. **RF1 — Hostile or sloppy addresses** typed into the terminal or builder (`ping 999.1.1.1`, `ping` with no argument, `01.2.3.4`, blank mask, extra spaces, upper-case commands): friendly error output, never a crash. (Tasks 10, 11, 12)
2. **RF2 — `localStorage` unavailable or corrupt** (private window, quota full, hand-edited JSON): the app still works as a guest, keeps progress in memory for the session, never throws. (Tasks 2, 6)
3. **RF3 — Supabase write fails or the user is offline**: completion and quiz scores are not lost; the write is queued and retried on next load or the `online` event; no unhandled promise rejection. (Task 6)
4. **RF4 — Unknown or "coming soon" lesson URLs** (`/learn/level-9/x`, a level-2 lesson id, mismatched level/lesson): friendly not-found page, and no progress row is ever written for an unknown lesson id. (Task 15)
5. **RF5 — Two accounts on one browser**: signing out clears the previous account's progress from the screen and from `localStorage`; the next account never inherits it; guest progress merges only into the account that signs in right after it was made. (Task 6)

---

## File Structure

```
CLAUDE.md                                  agent rules (Task 1)
.claude/settings.json                      deny npm/yarn/npx (Task 1)
.claude/skills/netsteps-coding/SKILL.md     how to add code, sims, labs, migrations (Task 1)
.claude/skills/netsteps-lesson-writing/SKILL.md  lesson recipe + accuracy checklist (Task 1)
.github/workflows/ci.yml                   install, check, build (Task 1)
eslint.config.js  prettier.config.js  vite.config.ts  tsconfig*.json  vercel.json  .env.example
supabase/migrations/0001_init.sql          tables, RLS, triggers, delete function (Task 3)
scripts/rls-check.ts  scripts/make-seo.ts  scripts/make-og.ts
docs/OWNER-SETUP.md  README.md
src/config/site.ts            src/lib/{supabase,safeNext}.ts
src/theme/   src/layout/      src/routes.tsx  src/main.tsx
src/auth/    src/progress/    src/content/{types,curriculum,loaders}.ts
src/content/{glossary,components,lessons/level1}/
src/sim/     src/quiz/        src/netcore/    src/labs/    src/pages/    src/test/
```

---

### Task 1: Scaffold, tooling, agent rules and skills

**Files:**
- Create: everything under "File Structure" marked Task 1, `package.json`, `.gitignore`, `.env.example`, `src/tooling.test.ts`, `src/test/setup.ts`
- Test: `src/tooling.test.ts`

**Interfaces:**
- Produces: scripts `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `format:check`, `test` (`vitest run`), `check` (`typecheck && lint && format:check && test`), path alias `@/` → `src/`.

- [ ] **Step 1: Write the failing tooling-guard test** in `src/tooling.test.ts` asserting: `package.json` `packageManager` starts with `pnpm@`; `package-lock.json` and `yarn.lock` do not exist; `.env.example` contains all five env names from Global Constraints; `CLAUDE.md` exists and mentions `pnpm check`; each `.claude/skills/*/SKILL.md` starts with frontmatter containing `name:` and `description:`; `.claude/settings.json` denies `npm`, `yarn` and `npx` Bash commands.
- [ ] **Step 2: Scaffold in place** (project root is the current folder): `pnpm create vite . --template react-ts`, then add all dependencies listed in Tech Stack with `pnpm add` / `pnpm add -D`; set `packageManager` to the installed pnpm, `engines.node >=22`, and a `preinstall` of `only-allow pnpm`; approve esbuild's build script with `pnpm approve-builds` if pnpm asks. Never delete `docs/`, `.git/` or `.superpowers/`; if `create vite` refuses a non-empty directory, scaffold in a temporary folder and move the files in. Run `pnpm test` → the guard test FAILS on the missing rule files.
- [ ] **Step 3: Configure tooling.** `tsconfig` strict plus `noUncheckedIndexedAccess`; Vitest config inside `vite.config.ts` (jsdom, `src/test/setup.ts` registering jest-dom and vitest-axe matchers, CSS modules enabled). ESLint flat config: typescript-eslint `strictTypeChecked` + `stylisticTypeChecked`, react-hooks (errors), jsx-a11y recommended, react-refresh, prettier last; extra rules: `no-explicit-any`, `no-floating-promises`, `consistent-type-imports`, `max-lines` 300 (skip blanks and comments), `no-console` (allowed in `scripts/`), `reportUnusedDisableDirectives: error`; `no-restricted-imports` banning `react*` inside the pure-logic paths listed in Global Constraints (including `src/content/lessons/**/logic.ts`). Prettier: defaults plus `singleQuote: true` and `endOfLine: 'lf'`. Vitest `include`: `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.ts`. The repo is developed on Windows, so add `.gitattributes` (`* text=auto eol=lf`) and a `.prettierignore` listing `docs`, `.superpowers`, `.claude`, `dist`, `coverage`, `pnpm-lock.yaml`. `src/test/setup.ts` also stubs `window.matchMedia` (default `matches: false`) because jsdom lacks it. Do not add `rls:check` (Task 3) or `seo`/`prebuild` (Task 22) scripts yet: their files do not exist.
- [ ] **Step 4: Write the agent rules.** `CLAUDE.md` (under ~150 lines): project summary and links to spec + plans; the Global Constraints as hard rules; commands (`pnpm dev/test/check/build`); definition of done (run `pnpm check`, never claim success without its output, look at UI changes in `pnpm dev`); TDD for pure-logic folders; code rules (no `any`, no `@ts-ignore`, every `eslint-disable` needs a reason comment, files under 300 lines, named exports except lazy pages/lessons, `@/` imports); security rules (no secrets committed, anon key only, every new table gets RLS + policies + a case in `scripts/rls-check.ts`, no `dangerouslySetInnerHTML`); safety rules for labs; process rules (follow the plan task by task, never edit the spec silently, ask when ambiguous). `.claude/skills/netsteps-coding/SKILL.md`: step-by-step recipes for adding a lesson, simulation, lab task, glossary term, migration and page, with the file locations and test patterns from this plan. `.claude/skills/netsteps-lesson-writing/SKILL.md`: the §7 recipe, language rules, an analogy bank, quiz-writing rules (5 questions, one clearly correct answer, explanation for every option), and an accuracy checklist (every number, protocol name and behavior double-checked; simplify wording, never the truth). `.claude/settings.json`: deny `Bash(npm *)`, `Bash(yarn *)`, `Bash(npx *)` (use the `update-config` skill to write it correctly). `.github/workflows/ci.yml`: Node + pnpm setup, `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm build`. `.gitignore`: `node_modules`, `dist`, `.env*` except `.env.example`, `coverage`.
- [ ] **Step 5: Verify.** Run `pnpm check` → PASS (guard test now green). Run `pnpm build` → PASS. Run `git init`.
- [ ] **Step 6: Commit** `chore: scaffold NetSteps with pnpm, eslint, vitest and agent rules`.

### Task 2: App shell, theme, routing skeleton

**Files:**
- Create: `src/theme/{tokens.css,global.css,ThemeProvider.tsx,useTheme.ts}`, `src/layout/{Layout.tsx,Header.tsx,Footer.tsx}`, `src/config/site.ts`, `src/routes.tsx`, `src/pages/NotFound.tsx`, placeholder pages (`Landing`, `CourseMap`, `LessonPage`, `Profile`, `Privacy`, `Terms`, `Login`, `Signup`, `ForgotPassword`, `ResetPassword`, `AuthCallback`, each a heading only)
- Test: `src/theme/ThemeProvider.test.tsx`, `src/routes.test.tsx`

**Interfaces:**
- Produces: `type ThemeMode = 'light' | 'dark' | 'system'`; `useTheme(): { mode: ThemeMode; resolved: 'light' | 'dark'; setMode(m: ThemeMode): void }`; `siteConfig: { name: 'NetSteps'; url: string; contactEmail: string | undefined; googleEnabled: boolean }`; route table from §9 using `/learn/:levelId/:lessonId`; all pages lazy-loaded.
- Visual: warm cream light theme (`--bg: #f4ebe0`) with a matching dark theme, rounded cards, CSS variables only.

- [ ] **Step 1: Write failing tests.** ThemeProvider: default mode is `system`; `setMode('dark')` sets `document.documentElement.dataset.theme === 'dark'` and stores `netsteps.theme`; `system` follows a mocked `matchMedia('(prefers-color-scheme: dark)')`; **RF2:** when `localStorage.getItem`/`setItem` throw, the provider still renders and switching works. Routes: each path in the §9 table renders its page heading; unknown path renders "Page not found" with a link to `/`; Layout has no axe violations (`toHaveNoViolations`).
- [ ] **Step 2: Run** `pnpm test src/theme src/routes.test.tsx` → FAIL.
- [ ] **Step 3: Implement** the files above. Header: logo/name, links (Learn, Sign in or Profile placeholder), theme toggle button with accessible name; Footer: Privacy and Terms links. Mobile: header collapses without horizontal scroll.
- [ ] **Step 4: Run** `pnpm check` → PASS. Open `pnpm dev` and look at the shell in light and dark.
- [ ] **Step 5: Commit** `feat: app shell with theme and routing`.

### Task 3: Database schema, RLS and Supabase client

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `scripts/rls-check.ts`, `src/lib/supabase.ts`
- Test: `src/lib/supabase.test.ts`

**Interfaces:**
- Produces: `getSupabase(): SupabaseClient | null` (returns `null` when URL or anon key is missing, so the app still runs in guest-only mode); `isSupabaseConfigured(): boolean`.
- Tables (§10): `profiles(id uuid pk → auth.users on delete cascade, display_name, created_at)`, `lesson_progress(user_id, lesson_id text, status check in_progress|completed, last_opened_at, completed_at, updated_at, pk(user_id, lesson_id))`, `quiz_attempts(id, user_id, lesson_id, score, total, created_at)`, `lab_progress(user_id, lab_id text, status check started|completed, completed_at, updated_at, pk(user_id, lab_id))`; all `user_id` FKs `on delete cascade`.

- [ ] **Step 1: Write failing test** `src/lib/supabase.test.ts`: with env unset `getSupabase()` returns `null` and `isSupabaseConfigured()` is `false`; with env set it returns a client created once (same instance on repeat calls); the module never reads any env name containing `SERVICE_ROLE`.
- [ ] **Step 2: Run** `pnpm test src/lib` → FAIL.
- [ ] **Step 3: Implement** `getSupabase`. Write `0001_init.sql`: the four tables; `enable row level security` on each; policies granting `select/insert/update` only where `user_id = auth.uid()` (`profiles`: `id = auth.uid()`), no delete policy and no anon access; trigger `handle_new_user` creating the profile row on sign-up; a `before update` trigger on `lesson_progress` that keeps `status = 'completed'` and the original `completed_at` once completed (stops a stale device downgrading a lesson); `delete_my_account()` as `security definer` with `set search_path = ''`, deleting `auth.users` row for `auth.uid()` only, `revoke ... from public, anon`, `grant execute ... to authenticated`.
- [ ] **Step 4: Write `scripts/rls-check.ts`** and add the `rls:check` script (`tsx scripts/rls-check.ts`) to `package.json` (reads `.env.local`, uses only the anon key): creates two random users; asserts user A cannot select or modify B's rows in all four tables, an unauthenticated client reads zero rows, A cannot insert a row with B's `user_id`, a completed lesson cannot be downgraded, `delete_my_account` removes the caller's rows and not the other user's; cleans up both users via `delete_my_account`. Exit non-zero on any failure.
- [ ] **Step 5: Verify.** `pnpm check` → PASS. `pnpm rls:check` runs only after the owner has done the Supabase part of Task 24's checklist; until then record "RLS check pending owner setup" and do not claim the schema verified.
- [ ] **Step 6: Commit** `feat: supabase schema with RLS and client`.

### Task 4: Authentication

**Files:**
- Create: `src/lib/safeNext.ts`, `src/auth/{AuthProvider.tsx,useAuth.ts,ProtectedRoute.tsx}`, `src/auth/pages/*` (replace placeholders: `Login`, `Signup`, `ForgotPassword`, `ResetPassword`, `AuthCallback`)
- Test: `src/lib/safeNext.test.ts`, `src/auth/AuthProvider.test.tsx`, `src/auth/pages/auth-pages.test.tsx`

**Interfaces:**
- Consumes: `getSupabase`, `siteConfig.googleEnabled`.
- Produces: `safeNextPath(raw: string | null): string` (returns `/learn` unless `raw` starts with a single `/` and not `//` or a scheme); `type AppUser = { id: string; email: string | null; displayName: string | null }`; `useAuth(): { status: 'loading' | 'signed-out' | 'signed-in' | 'unconfigured'; user: AppUser | null; signUp(email: string, password: string): Promise<AuthResult>; signIn(email: string, password: string): Promise<AuthResult>; signInWithGoogle(): Promise<AuthResult>; signOut(): Promise<void>; resetPassword(email: string): Promise<AuthResult>; updatePassword(password: string): Promise<AuthResult>; deleteAccount(): Promise<AuthResult> }` where `type AuthResult = { ok: true } | { ok: false; message: string }`; `<ProtectedRoute>` redirects signed-out users to `/login?next=<path>`.

- [ ] **Step 1: Write failing tests** (mock the Supabase client by injecting it into `AuthProvider`): `safeNextPath('/learn/level-1')` returns it; `'//evil.com'`, `'https://evil.com'`, `'/\\evil.com'`, `''` and `null` all return `/learn`; provider status moves `loading → signed-out → signed-in` on session events and back on sign out; `unconfigured` when `getSupabase()` is `null` and the pages show "Sign-in isn't set up yet" plus a "continue as guest" link; signup rejects passwords under 8 characters and requires the Privacy/Terms consent checkbox; a wrong password shows the Supabase error message in an `role="alert"`; the Google button renders only when `googleEnabled`; `ProtectedRoute` redirects signed-out `/profile` to `/login?next=%2Fprofile`; `AuthCallback` redirects to the sanitized `next` once a session exists.
- [ ] **Step 2: Run** `pnpm test src/lib src/auth` → FAIL.
- [ ] **Step 3: Implement.** Forms are labelled, keyboard operable, show inline errors, and have links between login/signup/forgot. Redirect URLs use `siteConfig.url`. Update `Header` so it shows "Sign in" when signed out and a "Profile" link when signed in (add a Header test for both). Wire `AuthProvider` into `main.tsx`. `/profile` becomes a `ProtectedRoute`, so update `src/routes.test.tsx` (signed-out `/profile` now redirects to `/login?next=%2Fprofile`; every other page keeps its heading).
- [ ] **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: authentication with email and optional google`.

### Task 5: Progress logic (pure)

**Files:**
- Create: `src/progress/{types.ts,logic.ts}`
- Test: `src/progress/logic.test.ts`

**Interfaces:**
- Produces (in `types.ts`): `type LessonId = string`; `type CurriculumLevel = { lessons: { id: LessonId; built: boolean }[] }` (the minimal shape the logic needs; Task 7's `LevelMeta` satisfies it); `type LessonRecord = { status: 'in_progress' | 'completed'; lastOpenedAt: string; completedAt?: string; quizBest?: { score: number; total: number } }`; `type LabRecord = { status: 'started' | 'completed'; completedAt?: string }`; `type ProgressState = { lessons: Record<LessonId, LessonRecord>; labs: Record<string, LabRecord> }`.
- Produces (in `logic.ts`, all pure, ISO strings for time): `emptyProgress()`, `openLesson(s, id, at)`, `submitQuiz(s, id, score, total, at)`, `completeLesson(s, id, at)`, `startLab(s, labId, at)`, `completeLab(s, labId, at)`, `mergeProgress(a, b)`, `continueTarget(s, levels: CurriculumLevel[]): LessonId | null`, `levelProgress(s, level: CurriculumLevel): { done: number; total: number }`, `overallProgress(s, levels: CurriculumLevel[]): { done: number; total: number }`, `canComplete(run: { primarySimFinished: boolean; quizSubmitted: boolean }): boolean`.

- [ ] **Step 1: Write failing tests.** `openLesson` on empty → `in_progress` with `lastOpenedAt`; on a completed lesson keeps `completed` but updates `lastOpenedAt`. `submitQuiz` keeps the best ratio (3/5 then 2/5 → 3/5; then 5/5 → 5/5) and creates the record if absent. `completeLesson` sets `completedAt` once (second call keeps the first time). `mergeProgress`: completed beats in_progress, earliest `completedAt`, latest `lastOpenedAt`, higher quiz ratio, completed lab beats started. `continueTarget`: most recently opened incomplete lesson; if none, first incomplete built lesson in course order; `null` when all built lessons are done or none built; ignores unbuilt lessons. `levelProgress` for 6 built lessons with 2 completed → `{ done: 2, total: 6 }`; records for lesson ids not in the curriculum are ignored; an all-unbuilt level → `{ done: 0, total: 0 }`. `canComplete`: true only when both flags true (quiz-first-then-sim and sim-first-then-quiz both end true).
- [ ] **Step 2: Run** `pnpm test src/progress/logic.test.ts` → FAIL.
- [ ] **Step 3: Implement** with immutable updates (never mutate arguments).
- [ ] **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: pure progress logic`.

### Task 6: Progress stores and provider (guest, Supabase, merge)

**Files:**
- Create: `src/progress/{localStore.ts,supabaseStore.ts,pendingQueue.ts,ProgressProvider.tsx,useProgress.ts}`
- Test: `src/progress/localStore.test.ts`, `src/progress/supabaseStore.test.ts`, `src/progress/ProgressProvider.test.tsx`

**Interfaces:**
- Consumes: Task 5 types/logic, `useAuth`, `getSupabase`.
- Produces: `interface ProgressStore { load(): Promise<ProgressState>; saveLesson(id: LessonId, r: LessonRecord): Promise<void>; recordQuizAttempt(id: LessonId, score: number, total: number, at: string): Promise<void>; saveLab(id: string, r: LabRecord): Promise<void>; saveAll(s: ProgressState): Promise<void> }`; `createLocalStore(key?: string): ProgressStore` (default key `netsteps.progress.guest.v1`, stores `{ v: 1, state }`); `createSupabaseStore(client, userId): ProgressStore & { flush(): Promise<void> }`; `useProgress(): { state: ProgressState; ready: boolean; syncError: boolean; openLesson(id: LessonId): void; submitQuiz(id: LessonId, score: number, total: number): void; completeLesson(id: LessonId): void; startLab(id: string): void; completeLab(id: string): void }`.

- [ ] **Step 1: Write failing tests.** Local store: round-trips a state; **RF2:** corrupt JSON, wrong shape and unknown `v` all load as empty without throwing; when `setItem` throws (quota) writes are kept in memory and a later `load()` in the same session returns them. Supabase store (mock client): `load()` maps `lesson_progress`, `lab_progress` rows and best `quiz_attempts` per lesson into a `ProgressState`; `saveLesson` upserts with `onConflict: 'user_id,lesson_id'`; **RF3:** when a write rejects, it is stored in the pending queue (`netsteps.pending.<userId>`), no rejection escapes, `syncError` becomes true; `flush()` replays the queue in order and clears it on success; the provider calls `flush()` on mount and on the `online` event. Provider: guest actions persist to the local store and update `state`; signing in merges local guest progress with remote via `mergeProgress`, calls `saveAll(merged)`, then clears the guest key; **RF5:** after sign-out the `state` is empty, the guest key does not contain the previous account's lesson ids, and signing in as a different user shows only that user's remote data; progress actions before `ready` are applied after load, not lost.
- [ ] **Step 2: Run** `pnpm test src/progress` → FAIL.
- [ ] **Step 3: Implement.** Wire `ProgressProvider` into `main.tsx` inside `AuthProvider`; auth status `signed-out` or `unconfigured` uses the local guest store. The provider derives the next state with the Task 5 functions, then calls the store method for the changed record. `submitQuiz` writes one `quiz_attempts` row per submit and updates `quizBest` locally.
- [ ] **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: guest and account progress with offline queue and merge`.

### Task 7: Content model, curriculum, glossary, lesson validation

**Files:**
- Create: `src/content/types.ts`, `src/content/curriculum.ts` (no JSX, importable from scripts), `src/content/loaders.ts`, `src/content/glossary/{index.ts,level1.ts}`, `src/content/components/{LessonSection.tsx,GoDeeper.tsx,TableOfContents.tsx,Term.tsx}`
- Test: `src/content/curriculum.test.ts`, `src/content/validate.test.ts`, `src/content/components/components.test.tsx`

**Interfaces:**
- Produces: `type LevelId = string` (`'level-1'`…`'level-7'`); `type LessonMeta = { id: LessonId; levelId: LevelId; title: string; summary: string; minutes: number; built: boolean; labIds: string[] }` (`labIds` = ids of the labs the lesson contains, empty until the lesson is built; the course map needs them without loading the lesson); `type LevelMeta = { id: LevelId; number: number; title: string; summary: string; lessons: LessonMeta[] }`; `curriculum: LevelMeta[]` (7 levels; lesson titles exactly as in spec §6, ids `l<level>-<kebab-title>`; **every lesson starts `built: false` and each Level 1 lesson task flips its own to `true`** together with registering its loader); `LessonId` is imported from `@/progress/types`; `type QuizQuestion = { id: string; prompt: string; options: string[]; correctIndex: number; explanation: string }` (explanation covers why the right answer is right and why the others are not); `type Lesson = { id: LessonId; hook: string; analogy: ReactNode; sections: { id: string; title: string; body: ReactNode; deeper?: { title: string; body: ReactNode }[] }[]; primarySimulationId: string; tryIt: ReactNode; labs: { id: string; title: string; render: (ctx: { onDone: () => void }) => ReactNode }[]; realComputer?: ReactNode; whyItMatters: ReactNode; quiz: QuizQuestion[]; recap: { oneLine: string; takeaways: string[]; cheatSheet: ReactNode }; glossary: string[] }`; `loadLesson(id: LessonId): Promise<Lesson | undefined>` (dynamic imports, `undefined` for unbuilt or unknown ids); `findLesson(levelId: LevelId, lessonId: LessonId): LessonMeta | undefined` (only returns when the lesson belongs to that level); `glossary: Record<string, { term: string; definition: string }>`; `<Term id="packet">` renders an accessible button that toggles a definition popover (hover, tap and focus), and renders plain text if the id is unknown (never throws).

- [ ] **Step 1: Write failing tests.** Curriculum: 7 levels numbered 1–7, all lesson ids unique and kebab-case with `l<level>-` prefix, `built` lessons exist only in Level 1, the set of `built` ids equals the set of ids with a registered loader (they can never disagree), every level has a non-empty title and summary. Validation (runs over every `built` lesson through `loadLesson`; passes with zero lessons until Task 16 and then covers each lesson as it lands): `sections.length >= 5`, every section has a title and at least one lesson has a `deeper` block, `quiz.length === 5` with `correctIndex` inside `options` and non-empty explanations, `labs.length >= 1`, every `glossary` id exists in `glossary`, `primarySimulationId` non-empty, `recap.takeaways.length` between 3 and 5, `minutes` between 8 and 30, and the ids of `labs` equal the lesson's `LessonMeta.labIds`. Components: `Term` popover toggles on click and Escape closes it; unknown term renders its children; `GoDeeper` collapsed by default and keyboard operable; `TableOfContents` lists section titles as anchor links and marks the one matching its `activeId` prop with `aria-current="true"`.
- [ ] **Step 2: Run** `pnpm test src/content` → FAIL.
- [ ] **Step 3: Implement.** `loaders.ts` maps built lesson ids to `() => import('./lessons/level1/<file>')` (starts empty; each lesson task adds its entry). Glossary `level1.ts` starts empty; each lesson task adds its terms.
- [ ] **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: content model, curriculum and glossary`.

### Task 8: Step player (simulation engine)

**Files:**
- Create: `src/sim/{playerReducer.ts,useReducedMotion.ts,SimPlayer.tsx,SimPlayer.module.css}`
- Test: `src/sim/playerReducer.test.ts`, `src/sim/SimPlayer.test.tsx`

**Interfaces:**
- Produces: `type PlayerState = { index: number; playing: boolean; speed: 0.5 | 1 | 2; finished: boolean }`; `type PlayerAction = { type: 'next' | 'back' | 'play' | 'pause' | 'tick' | 'reset' } | { type: 'goTo'; index: number } | { type: 'setSpeed'; speed: 0.5 | 1 | 2 }`; `initialPlayerState(stepCount: number): PlayerState`; `playerReducer(s: PlayerState, a: PlayerAction, stepCount: number): PlayerState`; `<SimPlayer<S> id: string; steps: S[]; caption: (step: S) => string; render: (step: S, ctx: { index: number; reducedMotion: boolean }) => ReactNode; onFinished?: (id: string) => void; stepMs?: number>`; `useReducedMotion(): boolean`.

- [ ] **Step 1: Write failing tests.** Reducer (stepCount 4): `next` ×3 reaches index 3 and sets `finished`; `next` at the end stays at 3; `back` never goes below 0; `play` at the last step restarts at index 0 with `playing: true`; `tick` while playing advances, and at the last step sets `playing: false`; `reset` returns to index 0, `playing: false` but keeps `finished: true` (sticky); `goTo(99)` clamps to 3; `goTo(-1)` clamps to 0; stepCount 1 starts `finished: true`. Component: shows the caption of step 0; Next shows the next caption; caption lives in an element with `role="status"`; Back is disabled at step 0; ArrowRight/ArrowLeft on the focused player move steps; `render` receives `reducedMotion: true` when `matchMedia('(prefers-reduced-motion: reduce)')` matches; `onFinished` fires exactly once with the sim `id` when the last step is first reached; `steps=[]` renders a "Nothing to show" message without throwing; no axe violations.
- [ ] **Step 2: Run** `pnpm test src/sim` → FAIL.
- [ ] **Step 3: Implement.** Controls: Play/Pause, Back, Next, Reset, speed select, step scrubber (`input type=range`) with `aria-label`s; autoplay uses a timer of `stepMs / speed` (default 1800 ms) cleaned up on unmount.
- [ ] **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: step player engine`.

### Task 9: Quiz

**Files:**
- Create: `src/quiz/{scoreQuiz.ts,Quiz.tsx,Quiz.module.css}`
- Test: `src/quiz/scoreQuiz.test.ts`, `src/quiz/Quiz.test.tsx`

**Interfaces:**
- Consumes: `QuizQuestion` (Task 7).
- Produces: `scoreQuiz(questions: QuizQuestion[], answers: (number | null)[]): { score: number; total: number }` (unanswered counts wrong; extra answers ignored); `<Quiz questions onSubmit: (score: number, total: number) => void previousBest?: { score: number; total: number }>`.

- [ ] **Step 1: Write failing tests.** `scoreQuiz` with answers `[1, 0, null, 2, 3]` against known correct indexes returns the expected score and `total: 5`; all unanswered → score 0; answers longer than questions are ignored. Component: Submit is disabled until all five are answered; submitting shows the explanation for each question and the score, calls `onSubmit` exactly once even on a double click (**guard**); "Try again" clears answers and shows the questions again without calling `onSubmit`; shows `previousBest` when given; radio groups are labelled and keyboard operable; no axe violations.
- [ ] **Step 2: Run** `pnpm test src/quiz` → FAIL. **Step 3: Implement.** **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: quiz component`.

### Task 10: Simulated-network core (addresses and ping)

**Files:**
- Create: `src/netcore/{ipv4.ts,network.ts}`
- Test: `src/netcore/ipv4.test.ts`, `src/netcore/network.test.ts`

**Interfaces:**
- Produces: `parseIPv4(s: string): number | null` (strict dotted quad, each part 0–255, no leading zeros, no whitespace); `formatIPv4(n: number): string`; `parseMask(s: string): number | null` (dotted contiguous mask or `/0`–`/32`); `sameSubnet(a: number, b: number, mask: number): boolean`; `type DeviceKind = 'pc' | 'server' | 'switch'`; `type Device = { id: string; kind: DeviceKind; name: string; ip?: string; mask?: string; gateway?: string; x: number; y: number }`; `type Link = { id: string; a: string; b: string }`; `type Network = { devices: Device[]; links: Link[] }`; `type PingFailure = 'unknown-host' | 'no-ip-config' | 'different-network' | 'no-path'`; `type PingResult = { ok: boolean; failure?: PingFailure; path: string[]; rttMs: number }`; `ping(net: Network, fromId: string, target: string): PingResult`.

- [ ] **Step 1: Write failing tests (RF1 included).** `parseIPv4('192.168.1.10') === 3232235786`; null for `'256.1.1.1'`, `'1.2.3'`, `'1.2.3.4.5'`, `'01.2.3.4'`, `' 1.2.3.4'`, `''`, `'a.b.c.d'`, `'1.2.3.-4'`. `formatIPv4(3232235786) === '192.168.1.10'`. `parseMask('255.255.255.0') === parseMask('/24') === 4294967040`; null for `'255.0.255.0'`, `'/33'`, `'255.255.255.256'`, `''`; `parseMask('/0') === 0`. `sameSubnet` true for `192.168.1.10` vs `192.168.1.200` under /24, false vs `192.168.2.10`. `ping` (pc1 `192.168.1.10/24` — sw1 — pc2 `192.168.1.20/24`): ok, path `['pc1','sw1','pc2']`, `rttMs === 2`; two chained switches → path length 4, `rttMs === 3`; pc pinging its own IP → ok, path `['pc1']`, `rttMs === 0`; missing IP on source → `no-ip-config`; pc2 on `192.168.2.20` → `different-network`; missing cable → `no-path`; a PC in the middle (`pc1—pc3—pc2`) does **not** forward → `no-path`; target `'999.1.1.1'` or a valid IP nobody owns → `unknown-host`; a triangle of three switches terminates (no infinite loop); target with surrounding spaces is rejected as `unknown-host`.
- [ ] **Step 2: Run** `pnpm test src/netcore` → FAIL.
- [ ] **Step 3: Implement.** `ping` finds the shortest path by breadth-first search where only `switch` devices may be intermediate nodes; `rttMs` = number of links on the path.
- [ ] **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: simulated network core with ipv4 and ping`.

### Task 11: Terminal simulator

**Files:**
- Create: `src/netcore/terminal.ts`, `src/labs/{TerminalLab.tsx,TerminalLab.module.css}`
- Test: `src/netcore/terminal.test.ts`, `src/labs/TerminalLab.test.tsx`

**Interfaces:**
- Consumes: `Network`, `ping`, `parseIPv4`.
- Produces: `type CommandResult = { lines: string[]; clear?: boolean }`; `runCommand(net: Network, hostId: string, input: string, os: 'windows' | 'unix'): CommandResult`; `<TerminalLab net hostId os prompt?>` (input line, scrollback, ArrowUp/ArrowDown history, click-to-focus).

- [ ] **Step 1: Write failing tests (RF1 included).** Commands are case-insensitive and trimmed; empty input → no lines. `help` lists `help, ipconfig|ifconfig, ping, clear|cls`. Windows `ipconfig` on a configured PC includes the lines `IPv4 Address. . . . . . . . . . . : 192.168.1.10` and `Subnet Mask . . . . . . . . . . . : 255.255.255.0`; Unix `ifconfig` includes `inet 192.168.1.10  netmask 255.255.255.0`. Windows `ping 192.168.1.20` (reachable) prints `Pinging 192.168.1.20 with 32 bytes of data:`, four `Reply from 192.168.1.20: bytes=32 time=2ms TTL=64` lines, and `Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`; Unix prints `64 bytes from 192.168.1.20: icmp_seq=1 ttl=64 time=2 ms` ×4 and `4 packets transmitted, 4 received, 0% packet loss`. Failures: `no-ip-config` → `General failure.`; `different-network` → four `Reply from 192.168.1.10: Destination host unreachable.` and `Lost = 4 (100% loss)`; `no-path` or a valid-but-unowned IP → four `Request timed out.`; unparseable target (`999.1.1.1`) → `Ping request could not find host 999.1.1.1. Please check the name and try again.`; `ping` with no argument → `Usage: ping <ip-address>`. A ping to the host's own IP succeeds with `time<1ms` (Windows) or `time=0.05 ms` (Unix). Unix failures: `no-ip-config` → `ping: connect: Network is unreachable`; `different-network` → four `From 192.168.1.10 icmp_seq=N Destination Host Unreachable`; `no-path` or an unowned IP → four `Request timeout for icmp_seq N`; the last two end with `100% packet loss`. Unknown command → Windows `'foo' is not recognized as an internal or external command, operable program or batch file.`, Unix `foo: command not found`. `clear`/`cls` → `{ lines: [], clear: true }`. Component: typing `ping 192.168.1.20` + Enter appends the output; ArrowUp recalls the previous command; the input has an accessible label.
- [ ] **Step 2: Run** `pnpm test src/netcore/terminal.test.ts src/labs/TerminalLab.test.tsx` → FAIL.
- [ ] **Step 3: Implement.** Unknown `hostId` returns a single line `No such device.` (never throws).
- [ ] **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: terminal simulator`.

### Task 12: Network builder lab

**Files:**
- Create: `src/labs/{builderReducer.ts,labTasks.ts,BuilderLab.tsx,BuilderLab.module.css}`
- Test: `src/labs/builderReducer.test.ts`, `src/labs/labTasks.test.ts`, `src/labs/BuilderLab.test.tsx`

**Interfaces:**
- Consumes: `Network`, `Device`, `ping`.
- Produces: `type BuilderAction = { type: 'addDevice'; kind: DeviceKind; x: number; y: number } | { type: 'removeDevice'; id: string } | { type: 'connect'; a: string; b: string } | { type: 'disconnect'; linkId: string } | { type: 'setConfig'; id: string; ip: string; mask: string; gateway?: string } | { type: 'moveDevice'; id: string; x: number; y: number }`; `builderReducer(net: Network, a: BuilderAction): Network`; `type LabTask = { id: string; description: string; check: (net: Network) => boolean }`; `evaluateLab(tasks: LabTask[], net: Network): { id: string; description: string; done: boolean }[]`; `<BuilderLab initial?: Network tasks: LabTask[] palette: DeviceKind[] os?: 'windows' | 'unix' onAllDone?: () => void onChange?: (net: Network) => void>` (`os` defaults to `'windows'` and is passed to each device's `TerminalLab`) (SVG canvas, device palette, click two devices to connect, side panel to set IP/mask, per-device terminal button, live task checklist).

- [ ] **Step 1: Write failing tests (RF1 included).** Reducer: `addDevice` names devices `PC1`, `PC2`, `Switch1`, `Server1` with unique ids; `connect` ignores self-links, duplicates in either order and unknown ids; a `pc` or `server` accepts only one link and a `switch` at most 8 (extra connects ignored); `removeDevice` removes its links; `disconnect` removes just that link; `setConfig` stores exactly the typed strings (validation happens at ping time, so `setConfig('pc1','999.1.1.1','')` is accepted and `ping` then reports `no-ip-config` or `unknown-host` rather than throwing). Tasks: a "two PCs can ping each other" task is false until both have same-subnet IPs, a switch and cables, then true; `evaluateLab` returns each task's `done`. Component: adding two PCs and a switch via the palette and connecting them renders three devices and two links; the checklist ticks when the task passes and `onAllDone` fires once; palette buttons and device nodes are keyboard operable and labelled.
- [ ] **Step 2: Run** `pnpm test src/labs/builderReducer.test.ts src/labs/labTasks.test.ts src/labs/BuilderLab.test.tsx` → FAIL.
- [ ] **Step 3: Implement.** Reducer must stay free of React; the component keeps a `useReducer` over it.
- [ ] **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: network builder lab`.

### Task 13: Practice problems

**Files:**
- Create: `src/labs/{practice.ts,PracticeLab.tsx}`
- Test: `src/labs/practice.test.ts`, `src/labs/PracticeLab.test.tsx`

**Interfaces:**
- Produces: `createRng(seed: number): () => number` (deterministic, values in [0, 1)); `type Problem = { id: string; prompt: string; answer: number; tolerance: number; unit?: string; explanation: string; params: Record<string, number> }`; `transferSeconds(sizeMB: number, mbps: number): number` (size × 8 ÷ mbps, no latency); `binaryToDecimal(bits: string): number`; `generateTransferTime(rng): Problem`; `generateBinaryDecimal(rng): Problem`; `checkAnswer(p: Problem, input: string): { correct: boolean; message: string }` (strict number parse `^-?\d+(\.\d+)?$` after trimming); `<PracticeLab generate: (rng: () => number) => Problem count?: number onDone?: () => void>`.

- [ ] **Step 1: Write failing tests.** Same seed → same sequence; values in [0, 1). `transferSeconds(10, 8) === 10`, `transferSeconds(100, 100) === 8`; `generateTransferTime` answers equal `transferSeconds(params.sizeMB, params.mbps)` rounded to 2 decimals. `binaryToDecimal('11000000') === 192`, `'00000001'` → 1. `checkAnswer` is correct for `'192'`, `' 192 '`, `'192.0'`; incorrect for `''`, `'abc'`, `'1e3'`, `'192 Mbps'` (never throws); within `tolerance` counts correct and outside does not. Component: shows a prompt, wrong answer shows the explanation and keeps the problem, correct answer enables Next, finishing `count` problems calls `onDone` once; new session gives different problems.
- [ ] **Step 2: Run** `pnpm test src/labs/practice.test.ts src/labs/PracticeLab.test.tsx` → FAIL. **Step 3: Implement.** **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: auto-checked practice problems`.

### Task 14: Course map page (`/learn`)

**Files:**
- Create/replace: `src/pages/CourseMap.tsx`, `src/pages/ProgressRing.tsx`, CSS module
- Test: `src/pages/CourseMap.test.tsx`

**Interfaces:**
- Consumes: `curriculum`, `useProgress`, `continueTarget`, `levelProgress`, `overallProgress`.
- Produces: `<CourseMap levels?: LevelMeta[]>` (defaults to `curriculum`; tests pass a fixture so they do not depend on which real lessons are built) — a page listing 7 levels with progress rings and lesson rows (status, minutes, a lab dot when every id in the lesson's `labIds` is completed); a "Continue where you left off" button (or "Start Lesson 1" for a new learner); unbuilt levels show "Coming soon" and their lessons are not links.

- [ ] **Step 1: Write failing tests.** New learner sees "Start" linking to `/learn/level-1/l1-what-is-a-network`; with one completed and another opened lesson the button links to the opened one; Level 1 ring text shows `1/6`; Levels 2–7 render "Coming soon" with no lesson links; works with an empty/guest state before `ready` (shows skeleton, no crash); no axe violations.
- [ ] **Step 2: Run** `pnpm test src/pages/CourseMap.test.tsx` → FAIL. **Step 3: Implement.** **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: course map`.

### Task 15: Lesson page shell

**Files:**
- Create/replace: `src/pages/LessonPage.tsx`, `src/pages/lessonRun.tsx` (context tracking simulation/quiz state), CSS module
- Test: `src/pages/LessonPage.test.tsx`

**Interfaces:**
- Consumes: `findLesson`, `loadLesson`, `useProgress`, `canComplete`, `SimPlayer`, `Quiz`, content components.
- Produces: renders a loaded `Lesson` in the §7 order (hook, analogy, table of contents, sections with `GoDeeper`, try-it, labs, real-computer exercise, why it matters, quiz, recap with cheat sheet, next-lesson link); `useLessonRun(): { markSimFinished(simId: string): void }` for sims placed inside section bodies; calls `openLesson` once on mount; calls `completeLesson` exactly once when `canComplete({ primarySimFinished, quizSubmitted })` first becomes true; quiz submit calls `submitQuiz`; each lab is wrapped in `<LabFrame labId>`, which calls `startLab(labId)` on the first pointer or key interaction inside it and passes `onDone` (calls `completeLab(labId)` once) to `lab.render({ onDone })`.

- [ ] **Step 1: Write failing tests (RF4 included)** using a fixture lesson injected by `vi.mock` of `@/content/curriculum` and `@/content/loaders` (the RF4 cases below use the real, unmocked curriculum): renders sections in order and the table of contents; `openLesson` called once; finishing the primary sim alone does not complete, submitting the quiz alone does not complete, doing both (either order) calls `completeLesson` once; **RF4:** `/learn/level-9/x`, `/learn/level-2/l2-ethernet-and-mac-addresses` (exists in the curriculum but is unbuilt) and `/learn/level-1/l2-ethernet-and-mac-addresses` (right lesson, wrong level) all render "Lesson not found" with a link to `/learn`, call no progress function and never write a row; a loading state shows while the lesson loads; next-lesson link points to the following built lesson or to `/learn` after the last; a lab frame calls `startLab` once on first interaction and `completeLab` once when its `onDone` fires, even if `onDone` fires twice.
- [ ] **Step 2: Run** `pnpm test src/pages/LessonPage.test.tsx` → FAIL. **Step 3: Implement.** **Step 4: Run** `pnpm check` → PASS.
- [ ] **Step 5: Commit** `feat: lesson page shell with progress tracking`.

### Tasks 16–21: Level 1 lessons

Every lesson task has the same shape. Files live in `src/content/lessons/level1/<slug>/`: `index.tsx` (default export `lesson: Lesson`), one `s<N>-<name>.tsx` per theory section, `sim.tsx`, `lab.tsx`, `quiz.ts`, `logic.ts` (pure, no React) and `logic.test.ts`. Every file stays under the 300-line lint limit, which is why the theory is split by section. Also append glossary terms to `src/content/glossary/level1.ts`, add an entry to `src/content/loaders.ts` (`import('./lessons/level1/<slug>')`), and set `built: true` plus the lesson's `labIds` in `src/content/curriculum.ts`. Write the lesson text with the `netsteps-lesson-writing` skill and keep the Task 7 validation test green; the logic tests below are written first, then the lesson. Each lesson must include its simulation with `SimPlayer`, the try-it control, the lab named, the real-computer exercise named (safe, read-only, "only on your own device"), 5 quiz questions, and glossary terms for every new word. Step 4 of each task is `pnpm check` (includes the validation test) and Step 5 commits `feat: level 1 lesson <slug>`.

### Task 16: Lesson 1.1 What is a network (`l1-what-is-a-network`, file `what-is-a-network`)

**Interfaces:**
- Produces: `journeySteps(net: Network, from: string, to: string): { caption: string; at: string[] }[]` in `what-is-a-network/logic.ts`.
- Lab `lab-l1-first-network` (BuilderLab, palette `pc, switch`): tasks "two PCs are connected through a switch", "both have addresses in the same subnet", "PC1 can ping PC2"; also shows a `TerminalLab` for each PC. Real computer: `ipconfig`/`ifconfig` and `ping 127.0.0.1`.

- [ ] **Step 1: Write failing logic tests.** For path `['pc1','sw1','pc2']` `journeySteps` returns one step per hop plus a start and an end step, captions name each device, `at` holds the devices currently highlighted; a single-device path returns one step; an unreachable pair returns one step whose caption explains it cannot reach.
- [ ] **Step 2: Run** `pnpm test src/content/lessons/level1/what-is-a-network/logic.test.ts` → FAIL.
- [ ] **Step 3: Implement the logic, then write the lesson** (sections: what a network is; devices and links; what is shared; hosts vs network devices; addresses in one minute; common mistakes). Primary sim: a message travels PC1 → switch → PC2 using `journeySteps`.
- [ ] **Step 4: Run** `pnpm check` → PASS. **Step 5: Commit.**

### Task 17: Lesson 1.2 LAN, WAN and MAN (`l1-lan-wan-man`, file `lan-wan-man`)

**Interfaces:**
- Produces: `type Scope = 'PAN' | 'LAN' | 'MAN' | 'WAN'`; `scopeForDistance(km: number): Scope` (PAN ≤ 0.01, LAN ≤ 2, MAN ≤ 100, otherwise WAN; throws `RangeError` for negative or non-finite input); `scopeQuestions: { prompt: string; scope: Scope }[]` (at least 8 everyday scenarios); `generateScopeProblem(rng): Problem` for `PracticeLab` (answer is the index of the scope in `['PAN','LAN','MAN','WAN']`, prompt lists the options).
- Lab `lab-l1-classify` (PracticeLab with `generateScopeProblem`). Try-it: a distance slider that shows the scope. Real computer: find your own network's address range with `ipconfig`/`ifconfig` and identify whether it is a LAN.

- [ ] **Step 1: Write failing logic tests.** `scopeForDistance(0.005) === 'PAN'`, `0.5 → 'LAN'`, `30 → 'MAN'`, `5000 → 'WAN'`, `2 → 'LAN'`, `100 → 'MAN'`; `NaN`, `-1`, `Infinity` throw `RangeError`; `generateScopeProblem` is deterministic for a seed and its `answer` matches the scenario's scope index.
- [ ] **Step 2: Run** the logic test → FAIL. **Step 3: Implement the logic, then the lesson** (sections: what makes a network "local"; PAN; LAN; MAN; WAN; the internet as a network of networks; why distance boundaries are rules of thumb). Primary sim: rings expanding from PAN to WAN with examples at each stage.
- [ ] **Step 4: Run** `pnpm check` → PASS. **Step 5: Commit.**

### Task 18: Lesson 1.3 Topologies (`l1-topologies`, file `topologies`)

**Interfaces:**
- Produces: `type TopologyKind = 'bus' | 'star' | 'ring' | 'mesh'`; `type Topology = { kind: TopologyKind; nodes: string[]; links: { id: string; a: string; b: string }[] }`; `makeTopology(kind: TopologyKind, n: number): Topology` (nodes `n0…n(n-1)`; star hub is `n0`; bus is a chain of `n-1` backbone links; ring `n` links; mesh `n(n-1)/2` links; throws `RangeError` for `n < 3`); `communicatingNodes(t: Topology, broken: { links: string[]; nodes: string[] }): string[]`.
- Rules (accurate to real networks): **bus** — any broken backbone link stops everyone (signal reflection without termination), a broken node only removes itself; **star** — a broken spoke isolates only that node, a broken hub stops everyone; **ring (single ring)** — any broken link or node stops everyone; **mesh** — traffic reroutes, result is the largest connected group. Returns `[]` when fewer than 2 nodes can communicate.
- Lab `lab-l1-star` (BuilderLab, palette `pc, switch`): tasks "build a star: 4 PCs around one switch", "every PC can ping every other PC", and a guided step "remove one cable and see only that PC lose connection". Real computer: your home network is a star around the router (look at `ipconfig` default gateway).

- [ ] **Step 1: Write failing logic tests.** Link counts: `star(5)` 4, `ring(4)` 4, `mesh(4)` 6, `bus(4)` 3; `n < 3` throws. `communicatingNodes`: star(5) with spoke `n0-n3` broken → `['n0','n1','n2','n4']`; star hub broken → `[]`; ring(4) with any one link broken → `[]`; bus(4) with a backbone link broken → `[]`, with node `n2` broken → `['n0','n1','n3']`; mesh(4) with `n0-n1` and `n0-n2` broken → all 4 nodes; mesh(4) with all three of `n0`'s links broken → the other 3.
- [ ] **Step 2: Run** the logic test → FAIL. **Step 3: Implement the logic, then the lesson** (sections: why layout matters; bus; star; ring; mesh and partial mesh; comparing cost, cable and failure; logical vs physical topology). Primary sim: pick a topology, break a link or node, and watch which nodes stay connected (uses `communicatingNodes`).
- [ ] **Step 4: Run** `pnpm check` → PASS. **Step 5: Commit.**

### Task 19: Lesson 1.4 Client-server vs peer-to-peer (`l1-client-server-p2p`, file `client-server-p2p`)

**Interfaces:**
- Produces: `clientServerSeconds(p: { fileMb: number; clients: number; serverUpMbps: number; clientDownMbps: number }): number` = `max(clients × fileMb ÷ serverUpMbps, fileMb ÷ clientDownMbps)`; `p2pSeconds(p: { fileMb: number; peers: number; serverUpMbps: number; peerUpMbps: number; peerDownMbps: number }): number` = `max(fileMb ÷ serverUpMbps, fileMb ÷ peerDownMbps, peers × fileMb ÷ (serverUpMbps + peers × peerUpMbps))`; both throw `RangeError` when any rate is ≤ 0, the file is negative or counts are below 1. (Textbook distribution-time model; the lesson states its assumptions.)
- Lab `lab-l1-server` (BuilderLab, palette `pc, server, switch`): tasks "three PCs and a server on one switch", "every PC can ping the server", then guided step: unplug the server and see every client fail (single point of failure). Real computer: browser DevTools Network tab on any page (that is client-server in action).

- [ ] **Step 1: Write failing logic tests.** `fileMb = 800`, `serverUpMbps = 100`, `clientDownMbps = peerDownMbps = 50`: `clientServerSeconds` with 10 clients is `80`; `p2pSeconds` with 10 peers and `peerUpMbps = 10` is `40`; with 1 client/peer both are `16`; doubling `clients` doubles the client-server time once the server is the bottleneck; zero or negative rates and `clients = 0` throw `RangeError`.
- [ ] **Step 2: Run** the logic test → FAIL. **Step 3: Implement the logic, then the lesson** (sections: the client-server idea; servers and clients in real life; strengths and weaknesses; peer-to-peer; hybrid models; scaling and the single point of failure). Primary sim: requests flow to one server, then to peers, with a slider for the number of clients showing the time.
- [ ] **Step 4: Run** `pnpm check` → PASS. **Step 5: Commit.**

### Task 20: Lesson 1.5 Bandwidth vs latency (`l1-bandwidth-latency`, file `bandwidth-latency`)

**Interfaces:**
- Produces: `totalSeconds(p: { fileMb: number; bandwidthMbps: number; latencyMs: number }): number` = `latencyMs ÷ 1000 + fileMb ÷ bandwidthMbps`; `bandwidthDelayBits(bandwidthMbps: number, rttMs: number): number` = `bandwidthMbps × 1,000,000 × rttMs ÷ 1000`; both throw `RangeError` for bandwidth ≤ 0 or negative inputs.
- Lab `lab-l1-transfer` (PracticeLab with `generateTransferTime`, 5 problems). Try-it: two sliders (bandwidth, latency) and a file-size selector showing total time and which part dominates. Real computer: `ping` your router and a distant public server, compare the times.

- [ ] **Step 1: Write failing logic tests.** `totalSeconds({ fileMb: 80, bandwidthMbps: 10, latencyMs: 50 }) === 8.05`; a 0.001 Mb file at 1000 Mbps with 100 ms latency is latency-dominated (≈ 0.100001); `bandwidthDelayBits(100, 20) === 2_000_000`; `bandwidthMbps: 0` and negative latency throw `RangeError`.
- [ ] **Step 2: Run** the logic test → FAIL. **Step 3: Implement the logic, then the lesson** (sections: the highway analogy; bandwidth; latency and its sources; throughput vs bandwidth; bandwidth-delay product; why small requests feel slow; common mistakes). Primary sim: a file crossing a link, widening the pipe vs shortening the road.
- [ ] **Step 4: Run** `pnpm check` → PASS. **Step 5: Commit.**

### Task 21: Lesson 1.6 Packet vs circuit switching (`l1-packet-vs-circuit`, file `packet-vs-circuit`)

**Interfaces:**
- Produces: `splitIntoPackets(totalBytes: number, maxPayload: number): { seq: number; bytes: number }[]`; `circuitSwitchingSeconds(p: { setupSeconds: number; messageBits: number; rateBps: number }): number`; `packetSwitchingSeconds(p: { messageBits: number; packetBits: number; hops: number; rateBps: number }): number` = `(N + hops − 1) × packetBits ÷ rateBps` with `N = messageBits ÷ packetBits` (message size must be a whole number of packets, otherwise `RangeError`); `messageSwitchingSeconds(p: { messageBits: number; hops: number; rateBps: number }): number` = `hops × messageBits ÷ rateBps`; `assignRoutes(routes: string[][], packets: number, brokenLinks: Set<string>): (string[] | null)[]` (round-robin over routes that contain no broken link, link id `a-b`; `null` when none are left); `circuitSurvives(route: string[], brokenLinks: Set<string>): boolean`.
- Lab `lab-l1-packets` (PracticeLab with a `generatePacketProblem(rng)` added to `practice.ts`: "A {size} KB message is sent with at most {payload} bytes per packet: how many packets?", answer `ceil`). Real computer: `tracert`/`traceroute` to a public website, explaining that each line is a router the packets pass through.

- [ ] **Step 1: Write failing logic tests.** `splitIntoPackets(3500, 1000)` → sizes `[1000, 1000, 1000, 500]` with `seq` 1–4; `0` bytes → `[]`; `maxPayload ≤ 0` throws `RangeError`. With `messageBits 8000`, `packetBits 1000`, `hops 3`, `rateBps 1000`: `packetSwitchingSeconds === 10`, `messageSwitchingSeconds === 24`; `circuitSwitchingSeconds({ setupSeconds: 1, messageBits: 8000, rateBps: 1000 }) === 9`; `packetSwitchingSeconds` with a message that is not a whole number of packets throws `RangeError`. `assignRoutes` with two routes and 4 packets alternates `A,B,A,B`; with route A containing a broken link every packet takes B; with both broken every entry is `null`; `circuitSurvives` is false when any link on the route is broken. `generatePacketProblem` is deterministic per seed and its answer equals `ceil(sizeKB × 1000 ÷ payload)`. Also add to `curriculum.test.ts`: exactly six lessons are `built`, all in Level 1 (this passes only once Tasks 16–21 are all done).
- [ ] **Step 2: Run** the logic tests → FAIL. **Step 3: Implement the logic, then the lesson** (sections: why we need a switching method; circuit switching and the old phone network; packets; store-and-forward; why packets share links efficiently; comparing the two; real examples). Primary sim: packets split and take different routes, a link breaks mid-message and packets reroute while a circuit call drops.
- [ ] **Step 4: Run** `pnpm check` → PASS. **Step 5: Commit.**

### Task 22: Landing page and SEO files

**Files:**
- Create/replace: `src/pages/Landing.tsx`, `src/pages/HeroAnimation.tsx`, CSS module, `scripts/make-seo.ts`, `scripts/make-og.ts`, `public/og-source.svg`, `public/favicon.svg`; modify `index.html`
- Test: `src/pages/Landing.test.tsx`, `scripts/make-seo.test.ts`

**Interfaces:**
- Consumes: `curriculum`, `useAuth`, `siteConfig`.
- Produces: `buildSitemap(siteUrl: string, levels: LevelMeta[]): string` and `buildRobots(siteUrl: string): string` in `scripts/make-seo.ts` (the script writes `public/sitemap.xml` and `public/robots.txt`; wired as `prebuild`); `public/og.png` (1200×630) generated from `og-source.svg` with `sharp`.

- [ ] **Step 1: Write failing tests.** Landing: one `h1`; "Start learning free" links to `/learn` and "Sign in" to `/login`; a signed-in user sees "Continue learning" instead of "Sign in"; the seven levels are listed with their titles; hero animation is `aria-hidden` and static when reduced motion is set; no axe violations. SEO: `buildSitemap` includes `/`, `/learn`, `/privacy`, `/terms` and every **built** lesson URL, none for unbuilt lessons, uses the given site URL without a double slash; `buildRobots` allows all and points to `<siteUrl>/sitemap.xml`.
- [ ] **Step 2: Run** `pnpm test src/pages/Landing.test.tsx scripts` → FAIL. **Step 3: Implement.** Add the `seo` script (`tsx scripts/make-seo.ts`) and wire it as `prebuild` in `package.json`; `make-seo.ts` imports the curriculum with relative paths and type-only imports because `tsx` does not resolve the `@/` alias. `scripts/make-og.ts` is run once by hand and `public/og.png` is committed (not part of `prebuild`). Landing sections: hero with a small looping PC → switch → server packet animation, what you will learn (7 levels), how a lesson works (the recipe in 4 icons), free-and-public message, final call to action, footer. `index.html`: title, description, canonical, Open Graph and Twitter tags using `VITE_SITE_URL` at build time, theme-color. Do not copy any text or assets from the reference site.
- [ ] **Step 4: Run** `pnpm check` → PASS; `pnpm build` → PASS and `dist/sitemap.xml` exists. **Step 5: Commit** `feat: landing page and seo files`.

### Task 23: Profile, Privacy, Terms and account deletion

**Files:**
- Create/replace: `src/pages/{Profile.tsx,Privacy.tsx,Terms.tsx}`, CSS modules
- Test: `src/pages/Profile.test.tsx`, `src/pages/legal.test.tsx`

**Interfaces:**
- Consumes: `useAuth` (`deleteAccount` calls `rpc('delete_my_account')` then `signOut`), `useProgress`, `curriculum`, `overallProgress`.

- [ ] **Step 1: Write failing tests.** Profile (signed in): shows email, overall percentage, per-level counts and number of completed labs; "Delete my account" opens a confirmation that requires typing `DELETE` before the confirm button enables; confirming calls `deleteAccount`, then redirects to `/`; if `deleteAccount` returns `{ ok: false }` the error shows in a `role="alert"` and the user stays signed in; signed-out visitors are redirected to `/login?next=%2Fprofile`. Legal: Privacy has an `h1` "Privacy Policy" naming what is stored (email, progress, quiz scores) and the `contactEmail` from config (or a clear "contact details coming soon" line when unset); Terms has an `h1` "Terms of Use"; both are reachable from the footer and the signup form; both pass axe.
- [ ] **Step 2: Run** `pnpm test src/pages/Profile.test.tsx src/pages/legal.test.tsx` → FAIL. **Step 3: Implement.** Legal pages are plain-language templates with a top-of-file comment `// TEMPLATE: owner must review before launch (see docs/OWNER-SETUP.md)`.
- [ ] **Step 4: Run** `pnpm check` → PASS. **Step 5: Commit** `feat: profile, legal pages and account deletion`.

### Task 24: Deployment, owner checklist and final verification

**Files:**
- Create: `vercel.json`, `docs/OWNER-SETUP.md`, `README.md`

- [ ] **Step 1: Write `vercel.json`** with a single-page-app rewrite of every non-file path to `/index.html`, and `README.md` with the pnpm commands and project layout.
- [ ] **Step 2: Write `docs/OWNER-SETUP.md`**, a numbered checklist for the owner: (1) create a Supabase project; (2) run `supabase/migrations/0001_init.sql` in the SQL editor; (3) copy URL and anon key into `.env.local` (never the service-role key); (4) in the dev project turn email confirmation off, in production on; (5) set Auth Site URL and redirect URLs to the deployed domain and `http://localhost:5173`; (6) run `pnpm rls:check`; (7) optional Google sign-in: create a Google Cloud OAuth client, enable the provider in Supabase, set `VITE_ENABLE_GOOGLE=true`; (8) set `VITE_SITE_URL` and `VITE_CONTACT_EMAIL`; (9) set up custom SMTP before launch; (10) have a professional review the Privacy and Terms templates; (11) deploy: import the repo into Vercel, set the same env vars, build command `pnpm build`.
- [ ] **Step 3: Full verification.** Run `pnpm check` → PASS; `pnpm build` → PASS; `pnpm preview` and walk through as a guest: landing → course map → Lesson 1.1 → finish the simulation and quiz → lesson shows completed and the course map shows 1/6. If Supabase env is available: sign up, repeat, reload, confirm progress persists, confirm `pnpm rls:check` passes; if not, state plainly that auth and RLS are untested against a live project.
- [ ] **Step 4: Check for leaks.** Search the repo and `dist/` for the strings `service_role` and `SERVICE_ROLE` → no matches; confirm `.env.local` is untracked.
- [ ] **Step 5: Commit** `docs: deployment config and owner setup checklist`.
