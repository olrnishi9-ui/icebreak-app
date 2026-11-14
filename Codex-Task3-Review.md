# Codex Task 3 — PR Review (PR #3, branch `codex/task3-connections`, commit 3a79623)

**Verdict: MERGE** — after the draft PR is marked ready (PR #3 is a draft; marking it
ready is a mechanical step, not a code change). No code fixes required. Non-blocking
notes are listed at the end.

Review depth: targeted (per the speed playbook) — full diff read, all load-bearing
requirements checked in code, the full test suite + typecheck + production build +
both browser suites executed here, and an independent payload inspection run against
the real HTTP handler. Review used the warm Task 2 clone
(`~/workspace/icebreak-app-review-task2/`, dependencies reused; `package.json` gained
only a test script, `package-lock.json` unchanged, so no reinstall was needed).
Diff vs main: 25 files, +3,107 / −175.

## What was delivered vs the Task 3 brief

Connection requests with a system-derived shared reason + 5/10-minute duration,
Accept / Later responding, silent expiry via a derived requester projection,
rate limits + block/report, meeting-point assignment on accept, "I'm here" arrival
to the `started` state, and short-code connect — screens S4 and S5 (prep-card slot
reserved and empty), plus the S3 additions (tap-to-request, incoming entry, own
short-code display, code entry). One new migration
(`202611140003_connections`) adds short codes, request duration/reason/kind/withdrawn,
meeting points, sessions, blocks, reports, the data-layer unique-pending-pair
trigger, and the `request_projection` SQL function. Routes match the brief's list,
plus one documented addition (organiser `PUT /events/:id/meeting-points`, needed to
supply the configured points the brief assumes; noted in the README contract).

## Load-bearing requirements — checked in code

- **(a) Grounded shared reason + duration.** Duration validated to exactly 5 or 10.
  The reason is computed server-side at send time: the verbatim option text of the
  first question (by position) both participants answered identically and neither
  skipped; fallback is the verbatim goal relation ("You're both here to X", or both
  goal lines joined, unembellished). No requester-supplied text field exists.
- **(b) Accept / Later only.** The recipient's outcome is stored only in the separate
  `connection_request_decisions` table; `SELECT` on it and on raw
  `connection_requests` is revoked from the browser role. The string `declined`
  appears in the diff only in server-side decision inserts and in test assertions
  banning it from payloads — never in UI code, API responses, or copy.
- **(c) Derived projection.** Requester-facing status comes from
  `app_private.request_projection(...)`: `accepted` if accepted, else `pending`
  while now < `expiresAt`, else the row simply leaves the outgoing list at expiry
  (identical in every scenario). The decision row never feeds the projection.
- **(d) Rate limits + block/report.** Constants in `lib/connection-policy.ts` match
  the brief exactly: `REQUEST_TTL_MIN = 15`, `MAX_PENDING_INCOMING = 3`,
  `RE_REQUEST_COOLDOWN_MIN = 30`, `MAX_REQUESTS_PER_HOUR = 20`. Every failed
  precondition (not open, at cap, in a session, muted, blocked either way,
  cool-down, duplicate, sender rate limit) returns the same neutral
  `409 "Not available right now."`. Blocks are checked in both directions and also
  dismiss the blocker's own inbox under the same privacy rule as Later; reports
  insert a data-layer-only row and change no state.
- **(e) Identical meeting-point object.** On accept, the point is computed once by
  the pure `assignMeetingPoint` (least live sessions; ties by configured order) and
  stored as JSON on the session row; both participants' payloads serialise that
  single stored object. No location data is collected or used.
- **(f) Arrival → `started`, and nothing beyond.** Arrive sets the caller's flag and
  sets `startedAt` when the partner has arrived; start-anyway requires the caller
  to have arrived; cancel is pre-start only. The session state exposed is only
  `meeting` | `started`; the started screen renders only "Your conversation has
  started." There is **no** `buildArc`, no card content or progression anywhere in
  the diff — the prep-card slot is an empty `<div data-prep-card-slot="" />`.
  Task 4 scope is absent, as required.
- **(g) Short code keeps mutual consent.** Codes are event-scoped, 8 characters,
  shown only to their owner, never in a URL. Entering a code creates a pending
  code-kind request; the owner must tap Start (accept) before a session exists.
  Code sessions start immediately in `started` with `meetingPoint: null` and no
  arrival step. Wrong code → plain 404, no row; a code from another event resolves
  to nothing. Owner Later lapses under the same indistinguishability rule.
- **(h) Session model unchanged.** Auth is still the Task 2 path (Supabase bearer
  verified via `auth.getUser`, participant keyed by `users.auth_id`); the diff
  contains no token-hash or custom session-token code. The brief's stale
  "session token" wording was overridden by the dispatch erratum, and the
  implementation follows the erratum.

Also verified: simultaneous opposite-direction sends convert to a single acceptance
(a mutual request is consent), with a race-safe event lock plus a database trigger
forbidding overlapping pending requests for an unordered pair (the brief's
data-layer enforcement); on accept both participants are auto-paused and muted;
pre-start cancel restores both to open with a fresh 15 minutes, releases the point,
and shows only the neutral copy "Plans changed. You're open to chat again."; S4
waiting copy is the brief's §7 wording ("no reply just means not now").

## Test & build results (executed here, 2026-11-14)

Reviewer's own runs, not Codex's claims (they agree):

