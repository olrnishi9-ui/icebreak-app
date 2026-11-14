# Task 3 validation and review report

Branch: `codex/task3-connections`, created from `origin/main` at `025dfd0`.
Executed on 2026-11-14 with Node v24.22.1 and installed Chromium.

## Changes and decisions

- `lib/connection-service.ts`, `lib/connections.ts`, `lib/connection-policy.ts`:
  request/consent state, stored grounded reason, 5/10-minute time box, private
  Later, query-time expiry, neutral rate/block enforcement, pure meeting-point
  assignment, arrival/start, pre-start cancel, and consented short-code fallback.
- `lib/http.ts`, catch-all route: all Task 3 endpoints, PATCH export, injected
  clock for boundary tests. Supabase Anonymous Auth is unchanged: verified Auth
  subject resolves through the existing users.auth_id membership mapping. No
  custom tokens or hashes were introduced.
- `app/components/connection-flow.tsx`, event home, styles: S3 entry/code/inbox,
  S4 waiting/retry, S5 identical photo/direction/time box and arrival states.
  No Task 4 cards, arc generation, progression, feedback or contacts. Prep slot is
  empty. Disconnected state disables both board and connection controls.
- Organiser page/editor, entry service/types: Task 1 had no meeting-point config,
  so organisers can configure actual venue photos/directions before accepting
  board requests. No real location is invented. Live sessions lock configuration
  to preserve occupancy; each session stores one immutable point snapshot.
- `prisma/schema.prisma`, additive `202611140003_connections` migration: short
  codes, request metadata, sessions/arrivals, points, blocks/reports; revocation
  of raw request/decision reads; fixed safe DB projection; forced RLS and explicit
  grants. A trigger independently prevents overlapping pending unordered pairs.
  Existing migrations and seed data were not edited. Upgrade test proves preservation.
- Tests/helper, scripts and README: complete API contract, route adaptations and
  honest test coverage. Task 2 board test now allows the participantId required
  to address invitations without relying on nonunique display names. It is never
  displayed as an identifier. Inbox safety resolves the counterpart server-side
  from an own requestId rather than exposing more participant metadata.
- `lib/database.ts`: explicit Prisma transaction callback type; no adapter redesign.

Policy values: TTL **15 minutes**, pending incoming **3**, pair re-request cooldown
**30 minutes after original expiry**, rolling sends **20 per participant per event
per hour**. Cancel retains the original pair cooldown. Later does not release an
incoming-cap slot or change sender retries/board visibility. Opposite board sends
accept the original request and duration. Event row locking serializes mutations,
point occupancy and availability/leave with accepts. A live session cannot be
unpaused or deleted by leaving; pre-start cancellation restores both parties.

Code connects need the owner's Start consent, work without board availability,
and still enforce session/mute, block, cap, rate and cooldown. They go directly
to started with a null meeting point (already together), no arrival step.

## Executed results

- `npm test`: **35 passed, 0 failed, 1 skipped** (36 tests including parent tests).
  The skip is the opt-in hosted Supabase test; no configured deployment or real
  public Supabase credentials were supplied.
- `npm run typecheck`: **passed**.
- `npm run test:connections:browser`: **passed**. Actual production UI, two
  independent Chromium contexts, real HTTP handlers and PGlite SQL/RLS. Only
  identity verification and persisted SDK credentials are fixtures. Browser API
  requests are bridged to those handlers, not to a live Prisma/Postgres deployment.
- `npm run test:browser`: **passed** (Task 2 S1–S3 fixture regression).
- Standalone `npx next build` with public fixture configuration: **passed**.
  This verifies compilation/TypeScript/static rendering, not the database runtime:
  native Prisma generation did not complete and the installed client stub remained.
- `git diff --check`: **passed**.

Actual Task 3 unit/integration output:

```text
✔ meeting assignment is pure: emptiest wins, configured ties, no points (1.614782ms)
▶ Task 3 HTTP + PostgreSQL integration, real migrations and RLS; Auth verifier is substituted
  ✔ send, exact grounded reason, duration validation, goal fallback, cap-neutral duplicates and data-layer unique unordered pair (284.620849ms)
  ✔ REQUIRED indistinguishability: Later / never seen / opened, identical complete sender responses and screen selectors before, at, after expiry; board unchanged (1979.588807ms)
  ✔ accept honors the exact millisecond expiry boundary for database Date objects (136.222704ms)
  ✔ REQUIRED two authenticated clients: request -> accept -> identical point snapshot -> both arrived -> started; fresh services restore every step (365.659154ms)
  ✔ mutual sends resolve once; occupied point goes to next point, pre-start cancel releases it and restores availability; late and start anyway (303.504406ms)
  ✔ concurrent opposite sends create one accepted request/session; racing accepts never double-book a participant (96.38965ms)
  ✔ code fallback requires owner Start, works when closed, no point/arrival; wrong or other-event code creates no row; code Later stays pending (116.916116ms)
  ✔ same neutral response: pending cap, closed, busy/muted, block both ways, cooldown, duplicate, sender rate limit; expiry frees cap; reports are private and do not change state (295.236458ms)
  ✔ inbox safety actions resolve only the caller’s own request; report changes no connection state; block dismisses privately (83.223074ms)
  ✔ payload allowlists; raw request/decisions denied, safe DB projection, sessions only two members, no third-party requests, blocks/reports denied; no history on expiry (116.927593ms)
  ✔ all routes reject unauthenticated callers; cross-event IDs and wrong-party actions denied; event ended; config validation/ownership (101.770634ms)
✔ Task 3 HTTP + PostgreSQL integration, real migrations and RLS; Auth verifier is substituted (7658.237804ms)

ℹ tests 36
ℹ suites 0
ℹ pass 35
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 19824.043621
```

Actual Task 3 browser output:

```text
✔ Task 3 browser: two contexts, restore, identical meeting, arrivals, retry/offline/cancel, and three indistinguishable rendered timelines (37307.390074ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 38437.890257
```

## Failures, corrections and remaining limits

**Required standard build remains blocked:** `npm run build` stops at
`prisma generate` because the environment's allowed destinations exclude
`binaries.prisma.sh`; the request returns **403 Forbidden**. `npm run db:generate`
and `npx prisma validate` hit the same block. Retrying with the documented missing
checksum override reached the binary download and also got 403. No generated
client/native-engine or live Prisma runtime success is claimed. Standalone Next
compilation does not substitute for a successful standard build. Rerun generation,
schema validation and the full build in an environment allowing that host before
merging. No deployment or production migration was performed.

An initial `npm ci` failed writing its default home cache; installation succeeded
with `--cache /tmp/icebreak-npm-cache`. Initial integration failures were an API-vs-
database test-clock mismatch and the old Task 2 payload allowlist; both were
corrected and the full suite rerun. Review also caught millisecond truncation from
Date.parse on database Date objects: reads now use Date.getTime, with an accept at
the final millisecond succeeding and an accept at exact expiry failing.

An earlier browser run found the two polling surfaces did not disable controls
at the same time when disconnected; parent/connection offline state is now shared.
Another captured initial loading rather than the restored board; initial connection
loading is now distinct and the test waits for restoration. A short-code Start
prompt wait timed out once; the diagnostic rerun and a separate confirmation run both passed. The earlier timeout is
reported rather than erased, and diagnostics remain in the test for recurrence.

Indistinguishability is tested against identical seeded pair/request/time in all
three scenarios: immediate Later, unseen, opened/no action. HTTP payloads and
screen selection are equal before/at/after expiry for **both board and code**.
The browser separately compares actual rendered S4/S3 text and full connection
payloads at matched times. The journey tests cover identical stored meeting
objects, both-arrived startedAt, reload and tab-close/reopen restoration, late,
start-anyway, pre-start cancel/release, short-code consent, offline/retry, safety,
cap/cooldown/rate limits, allowlisted payloads and real PostgreSQL RLS.

Not run: hosted Supabase Auth/Prisma integration, multiple PostgreSQL backend lock
contention, or two real phones on venue Wi-Fi. PGlite serializes transactions;
Promise.all tests prove application resolution but are not a multi-backend load
benchmark. No claim is made about those unexecuted checks. Task 4+ remains out of
scope. There is no known unfinished Task 3 implementation path; full native build
and hosted verification remain review gates.

## Confirmation run

The final Task 3 browser run was repeated alongside the Task 2 browser regression.
Both passed. Actual confirmation output:

```text
✔ Task 3 browser: two contexts, restore, identical meeting, arrivals, retry/offline/cancel, and three indistinguishable rendered timelines (40836.877069ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 42000.641218
✔ S1–S3 browser states, optional setup, edits, poll recovery, restore and QR at desktop/mobile (fixture backend) (24087.3074ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 24968.802997
```
