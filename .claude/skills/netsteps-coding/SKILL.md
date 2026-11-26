---
name: netsteps-coding
description: Use when adding or changing NetSteps code - a lesson, simulation, lab or lab task, glossary term, Supabase migration, or page. Gives the file locations, interfaces and test patterns for each recipe.
---

# NetSteps coding recipes

Read `CLAUDE.md` first for the hard rules. Every recipe ends the same way: `pnpm check` must pass, then look at the result in `pnpm dev`. Write the failing test before the code, and run the focused test while iterating (`pnpm test <path>`).

## Add a lesson

Lessons live in `src/content/lessons/level1/<slug>/` (use the slug named in the plan task).

1. Pick the id from `src/content/curriculum.ts` (`l1-<kebab-title>`). Never rename it.
2. Write the pure logic first: `logic.ts` (no React imports) and `logic.test.ts`. Throw `RangeError` for invalid numbers; return friendly values for odd input. Run the test, watch it fail, implement, watch it pass.
3. Build the lesson files, each under 300 lines:
   - `s<N>-<name>.tsx`: one theory section each, exporting a component for the body and an optional "Go deeper" body.
   - `sim.tsx`: simulations built on `SimPlayer` (see "Add a simulation").
   - `lab.tsx`: the lab(s) (see "Add a lab").
   - `quiz.ts`: exactly 5 `QuizQuestion`s.
   - `index.tsx`: `export default lesson` of type `Lesson` (`@/content/types`): `hook`, `analogy`, `sections` (at least 5, each with a title, and at least one section with a `deeper` block), `primarySimulationId`, `tryIt`, `labs`, optional `realComputer`, `whyItMatters`, `quiz`, `recap` (3 to 5 takeaways + cheat sheet), `glossary` (term ids).
4. Write the text with the `netsteps-lesson-writing` skill.
5. Register it: add an entry to `src/content/loaders.ts` mapping the lesson id to `() => import('./lessons/level1/<slug>')`; in `src/content/curriculum.ts` set `built: true`, `minutes` (8 to 30) and `labIds` (must equal the ids in `lesson.labs`); append every new term to `src/content/glossary/level1.ts`.
6. Keep `src/content/validate.test.ts` and `src/content/curriculum.test.ts` green: built ids must equal ids with a loader, every glossary id must exist, the quiz must have 5 valid questions, `primarySimulationId` must be non-empty.
7. Run `pnpm check`, then walk the lesson in `pnpm dev`: sim to the last step, submit the quiz, confirm it shows completed and the course map ring updates.

## Add a simulation

1. Put the state logic in the lesson's `logic.ts` as pure functions that return an array of steps (for example `journeySteps(net, from, to): { caption: string; at: string[] }[]`). Unit-test every step list, including the empty and unreachable cases.
2. Render with `SimPlayer` from `@/sim/SimPlayer`: `<SimPlayer id steps caption={(s) => s.caption} render={(s, { index, reducedMotion }) => <svg>...</svg>} onFinished={markSimFinished} />`.
   - Draw with SVG. When `reducedMotion` is true, change state without animating.
   - The caption must explain the mechanism in plain English; it is announced through the `role="status"` region.
   - The lesson's primary simulation `id` must equal `lesson.primarySimulationId`. Call `markSimFinished` from `useLessonRun()` (`@/pages/lessonRun`) through `onFinished`.
3. Try-it controls (sliders, toggles, "break this link") feed the same pure functions. Do not duplicate math in the component.
4. Test the component: shows step 0 caption, Next advances, finishing calls `onFinished` once, no axe violations.

## Add a lab or lab task

Labs are listed in `lesson.labs` as `{ id, title, render: ({ onDone }) => ReactNode }`. Lab ids look like `lab-l1-<name>` and must match the lesson's `labIds` in `curriculum.ts`. Call `onDone` when the learner finishes; `LabFrame` records completion once.