- `npm test` (full suite, real migrations + forced RLS on embedded Postgres):
  **35 pass / 0 fail / 1 skipped** — identical to Codex's reported numbers. The one
  skip is the opt-in hosted Supabase test (no credentials exist); see the gate below.
  The Task 3 file alone: **13/13 pass**, including:
  - *"REQUIRED indistinguishability: Later / never seen / opened, identical complete
    sender responses and screen selectors before, at, after expiry; board unchanged"*
    — I read this test line by line: it seeds an identical request (same UUID, same
    timestamps) for both board and code kinds, runs all three recipient behaviours,
    captures the sender's **complete** `GET /api/connections` response, screen
    selector, and open-board at six matched time points (0, 7.5 min, 1 ms before
    expiry, at expiry, 1 ms after, 30 min), asserts no
    `declined|dismissed|rejected|decision|recipient_id` string appears, asserts a
    re-send returns the same 409 in every scenario, and finishes with
    `assert.deepEqual` across the three full timelines. It is a genuine
    byte-level-equality test, not a smoke check.
  - *"REQUIRED two authenticated clients: request → accept → identical point
    snapshot → both arrived → started; fresh services restore every step"* — asserts
    `deepEqual` of the two clients' meeting-point objects, started state with
    `startedAt`, and state restoration from fresh service instances at each step.
  - Neutral-response equality across all unavailability causes, pending-cap freeing
    on expiry, cool-down, block both ways, payload allowlists, RLS denials
    (raw requests/decisions `permission denied`; third participant reads zero rows;
    blocks/reports denied), cross-event and unauthenticated rejection.
- `npm run typecheck` — **pass** (exit 0, no errors).
- Production build — **pass**, component-wise as in prior reviews: stock
  `prisma generate` cannot download native engines on this machine (documented
  environmental block, unchanged), so the client was generated engine-free
  (`PRISMA_…=/bin/true npx prisma generate --no-engine`, Codex's documented method)
  and `next build` then compiled and generated all routes (`/`, `/join`,
  `/join/[code]`, `/event/[id]`, `/organiser`, `/organiser/[id]`, `/api/[...path]`).
  The single end-to-end `npm run build` remains unverified on this machine for the
  same network reason as Tasks 1–2; it is expected to run at deploy time.
- `npm run test:connections:browser` — **pass** (37.0 s; Codex reported 37.3 s /
  40.8 s): real production UI in two browser contexts — restore, identical meeting
  point, arrivals, retry/offline/cancel states, and three indistinguishable
  *rendered* S4/S3 timelines. Note for reproduction: the app must be built with
  `NEXT_PUBLIC_SUPABASE_URL=https://task2-test.supabase.co` exactly as the README
  documents, because the fixture session storage key derives from that host; my
  first run with a different placeholder host failed on a missing Bearer token for
  that reason alone, and passed after rebuilding with the documented value.
- `npm run test:browser` (Task 2 S1–S3 regression) — **pass** (17.7 s).

## Payload inspection (independent)

Beyond the suite, I ran my own script against the real route handler + embedded
Postgres (the tests' fixture harness) and captured actual responses:

- Sender's outgoing item after send — exactly the allowlisted fields and nothing
  else: `{"id":…,"displayName":"Person 2","goalLine":"Find teammates",
  "sharedReason":"Coffee","duration":5,"kind":"board","status":"pending",
  "expiresAt":…}` ("Coffee" is the pair's verbatim shared answer). The recipient's
  inbox item is the mirror image with the same field set.
- After the recipient tapped **Later**, the sender's payload was compared
  programmatically: **byte-identical** to before the Later.
- After the clock passed `expiresAt`, the outgoing list is empty — no status, no
  history entry, no count.
- Goal-fallback pair (no shared answer): `sharedReason` was
  `"Find teammates · Just socialize"` — both goal lines verbatim, duration 10
  honoured.
- After accept, both participants' session payloads carried the meeting point
  `{"id":…,"label":"Point 1","photoUrl":"https://example.org/point1.jpg",
  "direction":"Beside the entrance."}` — deep-equal across the two payloads.
  After both "I'm here" taps: `"state":"started"` with `startedAt` set.
- A regex scan of every captured payload for
  `score|rank|count|percent|compatib|declined|dismissed|rejected|decision|
  recipient_id|answer|contact|hash` (keys and status strings) came back **clean**.

## Explicitly unverified (named gate, unchanged from prior reviews)

All **hosted** Supabase behaviour — real anonymous sign-in/refresh against a live
project, hosted RLS, Prisma transport, two real devices — remains untested because
no hosted project exists yet. The opt-in `tests/hosted.test.mjs` covers it and
**must be run against the configured dev project before the demo**; the <30-second
join also remains verified by construction (two required fields) rather than as a
timed real-network measurement.

## Fix list

None required for merge.

## Non-blocking notes (for later tasks, not this PR)

1. The cool-down check applies after any prior pair request (including one the
   requester cancelled), not only after a lapse. This is a defensible reading of
   §10 (it also prevents cancel-and-retry probing) and the indistinguishability
   test depends on the uniform 409; revisit only if it ever blocks a legitimate
   re-request flow in Task 4 testing.
2. After a pre-start cancel, the neutral "Plans changed" notice is shown to both
   participants, including the canceller. It names no reason and no blame, so it
   complies with §7; flagging only so it is a known behaviour, not a surprise.
3. Code-connect deliberately skips the target-availability precondition (the pair
   has already met; the owner's Start tap is the consent gate). Consistent with
   the brief's code flow and covered by its tests ("works when closed").
