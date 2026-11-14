# Codex Task 2 Brief — Join, Profile, Questionnaire, Availability, Open-Now List

*Status: DRAFT, dispatch-ready. Assumes Task 1 (Next.js + TypeScript + Tailwind
scaffold, Prisma schema + SQL migrations with RLS, seed: one demo event, 6 demo
participants, 5 preference questions + 1 goal question, placeholder home page,
`.env.example`) is complete as specified. Follow `AGENTS.md` in the repo root;
it is binding. This brief covers engineering phases 3–4 (frontend/backend +
database and access controls) for the entry half of the product.*

---

## Objective

Build the complete entry flow of the event product, end to end, for real
multi-user state:

1. An organiser can create an event and receives a join code and a QR code.
2. An attendee joins that event as a **guest** (no account, no password) via
   Supabase Anonymous Auth, in under 30 seconds, providing only a display name
   and an event goal. The authenticated user's id keys their participant row
   and all row-level security.
3. The attendee completes a **progressive profile** (optional fields addable at
   any later time) and submits the questionnaire (5 preference questions +
   1 goal question, every item skippable).
4. The attendee can toggle **availability** ("Open to chat"), which auto-expires
   after ~15 minutes.
5. Every participant sees the **open-now list** for their event: currently-open
   participants, sorted by shared goal, then shared answers, with **no scores,
   counts, or rankings shown or sent**.

Screens delivered: S1 (Join Event), S2 (Quick Setup), S3 (Event Home / Open
Now) per the screen spec. API routes and RLS enforcement included. Connection
requests are NOT part of this task (Task 3).

---

## Context

Read these sections before writing code; they are the spec for this task.

**Master-Evaluation-MVP-Design.md**
- §0 verdicts 2 and 5 — Option B (voluntary availability + mutual consent) is
  the primary experience; no accounts, guest event-scoped sessions, join target
  under 30 seconds.
- §4, Step 1 (Join) — guest sessions: event-scoped Supabase anonymous-auth
  session in the browser, no email, no password; display name required,
  everything else optional; the QR belongs to the organiser; user short codes
  are a different (later) mechanism.
- §4, Step 2 (Five questions) — five preference questions plus ONE event-goal
  question; the goal outranks preferences for sorting; every question gets a
  skip; answers supply conversation material, never a compatibility claim.
- §4, Step 3 (Discover/Connect) — Option B decision; Option C survives only as
  an invisible sort order on the availability list, labelled honestly as
  "people who are open to chat," never "matches for you."
- §6, Must Have table — event room via QR + short event code; guest join <30s;
  5 preference taps + 1 goal question, all skippable; availability toggle
  (open now, 15-min auto-expiry); open-now list sorted by shared goal then
  shared answers, no scores.
- §7, screens S1, S2, S3 — full screen specs (objective, info, components,
  primary/secondary actions, loading, empty, error states, accessibility).
  Build exactly these three screens in this task; S3's "pending requests"
  element is stubbed/hidden until Task 3.
- §8, Technical architecture — stack (Next.js App Router + TypeScript,
  Tailwind, Prisma, Supabase Postgres, Vercel); 3-second polling, no
  websockets; data model rows `Event`, `Participant` (keyed by the Supabase
  Auth user id), `Answer`, `Availability(participantId, openUntil,
  mutedUntil?)`; access rules (every query scoped by event + the caller's
  authenticated user id (`auth.uid()`); a participant reads the open-now
  list — name, goal, one shared chip — their own data, and nothing else
  private); flows (Join = validate code → anonymous sign-in + create
  Participant → answers → home; availability expiry is a query-time
  computation, not a cron job); testing strategy items (2) refresh/close/
  reopen restores state from the persisted session, (3) payload inspection
  for unshared fields, (4) empty-room and single-user cases.
- §9, Matching and conversation logic — the list sort (never displayed as a
  score): 1) same event goal; 2) count of shared non-skipped answers (ordering
  and the one chip only — the count itself is never sent to the client);
  3) most recently opened. Ties: random. Deterministic and auditable.
- §10, Edge cases — wrong event joined (persistent event name in header;
  one-tap leave that deletes the participant row); duplicate display names
  (identity is the participant's auth user id; lists disambiguate with the
  goal line, never IDs); incomplete profile is valid (goal-only users can be
  listed); event with one participant (S3 empty state); cross-event access
  attempt (a participant from event A returns nothing in event B — tested);
  browser closed / page refresh (state restores from the persisted session).

