# Computer Networks Interactive Learning Site — Design

Date: 2026-11-18
Status: Draft for approval

## 1. Intent and why

Build a public website where anyone can learn computer networking from zero to advanced. Every concept is taught with a plain-English explanation and an interactive, step-through simulation, so the learner *sees* what happens (a packet travelling, a handshake, a routing table updating) instead of only reading about it.

**Why this exists.** The owner found a reference site, "System Design — an interactive course" (https://designed-to-scale.vercel.app/), whose *format* is right — each idea is an animated diagram you step through — but whose theory text is hard to follow. This project keeps that format and fixes the problem: simple language, everyday analogies, **full in-depth theory** (as long as each topic needs, broken into short titled sections), and **hands-on practice** so learners can try what they read. The owner explicitly asked for more theory, not shorter theory, plus practical activities.

**Who it is for.** The general public, mainly students and beginners. No specific exam syllabus was named. Learners need to be able to save their progress and come back later, on any device.

**What the reference gives us (and what it doesn't).** The reference is a *System Design* course, not a networking one, so there is no networking content to reuse. Its page is rendered by JavaScript, so its lesson list could not be read. From its HTML we know: a Vite app, a warm cream theme (`#f4ebe0`) with light and dark modes, isometric-style diagrams, and step-through animations. We take that **style and format only**. We do not copy its text, code, or image assets (it is another person's work and this site will be public).

## 2. Goals

1. Cover computer networking in **7 levels, about 40 lessons**, beginner to advanced (outline in §6). Every lesson has at least one simulation.
2. Plain language everywhere **and full-depth theory**: lessons are as long as the topic needs, always broken into short titled sections (rules in §7). Every lesson also has **hands-on practice**: guided labs in the browser plus safe exercises learners run on their own computer (§8b).
3. **Public by default:** anyone with the link can read lessons and run simulations without signing up.
4. **Saved progress:** signed-in learners keep lesson completion and quiz scores across devices.
5. A **landing page**, a **login / sign-up page**, a **course map** (dashboard) and **lesson pages**.
6. Works well on phones, tablets and desktops; light and dark themes; keyboard accessible.
7. Built with **pnpm** (never npm or yarn), React + Vite + TypeScript, **Supabase as the only backend**.
8. Delivered in phases; every phase leaves a working, deployable site.

## 3. Non-goals

- No custom server or API. No server-side code of our own in v1.
- Not a replacement for Cisco Packet Tracer or real packet capture. The labs and the final-level sandbox are simplified teaching tools.
- No scanning, hacking or attack tools in any practical exercise. Real-computer exercises use only safe, read-only commands on the learner's own device and network; attack topics (Level 7) are simulation-only.
- No certification-prep claims (CCNA etc.).
- No forum, comments, leaderboard, notes, or social features in v1. (Asked about; the owner did not request them.)
- No admin dashboard or CMS. Lessons live in the code repository.
- English only in v1.
- Not copying the reference site's content, code or assets.

## 4. Anti-goals (failure even if it "works")

- Unstructured walls of text (long theory is welcome, but never as one block), or jargon used before it is explained.
- Practice that is just clicking "next", labs with no feedback, or theory so thin that a learner still has to search elsewhere to understand the topic.
- Simulations that are decorative rather than showing the **real mechanism**, or that teach something technically wrong.
- Lessons that all feel different from each other (one recipe, §7).
- A login wall in front of learning.
- Any Supabase security hole: a service/secret key in the browser, a table without Row Level Security, one user able to read or change another user's data.
- Slow or janky animations; animations that ignore "reduce motion" settings.

## 5. Constraints

- **pnpm only.** One lockfile (`pnpm-lock.yaml`). Dev machine has Node 26 and pnpm 11.
- **React + Vite + TypeScript** (strict) single-page app, built to static files.
- **Supabase only** for backend: Auth + Postgres + Row Level Security. The browser holds only the public (anon) key. The owner creates the Supabase project and supplies `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; these live in `.env.local` (git-ignored) and in the host's environment settings.
- Lesson **content is not stored in the database**; it lives in code with stable lesson IDs (an ID is never reused or renamed once progress exists for it; merged or split lessons get new IDs). The database stores only users and their progress.
- **Dev environment:** a hosted Supabase project created by the owner (no Docker or local Supabase needed). Migrations are plain SQL files in `supabase/migrations/`, applied by pasting into the Supabase SQL editor or with `pnpm dlx supabase db push`. The dev project has email confirmation **off** so test users can be created by script with only the anon key; production turns it **on**.
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL` (used for redirects, canonical links, `sitemap.xml` and Open Graph tags). No service-role key is ever used by the app or committed.
- Must be deployable as a static site with a single-page-app rewrite rule.

## 6. Curriculum (agreed outline)

| Level | Lessons (simulation idea in brackets) |
|---|---|
| **1. Basics** | What is a network (connect devices yourself) · LAN / WAN / MAN · Topologies (break a link, watch what survives) · Client-server vs peer-to-peer · Bandwidth vs latency (sliders) · Packet vs circuit switching |
| **2. Layers & the local network** | OSI and TCP/IP (send a message down and up the layers) · Encapsulation and headers · Ethernet and MAC addresses · Switches (watch one learn its table) · ARP · Error detection: parity, checksum, CRC (flip a bit) |
| **3. IP addressing** | IPv4 · Subnetting and CIDR (bit slider) · VLSM · IPv6 · Routers and routing tables · NAT · DHCP · ping and traceroute |
| **4. Routing** | Static and dynamic routing · RIP (distance vector) · OSPF (link state) · BGP and the internet · Spanning tree · VLANs |
| **5. Transport** | Ports · TCP vs UDP · 3-way handshake and teardown · ACKs, retransmission, sliding window · Flow control · Congestion control (live cwnd graph) · QUIC |
| **6. Applications** | DNS lookup · HTTP/1.1, 2, 3 · Email (SMTP/IMAP/POP3) · FTP and SSH · Proxies · CDNs and load balancers |
| **7. Security & modern networks** | Firewalls and ACLs · Encryption basics · TLS handshake · VPNs · Common attacks (ARP spoofing, DoS, MITM, DNS poisoning) · Wi-Fi and 5G · SDN and cloud · Final "build your own network" sandbox |

The lesson list may be adjusted while writing content (merge, split, reorder), but coverage of each topic above must remain.

## 7. Lesson recipe and language rules

**Every lesson has the same parts, in this order:**
1. Hook — one or two sentences, a real-life situation.
2. Analogy — an everyday comparison (post office, roads, restaurant).
3. **Learn** — the full theory, in titled sections: what it is · why it exists · how it works step by step · the details and numbers · common mistakes and myths. Each section has a diagram or a worked example. Technical depth goes in collapsible **"Go deeper"** blocks.
4. **Watch it** — one or more step-through simulations (§8) with a plain-English caption on every step, placed inside the theory where they explain best.
5. **Try it** — at least one control the learner changes (slider, toggle, input, "break this link").
6. **Practice lab** — hands-on activity (§8b): a guided lab in the browser and, where it fits, an "On your own computer" exercise.
7. Why it matters — where this shows up in real life.
8. Quiz — 5 questions with instant feedback and short explanations.
9. Recap — "In one line" + 3 to 5 bullet takeaways, plus a small cheat sheet the learner can keep.
10. Next lesson link.

**Theory depth:** there is **no word limit**. A lesson is as long as the topic needs to be fully understood (for the main topics, typically a 10 to 20 minute read), covering what it is, why it exists, how it works step by step, the details and numbers, and the common mistakes. Length stays easy to read through short titled sections, a table of contents with a progress marker, a diagram or worked example in every section, and collapsible "Go deeper" blocks for the technical detail (header fields, formulas, protocol edge cases), so beginners are never forced through it while advanced learners still get it.

**Language rules:** short sentences (aim under 20 words), about 8th-grade reading level for the core text, new terms introduced gradually, every technical term defined on first use and available in a hover/tap **glossary**, active voice, use "you" and "your computer", numbers and addresses in examples must be realistic (e.g. `192.168.1.0/24`). Facts must be technically correct; accuracy comes before simplicity (simplify the explanation, never the truth).

## 8. Simulation engine

One shared **step player** used by all lessons:

- A simulation defines an ordered list of **steps**. Each step has a caption and a diagram state. Diagrams are drawn in **SVG** (sharp on phones, themeable, accessible).
- Controls: Play / Pause, Next, Back, Reset, speed, and a step scrubber. Keyboard operable. Captions announced via an ARIA live region. Honors `prefers-reduced-motion` (steps change without motion).
- **Try-it widgets** plug into the same player (sliders, drag-to-connect, toggles, text inputs).
- **Logic is separate from drawing.** The networking logic (subnet math, MAC-learning table, Dijkstra / Bellman-Ford, TCP windowing, CRC, etc.) is written as pure TypeScript functions and **unit-tested** (Vitest). The SVG layer only renders state produced by that logic. This is how we guarantee the simulations teach the right thing.

## 8b. Hands-on practice (labs)

Every lesson has at least one practical activity, chosen from these kinds:

1. **Network builder lab.** Drag devices (PC, switch, router, server) onto a canvas, connect cables, set IP addresses, masks and gateways, then test the connection. Checked automatically, with hints.
2. **Terminal simulator.** A safe, pretend command line connected to the simulated network. Learners type real commands (`ping`, `ipconfig`/`ifconfig`, `arp -a`, `traceroute`/`tracert`, `nslookup`/`dig`, `netstat`, `curl`) and get realistic output. Commands are added level by level.
3. **Practice problems with auto-check.** For example unlimited random subnetting questions, binary/decimal conversion, "which route wins?", each with instant feedback and a worked solution.
4. **Troubleshooting challenges.** A broken network ("PC1 can't reach the server"); the learner finds and fixes the fault using the builder and terminal.
5. **On your own computer.** Step-by-step guides for Windows, macOS and Linux using only safe, read-only commands and built-in tools (`ping`, `tracert`, `nslookup`, the browser's DevTools Network tab, optionally Wireshark), with sample output and a "what this means" explanation. Each one says: use only on your own device and network.

**Shared simulated-network core.** The builder, terminal and troubleshooting labs all run on one pure-TypeScript engine (devices, links, MAC/ARP, switching, IP routing, ICMP, DNS, basic TCP and HTTP). It is unit-tested and **grows level by level**: Phase 1 builds only what Level 1 needs (hosts, links, IP configuration, ping), and each later level adds what it teaches. This is the largest single piece of work in the project, which is why it starts small.

**Planned labs per level** (examples; the builder refines them while writing lessons):

| Level | Browser labs | On your own computer |
|---|---|---|
| 1 | Build a small network and ping across it; bandwidth/latency calculation practice | `ping` and read the latency; `ipconfig`/`ifconfig` to see your own address |
| 2 | Build a LAN with a switch and watch its MAC table; CRC practice | `arp -a`; optional first look at Wireshark (capture a ping, find the MAC addresses) |
| 3 | Subnetting practice generator (auto-checked); configure a router to join two networks; "can't reach the server" (wrong gateway/mask) troubleshooting | `ipconfig /all`, `tracert`/`traceroute`, `nslookup` |
| 4 | Static routes; watch RIP/OSPF tables converge, break a link and watch recovery; VLAN lab | `route print` / `netstat -r`; look up an AS on a public BGP looking-glass site |
| 5 | Change window size and packet loss and watch throughput; handshake lab | `netstat` to see your open ports; Wireshark capture of a TCP handshake |
| 6 | DNS resolution lab; send an HTTP request by hand in the terminal | `nslookup`/`dig` for DNS records; `curl -v`; DevTools Network tab walkthrough |
| 7 | Write firewall rules and test them; "spot the attack" challenges (simulation only); **final project:** design and build a company network from a written brief, auto-checked | Inspect an HTTPS certificate in the browser |

## 9. Pages and behavior

| Route | Page | Notes |
|---|---|---|
| `/` | Landing | Hero with a small live packet animation, what you will learn (7 levels), how a lesson works, "Start learning free" and "Sign in" buttons, footer. SEO meta tags, Open Graph image, `robots.txt`, `sitemap.xml`. |
| `/login`, `/signup` | Auth | Email + password and Google sign-in via Supabase Auth. Clear error messages, "continue as guest". The Google button only shows when Google sign-in is switched on in config (see §12 owner checklist). |
| `/forgot-password`, `/reset-password`, `/auth/callback` | Auth helpers | Password reset flow and the return point for email links and Google sign-in. |
| `/learn` | Course map | All levels and lessons, with progress rings and a "Continue where you left off" button. Open to guests. Levels not built yet show "Coming soon". |
| `/learn/:level/:lesson` | Lesson | The recipe in §7. Saves progress using the rules in §10. |
| `/profile` | Profile | Display name, overall progress, sign out, and **Delete my account**. Signed-in only. |
| `/privacy`, `/terms` | Legal | Plain-language Privacy Policy and Terms, linked from the footer and the sign-up form. Written as a template and flagged for the owner to review before launch. |
| `*` | Not found | Friendly 404 with link home. |

**Look:** fresh and modern — a teal and sky-blue palette (pale mint-white background, deep teal accent, sky-blue highlights and soft gradients) with a matching dark theme, rounded cards, generous spacing; every text and control color passes WCAG contrast. The landing page hero fills the whole first screen. Design tokens are CSS variables so light/dark is a single switch. Respects the system theme by default with a manual toggle.

## 10. Accounts and progress

- **Guests** can open everything. Their progress is kept in `localStorage`.
- **Signing in** saves progress to Supabase. On first sign-in, local guest progress is **merged** into the account (keep the most advanced status per lesson; keep the best quiz score) so nothing is lost.
- **Progress rules** (one source of truth for the whole app):
  - Opening a lesson while signed in writes `in_progress` once and updates `last_opened_at`.
  - A lesson becomes `completed` when the learner has stepped through the simulation to its last step **and** submitted the quiz. Any quiz score counts; the learner is never blocked, and can retry. The best score is kept.
  - Nothing is written on every click or step; only on first open, quiz submit and completion.
  - "Continue where you left off" = the most recently opened lesson that is not completed; if none, the next lesson in course order.
  - Overall and per-level progress = completed lessons ÷ built lessons.
  - Guest progress in `localStorage` follows the same rules and is merged on first sign-in.
  - Labs are **optional for completing a lesson** (never a gate), but each lab's completion is saved to `lab_progress` and shown on the course map and profile.

### Database (Supabase Postgres)

| Table | Columns | Purpose |
|---|---|---|
| `profiles` | `id` (uuid, PK, references `auth.users`), `display_name`, `created_at` | One row per user; created by a database trigger on sign-up. |
| `lesson_progress` | `user_id`, `lesson_id` (text), `status` (`in_progress`/`completed`), `last_opened_at`, `completed_at`, `updated_at`; PK (`user_id`, `lesson_id`) | Which lessons a user opened and finished. |
| `quiz_attempts` | `id`, `user_id`, `lesson_id`, `score`, `total`, `created_at` | History of quiz results. |
| `lab_progress` | `user_id`, `lab_id` (text), `status` (`started`/`completed`), `completed_at`, `updated_at`; PK (`user_id`, `lab_id`) | Which practice labs a user has done. |

**Row Level Security is enabled on every table.** Policies: a user can `select`, `insert` and `update` only rows where `user_id = auth.uid()` (for `profiles`, `id = auth.uid()`). No `delete` of other users' data, no public read. Tables and policies are created by SQL files committed under `supabase/migrations/`. A test script (run against the dev Supabase project, using only the anon key) must create two users and prove one user **cannot** read or write the other's rows.

**Account deletion:** all `user_id` foreign keys use `ON DELETE CASCADE` to `auth.users`. A `SECURITY DEFINER` database function (callable only by the signed-in user, deleting only their own `auth.uid()`) powers the "Delete my account" button, so no server code or service key is needed.

## 11. Approaches considered

1. **React + Vite + TypeScript SPA — chosen.** One shared simulation player plus a content file per lesson; the fastest way to build 40+ lessons that look and behave the same; easy to extend. Trade-off: individual lesson pages are harder for search engines to index (the landing page can still be tuned well).
2. **Next.js.** Server-rendered pages give better search visibility for every lesson. Rejected: heavier; Supabase login is trickier with server rendering; the simulations run in the browser anyway; SEO per lesson is not a stated goal.
3. **Plain JavaScript + Vite (like the reference).** Lightest. Rejected: with login, routing and 40+ lessons it becomes hard to maintain without types and components.

The owner asked for the technical choices to be made on their behalf; the pick above is the assistant's call, accepted by the owner.

## 12. Delivery phases

- **Phase 1 — Platform + Level 1.** Project scaffold (pnpm + Vite + React + TS), design tokens and theme, landing page, auth, Supabase schema + RLS + progress sync with guest merge, course map, lesson page shell, step player, glossary, quiz component, the lab framework (simulated-network core, network builder, terminal simulator with the first commands, auto-checked practice problems), Level 1 (6 full-depth lessons, each with a lab), Privacy and Terms pages, account deletion, deployment guide, and an **owner setup checklist** (create the Supabase project and run the migrations; set the Site URL and redirect URLs in Supabase Auth; optionally set up Google sign-in in Google Cloud and switch it on in config; choose the production domain and set `VITE_SITE_URL`; set up custom SMTP before launch). Phase 1 is done when email + password sign-in works end to end; Google sign-in is shipped but stays switched off until the owner finishes its setup, and that does not block the phase.
- **Phases 2–7 — one level each** (Levels 2 to 7). Each level also extends the simulated-network core and terminal with the devices and commands it teaches. Level 7 includes the final network-design project. Because theory is now full-length and every lesson has a lab, phases are larger than first sketched; Level 1 is the template for how later levels are written.

Each phase must end with: typecheck clean, lint clean, logic tests passing, production build passing, and the site working end to end.

## 13. Success looks like

- A stranger lands on the site, understands what it is within ten seconds, and starts Lesson 1 **without signing up**.
- They sign up, finish a lesson, close the browser, sign in on another device and see the same progress.
- A beginner can read a lesson and explain the idea back in their own words, without needing another website to fill gaps.
- A learner builds a network in the browser, runs a command in the terminal simulator, and sees the result match what the theory said; and can repeat the same idea with a real command on their own computer.
- The simulations match real networking behavior (verified by unit tests on the logic).
- A security check confirms users cannot see each other's data and no secret key ships to the browser.

## 14. Decisions

**Decided by the owner:** full-depth theory with no length restriction; hands-on practical activities for learners; React + Vite + TypeScript; pnpm; Supabase as the only backend; a landing page and a login page; progress saved for signed-in users; public access; the 7-level curriculum above; phased delivery with the platform and Level 1 first; the reference site's visual style.

**The assistant's calls (owner to check):**
- Guests can read and run everything; sign-in is only needed to save progress.
- Email + password and Google sign-in. Supabase's built-in email is rate-limited, so a custom SMTP provider should be set up before a large public launch.
- Lesson content lives in code, not the database.
- Tables: `profiles`, `lesson_progress`, `quiz_attempts` and `lab_progress` only.
- Static-site hosting with an SPA rewrite; Vercel is the suggested host (the reference uses it), Netlify or Cloudflare Pages also work.
- English only, no leaderboard/notes/forum in v1.
- Vitest for logic tests; unit tests required for networking logic.
- Progress rules in §10 (a lesson is complete after the last simulation step plus a submitted quiz, any score).
- Privacy, Terms and Delete-my-account are included from Phase 1 because the site stores emails and offers Google sign-in. The legal text is a plain-language template, not legal advice, and the owner should review it before launch.
- Product name **"NetSteps"** (chosen by the owner on 2026-11-24; it replaces the working name "NetPath", which collides with an existing SolarWinds product), kept in one config file so it can still be changed in one place. The production domain is set later through `VITE_SITE_URL`.
- Levels that are not built yet appear on the course map as "Coming soon".
- The practical side (§8b): a network builder, a terminal simulator, auto-checked practice problems, troubleshooting challenges, and safe "on your own computer" guides, all running on one shared simulated-network engine that starts small in Phase 1.
- Labs never block lesson completion; 5 quiz questions per lesson; "Go deeper" blocks hold the advanced detail.

## 15. Left to the builder

Styling method (CSS variables + CSS Modules or similar), routing and state libraries, icon set, exact visual design within the style above, file layout, the final wording of every lesson, quiz questions and glossary entries, the exact visuals of each simulation, whether to add end-to-end browser tests (e.g. Playwright), lint/format configuration.
