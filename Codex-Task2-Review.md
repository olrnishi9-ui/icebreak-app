# Codex Task 2 — PR Review (PR #2, branch `feat/task2-entry-flow`, commit f573924)

*Reviewed by Muse, 2026-11-14. Method: cloned the PR branch into a fresh
directory, read the full diff vs main (32 files, +3,910/−93), ran the install,
the full test suite, the typecheck, the production build, and the browser
smoke test in this environment, and captured real API payloads with an
independent script. Every result below was executed here, not inferred from
Codex's report. Codex's own report is `docs/Task2-Validation.md` in the PR.*

## Verdict: MERGE

No code changes required. Every acceptance criterion in the brief passes at
the level this environment can test, and the one level it cannot — a hosted
Supabase project — is explicitly unverified, not papered over (see "What
remains unverified"). Leo holds merge approval as always.

## Criterion-by-criterion results (brief numbering)

**Event creation + QR join**

1. **Unique code + join URL; QR decodes to the join URL — PASS, decoded, not
   eyeballed.** The organiser page renders `QRCode.toDataURL(joinUrl)`. The
   integration test rasterises the QR modules and decodes them with jsQR back
   to the exact join URL; the browser test decodes the actual rendered
   organiser-page QR image from canvas pixels. Both ran and passed here.
2. **Join URL pre-fills the event; wrong code → S1 error, no participant —
   PASS.** S1 fetches the public basics projection (`{id,name,status,active}`
   only) and shows the event name; the integration test asserts invalid
   code/name/goal attempts all fail ≥400 and leave **zero** participant rows.

**Guest session**

3. **Supabase Anonymous Auth; participant keyed by the authenticated user's
   id; no custom token scheme — PASS in code and local tests; hosted sign-in
   itself unverified.** The client calls the SDK's `signInAnonymously()` and
   lets the SDK own persistence; the server verifies every bearer with
   Supabase `auth.getUser(token)` and binds `users.auth_id` to the verified
   subject — it never accepts a caller-supplied user id. The test asserts the
   participant row's `user_id` equals the row created for that `auth_id`.
   A grep of the whole diff finds **no** token-hash/session-token code
   anywhere. The real hosted anonymous sign-in was not executed (no Supabase
   project credentials exist here; the hosted test skips by design).
4. **Name + goal only; everything else optional forever — PASS.** The S1 form
   has exactly two inputs (display name, goal select). The full path
   code → name → goal → skip-all → S3 is exercised in the browser test;
   profile fields are never demanded at any step (server enforces only
   name + goal).
5. **Refresh / close / reopen / browser restart restore exact state — PASS at
   fixture level; hosted restore unverified.** The browser test uses a
   persistent Chromium profile and survives reload, tab close/reopen and a
   full browser restart, asserting the restored SDK bearer authorises private
   reads; a service-level test restores profile/answers/availability from a
   fresh `EntryService`. The equivalent hosted-SDK restore lives in the
   skipped hosted test.
6. **Leave-event deletes participant, answers, availability — PASS.** The
   test verifies the rows are gone from `event_participants`, `answers` and
   `user_interests` after `DELETE …/membership`, and the same session then
   gets 404 from profile.

**Profile + questionnaire**

7. **Optional fields round-trip; a second participant cannot read them —
   PASS.** Field, fun fact, both visibility flags and all five topic types
   (interest/discuss/help/learn/ask_me_about, ask-me-about capped at 2)
   round-trip through PUT/GET; participant B's own profile shows none of A's
   data, and criterion 13 covers the data layer.
8. **Skips stored as skipped; all-skipped succeeds; resubmission updates in
   place — PASS.** Mixed answer/skip submissions persist exactly; skips are
   rows with `skipped=true, choice=null`, never a default option; upsert is
   `ON CONFLICT … DO UPDATE`.
9. **Validation: missing name/goal, unknown question IDs, out-of-range
   choices → clean 4xx, no partial writes — PASS.** All validation happens
   before the write transaction; tests assert stored state is byte-identical
   after each rejected submission.

**Availability + open-now list**

10. **Two-session behaviour — PASS** (two distinct verified identities through
    the real route handler + real PostgreSQL/RLS in PGlite). A opens → A
    appears in B's `GET /open`; A closes → A disappears on B's next read; A
    re-opens → the expiry extends; advancing the **server** clock 16 minutes
    (production TTL stays 15) → A disappears with no action by A; B never
    appears in B's own list. S3 polls every 3 seconds (asserted in the UI
    source and exercised in the browser test). Expiry is a query-time filter
    on `available_until` in both the SQL and the pure function — no cron, no
    background job, no client-side-only expiry. Two *hosted* Auth sessions
    were not executed (see unverified).