**Critical-Evaluation-v2-and-Engineering-Review.md**
- Part A §4 (Redesign: Registration) and Part A §5 user flow steps 1–4 —
  progressive registration: name + goal to enter (<30 s); interests, fun fact,
  topics I can help with / want to learn, "ask me about" optional, addable now
  or later, none required; attendee answers 5 short preference questions, each
  skippable; "Open to chat" toggle auto-expires in ~15 minutes; home list shows
  name, goal line, at most one true shared-answer chip; no scores, no counts.
- B1 — organiser interface (create event, QR code, aggregate non-identifying
  statistics, end/archive event) is Must-Have for the product. This task
  delivers the create + QR/code half; the aggregate-stats view and end-event
  flow are a later task (see Scope out).
- B2.4 — declining a *recommendation* is a private list-management action;
  nothing in this task's list or API may expose one participant's actions or
  state changes to another. (Connection-request decline itself is Task 3.)
- B2.5 — registration ruling: the fields stay, the gate goes. Name + goal =
  entry; everything else progressive and optional, prompted contextually
  later. Privacy/sharing controls move to a per-field visibility model —
  profile fields carry visibility flags from the Task 1 schema; do not build
  a separate settings surface in this task.
- B2.6 — accounts ruling: anonymous user rows created at join; no passwords
  in the MVP. The ruling's original session mechanism (a custom
  per-participant token, with Supabase Auth not wired up) is superseded by
  the Task 1 review — see the session-model note below.
- B4 — construction sequence: Phases 3–4 = frontend/backend + database/RLS
  with progressive registration. That is exactly this task.

**Session model (settled by Task 1 review)** — Task 1 as delivered (PR #1,
verdict MERGE) keys all row-level security to Supabase Auth: RLS policies
resolve the caller through `auth.uid()` → `users.auth_id`, and its setup
README prescribes **Supabase Anonymous Auth** for guests (signed-in anonymous
users, `authenticated` role), explicitly warning against a shared `anon`
identity. Per the coordination note in `Codex-Task1-Review.md`, adopted by
the supervisor: **this task uses Supabase Anonymous Auth as the guest session
model.** Joining signs the attendee in anonymously; the authenticated user's
id keys `event_participants` and every RLS policy. The earlier draft's custom
session-token / token-hash design is dropped entirely — no token is issued,
hashed, stored, or sent by our own code. B2.6's no-passwords ruling stands;
only its session mechanism is superseded.

**Engineering prompt (Codex_engineers.docx, via supervisor) — API list to adapt**
`POST /api/events`, `POST /api/events/join`, `GET /api/events/:id`,
`GET /api/profile`, `PUT /api/profile`, `POST /api/questionnaire`,
`GET /api/recommendations`, `POST /api/connections`,
`PATCH /api/connections/:id`, `POST /api/icebreaker`, `POST /api/feedback`.
This task implements the subset under Scope in and adds two availability
routes the prompt's list does not name; document every adaptation in the
README API contract.

---

## Scope in

**Organiser — event creation**
- `POST /api/events` — create an event (name; optional endsAt, meeting points
  may remain seed/config data). Returns the event, its short join code, and
  the join URL.
- Organiser event page (minimal): shows event name, join code, join URL, and a
  rendered **QR code** encoding the join URL. (A single small QR library is
  permitted; note it in the PR. No other new dependencies without flagging.)
- `GET /api/events/:id` — event basics needed by S1 (name, status) for a
  joiner arriving via link/QR. Must not expose organiser-only or participant
  data.

**Guest join + session (S1)**
- Join route/page: `/join/[code]` (from QR/link) plus manual code entry on the
  home page ("join with code instead" per S1).
- `POST /api/events/join` — body: event code, display name, goal. Validates
  the code and that the event is active; signs the attendee in with Supabase
  Anonymous Auth and creates the `Participant` row keyed by the authenticated
  user's id, which also keys all RLS. No custom session token is issued or
  stored; the Supabase client persists its own session client-side.
- Invalid code → S1 error state (plain message + retry), no participant row
  created.
- Session restore: on load, the persisted Supabase session re-fetches the
  caller's own state (participant, profile, answers, availability) and
  returns them to the exact step they were on. Refresh/close/reopen must not
  lose state.
- Leave event: one tap; deletes the participant row (and their answers /
  availability) per §10.

**Progressive profile (S2, part 1)**
- `GET /api/profile` — the caller's own full profile (scoped to the caller's
  authenticated session).
- `PUT /api/profile` — update display name, optional one-line field/major,
  goal, and the optional fuel fields: interests, fun fact, topics I can help
  with, topics I want to learn about, ask-me-about (max 2, self-authored).
  All optional fields addable/editable **after** join, at any time, from S2/S3
  profile access. Per-field visibility flags from the Task 1 schema are
  honoured and round-tripped; no settings UI beyond the field editors.
