# Task 2 execution report

Branch: `feat/task2-entry-flow`, created from updated `origin/main` (`a6793ae`).
AGENTS.md and the Task 2 brief were read from main before implementation; both
binding evaluation documents were consulted. All three are unchanged.

## Delivered and key decisions

- `app/page.tsx`, `app/join/[code]/page.tsx`, `app/event/[id]/page.tsx` and the
  shared/profile components implement S1–S3; `/join?code=` redirects to S1.
  `app/organiser/page.tsx` and `app/organiser/[id]/page.tsx` create and display
  invitations with an actual QR, code and copyable URL.
- `app/api/[...path]/route.ts` dispatches the documented route subset through
  `lib/http.ts`, `lib/service.ts`, `lib/database.ts`. Bearers are verified by
  Supabase `getUser`, not locally decoded/trusted. `lib/supabase.ts` delegates
  sign-in, refresh and persistence to the SDK. No custom token mechanism.
- Memberships hold event-local names, goals and optional fuel. Required entry
  goal is separate from the skippable questionnaire goal. Questionnaire taps
  autosave; completing or skipping all persists home/setup progress. Profile
  Save persists optional fields and per-field/topic visibility.
- `lib/open-now.ts` is a pure, unit-tested ordering and projection function.
  Goal, non-skipped shared answers, opening recency, injected random tie values.
  Only displayName, goalLine and an optional verbatim chip are returned.
- Additive migration `202611140002_entry_flow`, Prisma schema, non-destructive
  seed adaptation and explicit admin-only `prisma/demo-open.sql` preserve the
  Task 1 auth-keyed RLS model. No new client write permissions or discovery
  grants. Availability expires in server queries, with the production TTL
  fixed at 15 minutes and the UI polling every 3 seconds.
- README, environment example and development-doc pointer contain setup and
  final API contracts. Runtime additions: required Supabase SDK and permitted
  `qrcode`; development additions: QR types, `jsqr`, `playwright-core`.
  Node 22+ is required by the SDK (documented and declared in package engines).
- No connection requests, conversation cards, LLM, ML, messaging, realtime,
  cron, contact-exchange or organiser statistics/end-event implementation.

## Executed checks

- `npm test`: **22 passed, 0 failed, 1 skipped** (23 reported tests including
  parent tests). Actual migrations and seed execute in PGlite with real
  PostgreSQL constraints and non-superuser RLS roles. Route integration uses
  a substituted identity verifier; this is not a hosted Auth test.
- `npm run test:browser`: **1 passed, 0 failed**, headless installed Chromium,
  against the production Next app with deliberate API/Auth fixtures. Covers
  S1 loading/invalid code; required-field entry + all-skipped setup in <30s;
  S2 save error/retry; optional multiline profile save and round-trip; S3 empty
  and populated states, availability text, polling, offline read-only banner
  and recovery; mobile overflow; saved questionnaire state; refresh, tab
  close/reopen and full Chromium restart using a persistent browser profile.
  Private fixture reads assert that the real SDK sends its restored bearer.
  The organiser page's rendered QR image is decoded with jsQR from canvas pixels.
- `npm run typecheck`: **passed**.
- `prisma validate`: **passed**, using non-secret placeholder database URLs and
  binary-path overrides to use the bundled WASM validation without downloads.
- Engine-free client generation:
  `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true PRISMA_QUERY_ENGINE_LIBRARY=/bin/true npx prisma generate --no-engine`:
  **passed**, for build checking only.
- `npx next build` after engine-free generation: **passed**, including TypeScript
  and generation of the home/organiser pages and dynamic entry/API routes.
  Public Supabase values were **test placeholders** for fixture browser checks;
  do not deploy that local build with those values.
- `git diff --check`: passed. Binding instructions/evaluation docs unchanged.
- Screenshots under ignored `work/screenshots` reviewed at desktop and mobile;
  a missing header font glyph was replaced. No screenshots/tokens are committed.

## Acceptance evidence and limits

| Brief criteria | Evidence |
| --- | --- |
| 1–2 event/code/QR | SQL/route event creation, unique codes, public name projection and invalid-code/no-membership tests; independent QR-module decode and rendered-browser-image decode. Browser page/API linking uses fixtures. |
| 3 real anonymous Auth | Auth-subject-to-membership mapping passes locally. **Hosted anonymous sign-in not executed**; opt-in hosted test skipped for missing configuration. No custom-token columns/code. |
| 4 minimal entry | Browser fixture flow with only code, display name and goal, skip-all, <30s. Real network/venue latency unmeasured. |
| 5 restore | Saved SQL state restored through fresh service; SDK fixture bearer/profile/answers/availability survive reload, tab close/reopen and actual browser restart. Hosted refresh/expiry unverified. |
| 6 leave | Local API deletes membership and cascades answers/topics/availability; same identity then receives 404. |
| 7–9 profile/questionnaire | Real SQL round-trips all fields/visibility, explicit skips/all-skips/upserts and atomic invalid-input rejection; UI save/retry and multiline edits checked. |
| 10 two sessions/expiry | Distinct verified-test identities and database memberships exercise on/off, no self, re-open extension. Server clock advanced 16 minutes, production TTL unchanged. Fixture browser confirms 3s poll updates/recovery. **Two real hosted Auth sessions not executed.** |
| 11–12 sort/payload | Pure ordering tests plus arranged seeded API order Casey/Ari/Bo; exact projection assertions including known private fuel; no metric or raw answer/credential/ID fields. |
| 13–15 RLS/isolation/auth | Actual forced RLS roles for every touched private table; own reads succeed, other rows hidden. Task 1 feedback/internal-score proofs retained. Cross-event profile/open/availability/questionnaire denied; unauthenticated private routes rejected. Supabase Auth infrastructure is substituted in PGlite, not hosted PostgREST. |
| 16 build/states | Next production build and fixture browser checks pass; standard build limitation below remains. |

