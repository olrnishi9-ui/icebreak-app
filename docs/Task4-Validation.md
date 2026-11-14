# Task 4 validation

Implemented the approved judgment calls in `docs/Codex-Task4-Brief.md`.

## Files and decisions

- `lib/arc.ts`: pure deterministic, consent-filtered material selection; fixed
  question ordering, seek/offer preference, alternating roles, optional
  ask-me-about, unused material and honest short arc. One-sided ask-me-about
  uses unused verbatim material for the other view; exhaustion never creates text.
- `lib/arc-service.ts`, `lib/arc-client.ts`: stored script, explicit payload,
  lock + positional compare-and-set progression, proportional offers, normalized
  closing, offline script traversal and queued reconciliation, private choices,
  per-field release, author-only notes, write-only optional feedback.
- `lib/connection-service.ts`, `lib/connections.ts`, `lib/http.ts`: the shared
  session-creation hook (including reverse mutual-send and code-owner Start), S5
  script payload and validated session APIs. Existing consent behavior retained.
- `lib/open-now.ts`, `lib/service.ts`: previous conversation pairs sort last.
- `app/components/conversation.tsx`, `connection-flow.tsx`, event page and CSS:
  prep, S6/S7, optional format feedback, S8, explicit paused-room return, mobile
  controls, visual/vibration offers and reduced-motion styling.
- New migration `202611140004_arc` and Prisma model additions: script/state,
  data-only closing reason/resume position, private choices/notes, nullable
  skipped feedback scales, feedback SELECT denial. Existing migrations untouched.
- Tests and README: API contracts, new end-to-end and privacy checks; one Task 3
  RLS assertion now selects permitted session columns rather than `SELECT *`,
  because the latter must fail once the private reason column exists.

The closing actor is never stored. Closing normalizes elapsed, position,
skipped states and card states, in addition to using the same script and screen.
Both Done, both exchange and both opt-ins are required before any contact field
is released. Partial or differing choices have the same null outcome. Session
close releases occupancy, pauses availability and records pair history. Keep
talking reopens the prior card unless either has finalized or joined another
live session. Feedback copy explicitly rates the conversation format.

## Executed results

`npm test`: real PGlite PostgreSQL, every SQL migration, HTTP handlers and distinct
authenticated client identities; only identity verification is substituted.
Actual final Task 4 output and suite summary:

```text
✔ buildArc: ordered verbatim shared/difference/situational, seek/offer preference, ask-me-about and no reuse (2.948856ms)
✔ two authenticated sessions full end-to-end, roles, timed offers, race, restore, offline script, close, exchange, feedback (4372.747565ms)
✔ closing indistinguishability: early wrap-up and accepted scheduled close have identical payloads and UI state (1366.033832ms)
✔ exchange double opt-in, private notes, feedback, RLS, outsider/cross-event/auth, close side effects (1847.670708ms)
✔ code-enterer starts, frozen script, skip persistence, shortened proportional offers, minimal exhaustion and invalid inputs (1256.634764ms)
✔ one-sided ask-me-about falls back to unused verbatim material for the other view (0.500943ms)
ℹ tests 42
ℹ suites 0
ℹ pass 41
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 28500.985672
```

The two-session test includes join (shared fixture), questionnaire, open, request,
accept, identical meeting-point/prep payloads, both arrivals, started, expand,
deepen, close, mutual next step and feedback. Additional tests cover code-enterer
roles, script immutability, timed offers without advance, skip/race persistence,
minimal exhaustion, asymmetric contact consent, hidden contact fields, notes
edit/delete, feedback idempotency/privacy, real RLS and cross-event/auth denial.
The early/scheduled close test compares both complete arc projections and checks
the different data-only reasons; the browser also compares actual S7 text.

`npm run typecheck`: passed.

`npm run test:arc:browser`: passed against the actual production UI, HTTP handler
and PGlite with fixture Supabase identities. Two independent pairs (four browser
contexts); rendered early/scheduled close comparison, deepen restoration,
private Done/feedback/paused return, and every remaining card traversed with all
browser API traffic blocked for the second pair. No page errors or horizontal
overflow in the tested mobile viewport.

`npm run test:connections:browser`: passed (Task 3 regression).

`npm run test:browser`: passed (Task 2 presentation regression; its API responses
are deliberate fixtures, unlike the Task 3/4 browser integration backend).

Standalone production compilation with public placeholder Supabase configuration:
`NEXT_PUBLIC_SUPABASE_URL=https://task2-test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=fixture node_modules/.bin/next build`: passed.
This checks the production Next UI/API compilation, not Prisma native generation.

## Failures and limits (not claimed as passed)

- `npm run build`: failed at `prisma generate`, before Next compilation, because
  `binaries.prisma.sh` returned **403 Forbidden** for the schema-engine checksum.
  Full standard build / native Prisma generation and schema validation remain
  unverified in this environment. The direct production Next build above is not
  a substitute for that required full command.
- The hosted Supabase test is skipped because no disposable hosted app and real
  Anonymous Auth configuration were supplied. Browser tests use real PostgreSQL
  RLS locally, but substitute identity verification; no real Supabase deployment
  or physical-phone/venue-Wi-Fi test was performed.
- Initial `npm ci` failed because its default cache directory was unwritable;
  rerunning with `--cache /tmp/icebreak-npm-cache` succeeded. Initial test startup
  and typecheck consequently failed with missing/partially installed modules.
- Intermediate runs found a SQL-string quoting error, a test fixture that did
  not complete/skip every question, and the old `SELECT *` RLS assertion. All were
  corrected; the final executed results above are from the corrected code.
- Offline private choices/notes/feedback save only after reconnect. Card reading
  and progression continue using the downloaded script; there is no offline
  contact release. If both users advance while disconnected, the server's
  positional compare-and-set reconciles the shared state on reconnect.

- One browser rerun timed out waiting for the board after rebuilding `.next`
  underneath the already-running production server. A fresh production server
  on port 3001 against the final build passed the complete Task 4 browser test.
- The final targeted Task 4 rerun, including the submitter’s own feedback RLS
  denial assertion, passed all six tests.

Actual final browser output:

```text
✔ Task 4 rendered closing indistinguishability, two authenticated contexts, restore, full UI exchange/feedback and offline remaining cards (48143.293504ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 49182.362711
```

No known unfinished Task 4 product path remains. Event ending/archiving, LLM/NN
phases, organiser aggregates and real deployment remain out of scope.