- Validation: display name and goal are the only required fields, enforced
  server-side; everything else may be empty forever.

**Questionnaire (S2, part 2)**
- `POST /api/questionnaire` — submit answers for the 5 preference questions +
  the goal question for this participant + event. Every item accepts an
  explicit `skipped` value; an all-skipped submission is valid and succeeds.
  Re-submission updates prior answers (idempotent per participant + question).
- S2 presents questions as large two-option taps with a visible skip per
  question and a skip-all path; reaching S3 requires only name + goal.

**Availability + open-now list (S3)**
- `PUT /api/events/:id/availability` — body: open (boolean). Opening sets
  `openUntil = now + 15 minutes`; closing clears it. Re-opening extends.
  Expiry is computed at query time (no cron, no background job).
- `GET /api/events/:id/open` — the open-now list for the caller, refreshed by
  **3-second polling**. Returns only participants in the caller's event whose
  `openUntil` is in the future, excluding the caller. Each entry contains
  exactly: display name, goal line, and **at most one** shared-answer chip
  (the verbatim option text of one question both answered identically and
  neither skipped). Ordering, computed server-side per §9: same goal as caller
  first; then more shared non-skipped answers; then most recently opened;
  ties random. The shared-answer count, the sort keys, and any score must
  never appear in the payload.