11. **Sort order — PASS, exactly the brief's arrangement.** Seeded
    participants arranged as (i) shared goal + 0 shared answers,
    (ii) different goal + 2 shared answers, (iii) shared goal + 1 shared
    answer return in the order **Casey (iii), Ari (i), Bo (ii)** — goal group
    first, shared-answer count within it. The pure function `lib/open-now.ts`
    has unit tests for goal priority, shared-answer ordering,
    most-recently-opened, injected random ties, self-exclusion, and
    expired/boundary exclusion — all executed here.
12. **Payload inspection — PASS, independently re-captured by this review.**
    Codex's test asserts a deep-equal payload; I additionally ran my own
    script against the real handler with a participant ("Bob") whose fun
    fact, field, help topic and ask-me-about were all set **and marked
    visible**. The actual `GET /open` response was:
    `[{"displayName":"Bob","goalLine":"Find teammates","chip":"Coffee"}]`
    — display name, goal line, one verbatim shared-answer chip, nothing else.
    A regex scan of the payload for score/rank/count/percent/compatib*, the
    secret fuel strings, question IDs, user IDs, auth/token material and raw
    choices came back **clean on every pattern**. The chip is the verbatim
    option text of a question both participants actually answered identically
    and neither skipped (AGENTS.md law 3). No participant-facing count of
    open users exists in the S3 UI or any payload (asserted by test; I also
    read the S3 page source — the list length is never rendered).

**RLS / access control**

13. **Other participants' data denied at the data layer — PASS.** Under real
    forced RLS with `SET ROLE authenticated` + `auth.uid()`, A's session
    reads A's rows in `users`, `event_participants`, `answers`,
    `user_interests`, `user_contacts`; B's rows return zero in every one —
    and symmetrically for B reading A. (Architecture note: the app server
    connects through a trusted Prisma role and enforces membership in the
    service layer first; Task 1's browser-role RLS remains in force
    underneath and is re-proven here. The open-now list is served only
    through the server-side fixed projection — there is no raw participants
    read for clients.)
14. **Cross-event — PASS.** A participant of event A calling event B's
    profile/open/availability/questionnaire endpoints gets 404/empty in
    every case, never B's data.
15. **Unauthenticated — PASS.** No-session requests to profile,
    questionnaire, availability and open all return 401.