- Builder lab: `<BuilderLab initial tasks palette os onAllDone={onDone} />` from `@/labs/BuilderLab`. A task is `{ id, description, check: (net: Network) => boolean }` (types in `@/labs/labTasks`). Test every `check` against a built `Network` fixture, once false and once true. Add a `TerminalLab` per device when the lesson asks.
- Terminal commands: add them to `src/netcore/terminal.ts` (`runCommand(net, hostId, input, os)`), pure, with output text matching real Windows and Unix output. Test valid, invalid, mixed-case and padded input. Unknown device or input never throws.
- Practice problems: add a generator to `src/labs/practice.ts` that takes the seeded `rng` and returns a `Problem` (`{ id, prompt, answer, tolerance, explanation, params }`). Test determinism per seed and that `answer` matches the formula. Use it with `<PracticeLab generate count onDone={onDone} />`.
- Any "On your own computer" step uses only safe, read-only commands and says to use it only on your own device and network.

## Add a glossary term

1. Add `{ term, definition }` to `src/content/glossary/level1.ts` under a kebab-case id (`packet`, `subnet-mask`). Definition: one or two short sentences, no undefined jargon.
2. Use it in text as `<Term id="packet">packet</Term>` on first use in the lesson, and list the id in the lesson's `glossary` array.
3. `validate.test.ts` fails if a listed id is missing. An unknown id in `<Term>` renders plain text, so a typo does not break the page but is still a bug.

## Add a database migration

1. Create `supabase/migrations/000N_<name>.sql` (next number, never edit an applied migration; add a new one).
2. For each new table: `enable row level security`; policies for `select`, `insert`, `update` where `user_id = auth.uid()` (`profiles`: `id = auth.uid()`); no delete policy and no anon access; `user_id` references `auth.users(id) on delete cascade`.
3. For each function: `security definer`, `set search_path = ''`, `revoke ... from public, anon`, `grant execute ... to authenticated`.
4. Add a case for the new table or function to `scripts/rls-check.ts` (two users, cross-read, cross-write, anonymous read, cleanup). Run `pnpm rls:check` only once the owner has set up Supabase; until then record "RLS check pending owner setup" and do not call the schema verified.
5. Never reference a service-role key. Update `docs/OWNER-SETUP.md` if the owner must run the new SQL.

## Add a page

1. Create `src/pages/<Name>.tsx` with a default export (lazy-loaded pages are the one default-export exception) and one `h1`. Styles in `<Name>.module.css`.
2. Register it in `src/routes.tsx` with `lazy`, using the route table of spec §9. Protect signed-in-only pages with `<ProtectedRoute>`.
3. Test it in `<Name>.test.tsx`: heading, key links, empty and signed-out states, and `toHaveNoViolations` from `vitest-axe`. Extend `src/routes.test.tsx` for the new route. Wrap in `MemoryRouter` and any providers (`AuthProvider`, `ProgressProvider`) it needs, injecting fakes rather than hitting Supabase.
4. Handle loading, empty and error states. Unknown ids or params render the friendly not-found view and never write progress.

## Level 1 lesson template (from `what-is-a-network`)

Copy `src/content/lessons/level1/what-is-a-network/` and rename. Files and roles:

| File | Role |
| --- | --- |
| `logic.ts` + `logic.test.ts` (+ `logic.<part>.test.ts` when a test file nears 300 lines) | Pure step builder for the sim and the try-it decision. Never throw: odd input returns one friendly step or verdict. |
| `labChecks.ts` + `labChecks.test.ts` | Pure `LabTask[]` for the builder. Every goal names the lab's own devices (PC1, PC2 by name, as the instructions do) and tests the combined intent ("PC1 and PC2 are joined through a switch", not "some switch has two PCs"). Ping goals use `canPing` both ways, never `ping`. |
| `s<N>-<name>.tsx` | One section each. Export ONLY components (body + one per Go-deeper block); react-refresh warns on a file that mixes components and objects. |
| `sim.tsx` (+ `sim.module.css`, `sim.test.tsx`) | `JOURNEY_SIM_ID` string const, the diagram component, the `SimPlayer` wrapper. Steps computed once at module level from a fixed `Network`. Below 30rem draw a compact, vertical version with `useCompactLayout()` from `@/sim/useCompactLayout`. |
| `try.tsx`, `lab.tsx`, `real.tsx`, `quiz.ts`, `wrapUp.tsx` (why it matters + cheat sheet), `diagrams.tsx`, `lesson.module.css` | One part each. |
| `quiz.test.ts` | Pins each question's right option TEXT, spread-out positions, 3-4 distinct options, a phrase per wrong option in the explanation, and sentence length. |
| `index.tsx` | Assembles the `Lesson` object only; default export. |
| `index.test.tsx` | Renders the REAL page at `/learn/level-1/<id>` with `renderLessonPage` (fake progress, real loader): heading order, sim to last step, quiz 5 questions, sim + quiz -> `completeLesson` once, quiz alone -> not, try-it, lab -> `completeLab` (reuse `@/labs/builderTestKit`), axe. |