## Failures encountered and unresolved work

- **Standard `npm run build` fails** at `prisma generate`: Prisma binary checksum
  download at `binaries.prisma.sh` returns **HTTP 403 Forbidden**, reproducing the
  Task 1 environment limitation. Engine-free generation allows the separate
  Next production build; it does **not** establish working Prisma transport.
- No real Supabase/database credentials were provided. Hosted migrations,
  Prisma transport/seed, hosted Auth sign-in/token refresh, and full multi-device
  venue-network acceptance remain **unverified**. `tests/hosted.test.mjs` is
  opt-in via `TEST_APP_URL` and real public Supabase environment variables; it
  deliberately skips without them. These are required follow-up acceptance
  checks on a configured development deployment.
- Initial npm install failed because the default cache under `/home/agent`
  was unavailable; workspace-local `work/npm-cache` resolved it.
- Initial typecheck found a shadowed questionnaire function. Initial integration
  run hung because an update transaction queried via its outer connection;
  interrupted, corrected to use the transaction connection, and rerun.
  A test compared a previously sorted mutable array against SQL enum order;
  changed that assertion to sort a copy. Final checks pass as above.
- Early browser runs found an ambiguous Next route-announcer test selector and
  a populated textarea label issue. Selector narrowed and textarea explicitly
  labelled; multiline topic entry also now retains trailing newlines while
  editing. Final browser run passes. Schema validation first failed because
  DIRECT_URL was absent; non-secret validation-only placeholders resolved it.
- Prisma 6 emits its existing package.json seed-configuration deprecation notice.
  No automatic deployment or merge was performed.

## Raw final test output

```text
> icebreak-app@0.1.0 test
> node --import tsx --test tests/*.test.mjs

▶ migration, repeatable seed, integrity and browser-role privacy
  ✔ seed has six guests, five binary questions, one goal, and explicit skips (74.900757ms)
  ✔ participant sees only own answers, contacts, interests and feedback (89.719254ms)
  ✔ internal recommendations cannot be selected by any participant (14.506622ms)
  ✔ private decline leaves sender response and expiry identical (66.056713ms)
  ✔ browser cannot forge membership, identity, acceptance or consent (20.266234ms)
  ✔ constraints reject cross-event answers, invalid options and unrelated feedback (30.417674ms)
✔ migration, repeatable seed, integrity and browser-role privacy (5189.246491ms)
▶ Task 2 routes + PostgreSQL integration (Auth verifier substituted, actual RLS)
  ✔ create unique event codes, question bank and decode QR to exact join URL (274.965601ms)
  ✔ invalid input/code creates no participant; name + goal join binds users.auth_id; repeat join restores (124.490212ms)
  ✔ profile optional fields and visibility round-trip; invalid mutations do not partially write (201.993792ms)
  ✔ questionnaire explicit skips, all skipped, in-place resubmission; clean atomic validation errors (128.37999ms)
  ✔ two independent identities: open appears, off disappears, reopen extends, server expiry without A action, no self (70.62818ms)
  ✔ payload ONLY name, goal line and <=1 verbatim shared chip; UI has no open count (17.760275ms)
  ✔ every touched table: own row readable, other profile/answers/fuel/contact denied through real RLS (25.542641ms)
  ✔ cross-event profile/open/availability/questionnaire and unauthenticated access blocked (41.530108ms)
  ✔ seed demo path and API goal-first ordering with three arranged participants (53.362993ms)
  ✔ fresh service/session state restores full saved profile/answers/availability; leave cascades (11.979426ms)
✔ Task 2 routes + PostgreSQL integration (Auth verifier substituted, actual RLS) (3804.656913ms)
﹣ hosted Supabase Anonymous Auth: two SDK sessions, storage restore, join and availability (1.361676ms) # Set TEST_APP_URL and public Supabase env vars for a disposable configured test deployment.
✔ goal priority then shared answers; only fixed projection and one verbatim chip (1.864981ms)
✔ recently opened breaks ties, then injected random values; does not mutate input (0.477758ms)
✔ self, expired, boundary and closed excluded; explicit skips never contribute (0.251868ms)
✔ additive migration preserves already-seeded Task 1 data and backfills event names/goals (2603.700292ms)
ℹ tests 23
ℹ suites 0
ℹ pass 22
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 14624.966065
```

```text
> icebreak-app@0.1.0 test:browser
> node --test tests/browser.smoke.mjs

✔ S1–S3 browser states, optional setup, edits, poll recovery, restore and QR at desktop/mobile (fixture backend) (21560.06438ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 22579.271614
```