16. **States + build — PASS.** S1/S2/S3 loading, empty and error states are
    implemented and exercised by the browser test (S1 loading + invalid
    code; S3's exact empty state "Nobody's open right now — you can be the
    first" with the event code visible; connection-lost banner with
    auto-retry and read-only list; skeleton loading; "The list order is not
    a ranking" caption; event name persistently in the header). Production
    build completes (component-wise — see below) and the test suite's real
    output is reproduced in this review.

## AGENTS.md compliance, law by law

1. **No scores/rankings/counts to clients — PASS.** No score-like key exists
   in any client payload (proven by capture, above); the sort keys
   (goal/shared/recency/tie values) are computed server-side and never
   emitted; `recommendations` is untouched and still unreadable.
2. **Rejection never visible — PASS by design.** No connection requests
   exist in this task; the only cross-participant surface is the fixed
   `/open` projection, which exposes no per-participant action or state
   change to anyone.
3. **Grounded content only — PASS.** The single chip is verbatim option text
   derived from both participants' actual answers. No LLM, no generated
   text about a person, no inference anywhere in the diff. A grep for
   banned copy ("match", "recommended for you", compatib*, score, percent)
   across `app/` and `lib/` finds nothing (the one hit is a regex
   `.match()` call).
4. **LLM rules — N/A;** no LLM/ML code added, as briefed.
5. **Progressive registration — PASS** (criterion 4).
6. **Event-scoped data + RLS proven by test — PASS** (criteria 13–15). New
   migration is additive only (new columns on `event_participants`, no new
   browser grants); the seed adaptation is non-destructive and an upgrade
   test proves Task 1 data survives the migration with names/goals
   backfilled. Contact details remain in their separate Task 1 table,
   untouched by any Task 2 endpoint.
7. **No in-app chat — PASS.** No messaging anywhere; polling (3s) only, no
   websockets/Realtime, no cron.

Engineering rules: all API inputs validated server-side; secrets via env
only (`.env.example` still placeholders; secret scan of the diff clean);
dependencies minimal — one runtime addition beyond the required Supabase SDK:
`qrcode`, the single small QR library the brief permitted, flagged in the
PR report; **testing honesty — exemplary again**: `docs/Task2-Validation.md`
reports the stock-build failure, the substituted Auth verifier, the skipped
hosted test and several found-and-fixed bugs, and every one of its claims
that this environment can check reproduced exactly (below). The two
evaluation documents and AGENTS.md are untouched (absent from the diff).

## Build & test results (executed here, 2026-11-14)

- `npm install` — **fails in this VM** at the `@prisma/engines` postinstall:
  `Error: aborted` (ECONNRESET) downloading Prisma's native engines —
  binaries.prisma.sh is unreachable from this sandbox (Codex's sandbox got
  HTTP 403 from the same host; it disclosed this). `npm install
  --ignore-scripts` installs cleanly.
- `npm test` — **PASS, 22 passed / 0 failed / 1 skipped**, identical to
  Codex's claim. The skip is the hosted Supabase test (no credentials). The
  suite runs the real migrations + seed in PGlite with non-superuser RLS
  roles and covers criteria 1–3, 6–15 above.
- `npx prisma generate` (stock) — fails, same blocked download. Engine-free
  generation (the documented workaround) — succeeds.
- `npm run typecheck` — **PASS** after generation.
- `npx next build` — **PASS** after generation (placeholder public Supabase
  values, as in Codex's run): all routes generated — `/`, `/join`,
  `/join/[code]`, `/event/[id]`, `/organiser`, `/organiser/[id]`,
  `/api/[...path]`.
- `npm run test:browser` — **PASS, 1/1**, run here against my own production
  build with the Playwright-cache Chromium: S1–S3 states, fixture entry,
  polling/offline recovery, restore across tab close and browser restart,
  and decoding the rendered organiser QR from pixels. (Fixture API/Auth by
  design — it proves UI behaviour, not the hosted backend.)
- Independent payload capture — see criterion 12.

**Conclusion on the build:** as with Task 1, every component passes once the
Prisma client is generated; the single failing step is the network block on
Prisma's binary CDN, reproduced in two independent sandboxes. The stock
`npm run build` end-to-end remains verified only component-wise.

## Notes (not merge blockers)

1. **S2 has no separate route.** Quick Setup lives on `/event/[id]`, gated by
   the participant's `step` (`setup` → questionnaire panel + profile access;
   `home` → the board). All §7 states and functions are present; only the
   URL shape differs from a literal three-page reading of the screen spec.
   Flagging in case the demo script refers to an S2 URL.
2. **Shared-answer count includes the goal questionnaire item** when both
   participants answered it identically (goal equality is also the primary
   sort key, so the effect is second-order). The brief's §9 wording counts
   "shared non-skipped answers" without excluding that item, and the
   arranged sort test is unaffected. Observation only.
3. **Re-join is restore-only.** Joining again with the same session does not
   overwrite the original display name/goal (`ON CONFLICT DO NOTHING`);
   renaming is via profile update. This matches the brief's "repeat join
   restores" and prevents silent overwrites.
4. **`GET /api/events/:code/questions` is public** (S1 needs the goal options
   before join). It exposes only the question bank of an active event — no
   participant data — and is documented in the README API contract, along
   with the other adaptations (explicit `eventId` on profile/questionnaire,
   membership DELETE, organiser GET, the two availability routes).

## What remains unverified

- **Hosted Supabase behaviour, entirely:** real anonymous sign-in and token
  refresh, hosted RLS through PostgREST, Prisma transport against a hosted
  database, migrations/seed applied to a hosted project, and two real
  devices on a venue network. `tests/hosted.test.mjs` covers exactly this
  and skips without `TEST_APP_URL` + real public Supabase env vars. Run it
  against a disposable configured project before the demo.
- **Stock `npm run build` end-to-end** on an unblocked network (above).
- **The <30-second join as a timed, real-network measurement.** It is
  verified by construction (two required fields, one tap to submit) and by
  the fixture browser flow, not by a stopwatch on hosted infrastructure.

## Fix list

None required for merge. Deployment checklist (not code fixes): (1) run the
hosted test on a configured development Supabase project with Anonymous
sign-ins enabled; (2) confirm the stock build on an unblocked network
(e.g. Vercel) before relying on it.