Wiring: sim `onFinished={markSimFinished}` (from `useLessonRun()`); lab `render: ({ onDone }) => <MyLab onDone={onDone} />` and inside `<BuilderLab onAllDone={onDone} />`; `primarySimulationId` = the sim id const; lab id const = `labIds` in `curriculum.ts`; every `<Term id>` id goes in `lesson.glossary` and in `src/content/glossary/level1.ts` (reuse ids that exist: `network`, `link`, `host`, `switch`, `router`, `ip-address`, `subnet`, `subnet-mask`, `packet`, `ping`, `server`, `internet`, `web`, `wi-fi`, ...). Loader line in `loaders.ts`; `built: true`, honest `minutes`, `labIds` in `curriculum.ts`.

Tests a lab must have: for every ping goal, a duplicate-IP case and a direct-cable case, so that replacing `canPing` with a raw `ping(...).ok` fails a test; a "distraction" case (the right devices elsewhere on the canvas) where every goal stays undone.

Shared registries (`src/content/glossary/level1.ts`, `src/content/loaders.ts`, `src/content/curriculum.ts`): Level 1 lessons are written in parallel, so only APPEND, under your own `// <lesson-id>` comment, and never reorder or reformat existing lines (merges conflict otherwise). In curriculum.ts change only your own lesson's `minutes`, `built` and `labIds`.

If you reuse `journeySteps`, keep failure captions switch-aware: a switch has no address here, so never tell the learner to give it one.

Gotchas hit:
- A CSS-module class with no rule is `undefined` at runtime (`cx` drops it, tests cannot find it). Give every class you reference a rule.
- Tests use non-scoped CSS module names, so query `.moving`, not `styles.moving` (typed `string | undefined`).
- Tables: wrap in `<div data-prose="">`, give row header `th scope="row"` and every `td` a `data-label`; `lesson.module.css` stacks rows into cards under 36rem (the layout's `overflow-wrap: anywhere` otherwise breaks words mid-letter). Also set `caption { display: block }` when stacking.
- SVG text is in viewBox units: at 320px a 380-wide drawing shrinks to ~0.65. Raise font sizes in a `max-width: 36rem` query, hide secondary text and repeat it as HTML below. Leave room above top labels (negative viewBox y).
- The marker moves with an inline `style={{ transform }}` (position, not theming) plus a `transition` class applied only when `!reducedMotion`.
- `pnpm test <file>` needs the TEST path; a source path matches nothing and prints no summary.
- A "Lesson not found" fixture must never be a sibling Level 1 lesson (another task builds it): use a Level 2+ id such as `/learn/level-2/l2-ethernet-and-mac-addresses`.
- A test that hard-codes "nothing is built" must use the `nothingBuilt` fixture (`@/test/courseMapTestKit`, Landing test), not the real curriculum.
- Port 5173 may be taken by someone else's dev server: use `pnpm exec vite --port 5180 --strictPort`; headless Chrome can be driven with Node's built-in `WebSocket` over the DevTools protocol (no new deps). Keep scripts and screenshots in the scratchpad.

Before committing: TDD evidence (RED then GREEN) and at least 5 mutants killed per pure file; `pnpm exec eslint <folder>`, `pnpm typecheck`, `pnpm test src/content src/pages src/routes.test.tsx`; screenshots at 1100 and 320 in light and dark (sim first, middle, last; try-it; lab with terminal; quiz before and after; recap; `/learn`); then `pnpm check` and `pnpm build`; `git add` explicit paths only.