- S3 per §7: own availability toggle + expiry shown in text (not only a ring);
  skeleton loading state; the designed empty state ("Nobody's open right now —
  you can be the first") with the code option visible; connection-lost banner
  with auto-retry, list read-only offline; caption stating the list order is
  not a ranking; event name persistently in the header.
- Seed/demo compatibility: the Task 1 seeded demo event and participants must
  still work — seeded participants can be toggled open in a test/demo path so
  the list is demonstrable with one real user.

**Access control / RLS**
- Every API query scoped by `eventId` + the caller's authenticated user id;
  RLS keys on `auth.uid()` (Task 1's auth-keyed policies are the base).
- RLS policies (extending Task 1 migrations if needed) so that, at the
  database level as well as the API level: a participant can read their own
  participant/answer/profile rows; the open-now list is served only through
  the scoped API projection above (never a raw participants table read);
  nobody can read another participant's answers, contact details, internal
  scores, or feedback.
- All API inputs validated server-side (types, lengths, enum membership,
  event-active check).

**Docs**
- README: final API contract for every route implemented or adapted in this
  task (method, path, auth = Supabase session bearer token, request/response
  shapes),
  explicitly noting the two availability routes as adaptations of the
  engineering prompt's list, and that `/api/recommendations`,
  `/api/connections`, `/api/icebreaker`, `/api/feedback` are not yet
  implemented.

---

## Scope out

- Connection requests: send / accept / decline / expiry, the S4 waiting
  screen, simultaneous-request handling — **Task 3**. (S3 shows no request
  UI in this task beyond a disabled/hidden placeholder.)
- Short-code direct connect between two participants (Option A fallback) —
  Task 3, with requests.
- Sessions, meeting-point assignment, S5 Meet, the four-card arc (S6),
  closing (S7), contact exchange, remembered-fact notes (S8) — Task 4+.
- `GET /api/recommendations` as a user-facing suggestions surface, LLM
  explanations, any LLM call of any kind — later phases, under AGENTS.md
  law 4. The deterministic sort in this task is a list ordering, never
  presented as recommendations or matches.
- The neural network, feature pipeline, experiment runner — later phases,
  gated per AGENTS.md ML rules. No ML code in this task.
- Organiser aggregate-stats view and end/archive-event flow — later task
  (Must-Have for the product per ruling B1; not required to demo this task).
- `POST /api/feedback` — later task.
- Passwords, email, or any account system beyond Supabase Anonymous Auth
  guest sessions (ruling B2.6, as amended by the session-model note).
- Websockets / Supabase Realtime — polling only (AGENTS.md stack rule).
- Native apps, push notifications, offline session scripts (later phases).

---

## Constraints

The following are quoted verbatim from `AGENTS.md` and are binding on this
task. Violating one fails review.

> 1. **Never display** compatibility scores, percentages, rankings, vote/match counts,
>    or popularity metrics anywhere in UI or API responses to clients.
>    `recommendations.score_internal` must never leave the server.

> 2. **Rejection is never visible.** A declined or ignored connection request must be
>    indistinguishable from an expired one for the requester — same UI, same timing,
>    no status they can read. There is no "declined" state exposed to senders.
>    *(No requests exist yet in this task; this law binds the API design now: no
>    per-participant action or state may be exposed to another participant.)*

> 3. **Grounded content only.** Conversation cards/prompts may use only structured,
>    consented data, presented verbatim. Never fabricate a shared interest, never
>    paraphrase a user's profile into an inference ("seems introverted" is banned —
>    no code path may generate evaluations of a person).
>    *(In this task: the shared-answer chip is the verbatim option text from the
>    question bank, derived only from both participants' actual answers.)*

> 5. **Progressive registration.** Joining requires display name + event goal only
>    (target <30 seconds). All other profile fields (interests, fun fact, help/learn
>    topics, ask-me-about) are optional and addable later. Users are anonymous/guest
>    rows — no passwords in the MVP.

> 6. **Event-scoped, expiring data.** Every query is scoped by event + the caller's
>    session token. A participant can never read another participant's private
>    answers, contact details, internal scores, or feedback — enforce with RLS and
>    prove it with a test. Contact details live in a separate table with per-field
>    visibility/consent flags and are released only on double opt-in.

> 7. **Face-to-face first.** No in-app chat/messaging. The app structures a real
>    conversation and then gets out of the way (phones face-down between cards).

Stack rules from `AGENTS.md`, verbatim:

> Polling (3s) instead of websockets unless a task brief says otherwise. Keep dependencies minimal.

> Deterministic recommendation baseline first (goal match → shared answers →
> seek/offer complementarity), implemented as an explainable, unit-tested pure
> function. It is the shipping ranker.
> *(This task implements the first two keys — goal match, then shared answers —
> as the list sort, as a pure unit-tested function. Complementarity arrives
> with the recommendation phase.)*

> Popularity/request counts must never be ranking features.

Engineering rules from `AGENTS.md`, verbatim:

> - Validate all API inputs; document the final API contract in the README.
> - Secrets only via environment variables (`.env.example` documents them); never
>   commit secrets, never store API keys in the database.
> - **Testing honesty (owner's rule):** run the tests/build you claim; report actual
>   results including failures and unresolved bugs. Never write "tests pass" for
>   tests that were not executed.
> - Every task report must state: files changed, key decisions, what was run and its
>   real result, what failed or is unfinished.
> - Do not delete or modify the two evaluation documents or this file unless a task
>   brief explicitly says so.

> Work in small, reviewable pull requests — never rewrite the whole repo in one change.

Task-specific constraints:
- Sessions are Supabase Anonymous Auth sessions, managed end to end by the
  Supabase client; do not design or build any custom token scheme. The
  participant row and all RLS key off the authenticated user's id.
- Availability expiry is a query-time computation against `openUntil`
  (Master §8); no cron jobs, scheduled functions, or client-side-only expiry
  (the client countdown is display only — the server decides).
- The open-now list response is a fixed projection. If a field is not listed
  under Scope in for that endpoint, it does not ship.
- Copy honesty: the list is labelled "open to chat" (or equivalent); the words
  "match", "recommended for you", or any percentage/count phrasing are banned
  in UI copy for this task.

---

## Acceptance criteria

All criteria are testable; run them and report actual results (AGENTS.md
testing-honesty rule).

**Event creation + QR join**
1. Creating an event via `POST /api/events` returns a unique short join code
   and join URL; the organiser page renders a QR code that decodes to that
   join URL (verify by decoding, not by eyeballing).
2. Opening the join URL pre-fills the event on S1 with the correct event name;
   entering a wrong code shows the S1 error state and creates no participant.

**Guest session**
3. Join with code + display name + goal succeeds and creates a Supabase
   anonymous-auth session; inspect the participant row: it is keyed by the
   authenticated user's id (`auth.uid()` / `users.auth_id`), and no
   token-hash value is stored or consulted anywhere.
4. The full required-field path (code → name → goal → S3, skipping all
   questions) is completable with no other input; optional fields are never
   demanded at any step.
5. Refresh, tab close/reopen, and browser restart with the persisted
   Supabase session each restore the participant's exact state (profile,
   answers, availability).
6. Leave-event deletes the participant and their answers/availability; the
   same session afterwards returns no data.

**Profile + questionnaire**
7. `PUT /api/profile` after join adds interests, fun fact, help topic, learn
   topic, and ask-me-about; `GET /api/profile` returns them; a second
   participant's session cannot read them (see criterion 11).
8. `POST /api/questionnaire` with a mix of answers and skips persists exactly
   what was submitted (skips stored as skipped, not as a default option);
   all-skipped submission succeeds; re-submission updates in place.
9. Server-side validation rejects: missing display name, missing goal,
   unknown question IDs, and choices outside the question's options — each
   with a clean 4xx, no partial writes.

**Availability + open-now list**
10. **Two-session test (required):** two independent sessions (separate
    browser contexts or two anonymous-auth clients) join the same seeded/new
    event.
    Session A toggles open → A appears in session B's `GET /open` response
    within one poll cycle. A toggles off → A disappears from B's next poll.
    Let A's availability lapse (a shortened test TTL is acceptable if
    configurable; state what was used) → A disappears from B's list with no
    action by A. B never appears in B's own list.
11. **Sort test:** with seeded participants arranged so that (i) one shares
    the caller's goal and no answers, (ii) one shares no goal and two answers,
    (iii) one shares the goal and one answer — the returned order is
    (iii)/(i) goal group before (ii), and within the goal group (iii) before
    (i). The sort is a pure function with unit tests covering: goal priority,
    shared-answer ordering, most-recently-opened ordering, self-exclusion,
    expired exclusion.
12. **Payload inspection (required):** automated test asserts the
    `GET /open` response for a pair with known data contains ONLY display
    name, goal line, and ≤1 chip per entry — and contains none of: the other
    participant's raw answers or answer IDs, contact details, fun fact,
    help/learn topics, ask-me-about, session credentials, internal IDs beyond
    what the UI needs, or any key matching score/rank/count/percent/compatib*.
    Also assert no participant-facing count of open users appears anywhere
    in the S3 UI or payloads.

**RLS / access control**
13. Using participant A's authenticated session at the data layer, direct
    reads of participant B's answers, profile fuel fields, and contact rows
    return zero rows or are denied — for every table touched by this task.
    A's own rows read fine.
14. Cross-event: a participant session from event A used against event B's
    profile/open/availability endpoints returns nothing (404/empty), never
    B's data.
15. An unauthenticated request (no session) to profile, questionnaire,
    availability, and open endpoints is rejected.

**Build + states**
16. S1, S2, S3 each render their §7 loading, empty, and error states
    (S3 empty state and connection-lost banner included); production build
    completes; the test suite you added actually runs and its real output is
    pasted into the PR report.

---

## Deliverables

One pull request (small and reviewable; split into two only if the diff
becomes unreviewable, and say so) containing:

- Screens S1 (Join), S2 (Quick Setup incl. profile + questionnaire), S3
  (Event Home / Open Now), plus the minimal organiser event page with QR.
- API routes: `POST /api/events`, `GET /api/events/:id`,
  `POST /api/events/join`, `GET /api/profile`, `PUT /api/profile`,
  `POST /api/questionnaire`, `PUT /api/events/:id/availability`,
  `GET /api/events/:id/open`.
- Any schema/RLS migrations this task required beyond Task 1, as new
  migration files (never edits to already-applied migrations).
- Tests: unit tests for the list-sort pure function; integration tests for
  join/session-restore, questionnaire persistence, the two-session
  availability flow, payload inspection, and the RLS checks (criteria 10–15).
- README updated with the final API contract for this task's routes and the
  adaptation notes from Context.
- PR description as the task report: files changed, key decisions, what was
  run and its real result, what failed or is unfinished (AGENTS.md format).

---

## Prohibitions

- Do NOT implement connection requests, accept/decline, sessions, meeting
  points, conversation cards, contact exchange, or notes — Tasks 3–4.
- Do NOT add any LLM call, AI-generated text, or "AI matching" claim anywhere
  (AGENTS.md law 4 governs later phases only).
- Do NOT expose, compute for display, or log to the client any compatibility
  score, shared-answer count, ranking position, or popularity metric — the
  sort keys stay server-side.
- Do NOT use the words "match" / "matches for you" / "recommended for you" in
  UI copy, route names, or response fields for the open-now list.
- Do NOT add passwords, email collection, or sign-up/login account flows.
  Guest access is Supabase Anonymous Auth only (see Context, session-model
  note); do NOT build a custom session-token scheme.
- Do NOT add websockets, Supabase Realtime subscriptions, cron jobs, or
  scheduled functions (polling + query-time expiry only).
- Do NOT put session credentials (Supabase access/refresh tokens) in URLs
  (the join code in the QR URL is the event code, never a credential), and
  do not persist credentials anywhere other than the Supabase client's own
  session storage.
- Do NOT return raw `Participant` / `Answer` rows from any list endpoint —
  fixed projections only.
- Do NOT modify `Master-Evaluation-MVP-Design.md`,
  `Critical-Evaluation-v2-and-Engineering-Review.md`, or `AGENTS.md`, and do
  not delete or re-seed Task 1's seed data destructively.
- Do NOT claim any test passed that was not executed in the PR's environment;
  report failures and unfinished items explicitly.
