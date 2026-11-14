# Icebreak

Event invitations and guest entry, optional profiles and questions, and a voluntary
“Open to chat” board, consent-based connection requests, meeting points and arrival.
Task 3 ends when the conversation session starts; conversation cards are Task 4.

## Run locally

Node 22+ (24 recommended), a development Supabase project with **Anonymous
sign-ins enabled**, and its PostgreSQL connection URLs are required for the real
multi-user flow.

```sh
npm ci
cp .env.example .env
# Fill in the public Supabase URL/key and server-only database URLs.
npm run db:generate
npm run db:migrate
ALLOW_DEMO_SEED=true npm run db:seed
npm run dev
```

Visit `/organiser` to create an event. Keep that browser's guest session to return
to `/organiser/:id` for its QR/code. Attendees visit `/join/:code` or enter a code
at `/`. The seeded event code is `HELLO26`. The event name stays in the header;
Leave event deletes that caller's membership, answers and optional topics.

The browser uses `@supabase/supabase-js` for anonymous sign-in, automatic refresh,
and persisted SDK sessions. Our code never issues or stores session tokens.
`localStorage` additionally holds only the last **event ID** for a return link.
`sessionStorage` remembers which neutral pre-start cancellation notice this tab has
seen; it contains no recipient decisions or credentials.
The join screen validates the invitation before calling `signInAnonymously()`;
then sends the SDK access token to the join API. The API verifies every bearer
with Supabase `auth.getUser(token)` and binds `users.auth_id` to that verified
subject. It never accepts a caller-supplied user ID. This browser-first SDK step
adapts the brief's “join signs in” operation so the SDK owns credential persistence
end to end; an uncredentialed direct POST to join returns 401.

Refreshing/reopening `/event/:id` fetches saved setup/home state, answers, profile
and availability using that persisted identity. Questions save on each tap;
optional profile edits save on **Save profile**. Unsaved text is not committed.
All questions can be skipped, including the goal questionnaire item; that skip
does not erase the separate required event goal chosen at entry.

## Data and access boundaries

SQL migrations are authoritative for RLS, constraints and Auth foreign keys; do
not use `prisma db push`. The additive Task 2 migration keeps existing data and
adds event-local name, goal, field/fun-fact visibility, setup progress and opening
time to `event_participants`. Optional topic rows retain Task 1's per-row
`share_consent`. Visibility flags round-trip in the field editor. Optional fuel
stays private on this board regardless of its flag (sharing is a later task).
Task 1's auth-keyed, forced RLS remains in force: clients can read only their own
membership/profile/answers/topics/contacts, and cannot mutate those tables.

Prisma is used only in the server route. Its database connection must be a trusted
backend role with the existing privileges to write and to read candidates for
projection (Supabase's server Postgres connection). Every private operation first
resolves event membership from the verified Auth identity. The single server
projection for the board reads event-local candidates, orders them, and returns
a routing participant ID, name, goal and at most one verbatim shared option. Raw
answers, optional fuel, sort keys, credentials and internal metrics never leave it.
No service-role API key is needed. Do not expose `DATABASE_URL` / `DIRECT_URL`.
No realtime subscriptions, background jobs or client mutation grants are added.

Availability uses server time: opening/reopening sets 15 minutes, closing clears
it, and queries exclude expired rows without any client action. S3 polls every
3 seconds and disables changes while disconnected. Its countdown is display only.
The pure list function orders by the required goal, shared non-skipped answers,
opening recency, then injected random tie values. It has a fixed output shape.

### Demo participants

After migrations and seed, a database administrator can explicitly run:

```sh
psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f prisma/demo-open.sql
```

This opens only the six fictional **unbound** seed participants in `HELLO26` for
15 minutes; it never impersonates them or changes Auth bindings. It is an opt-in
admin/demo path, not a public endpoint. Seed remains repeatable and non-destructive.

## API contract

All JSON responses use `Cache-Control: no-store`. Except for the two public GETs
below, authentication is `Authorization: Bearer <Supabase session access token>`.
No cookies/custom session credentials are introduced. Profile/questionnaire
requests explicitly carry `eventId`, preventing implicit cross-event selection.
Errors are `{ "error": "plain message" }`: 400 invalid input, 401 absent/invalid
session, 404 absent event/membership/organiser access, 410 inactive/ended event,
413 oversized form, 503 missing Auth config, 500 unexpected operation failure.

| Method / path | Request | Response |
| --- | --- | --- |
| `POST /api/events` | `{name, endsAt?}`; name 1–120 chars, end a future ISO timestamp | 201 `{event:{id,name,status},joinCode,joinUrl}` |
| `GET /api/events/:id` | Public; `:id` may also be a join code for S1 | `{id,name,status,active}` only; no organiser/participant data |
| `GET /api/events/:code/questions` | Public, active event; invitation question configuration | `Question[]` (below) |
| `POST /api/events/join` | `{code,displayName,goal}`; name 1–80 chars; goal an event-goal option | Own `Profile` (below); repeated join restores existing membership without overwriting it |
| `GET /api/profile?eventId=:id` | Own membership | Own `Profile` |
| `PUT /api/profile` | `{eventId,displayName,goal,field?,funFact?,fieldVisible?,funFactVisible?,topics?}` | Own updated `Profile`; replacement semantics for optional fields (omitted = empty/false) |
| `POST /api/questionnaire` | `{eventId,answers:[{questionId,choice,skipped}],complete?}` | Own updated `Profile`; `complete` defaults true and requires all six items; false autosaves a subset without completing setup |
| `PUT /api/events/:id/availability` | `{open:boolean}` | `{openUntil:ISO timestamp or null}` |
| `GET /api/events/:id/open` | Event membership required | Array of **only** `{participantId,displayName,goalLine,chip?}`; never a wrapper with metrics |
| `DELETE /api/events/:id/membership` | Own membership | `{left:true}`; cascades answers and fuel, clears availability with membership deletion |
| `GET /api/events/:id/organiser` | Event creator's verified identity only | `{event:{id,name,status},joinCode,joinUrl,meetingPoints}` for refreshing the invitation page |

`Question = {id,prompt,kind,options,position}`; five binary preferences and one
multi-option goal. Answer `choice` is a zero-based option index; an explicit skip
is exactly `{questionId,choice:null,skipped:true}`. Submissions validate all items
before a transaction, reject unknown/duplicate IDs and out-of-range choices, and
upsert per participant/question. An all-skipped six-item submission is valid.

`Profile = {event:{id,name,code},displayName,goal,field,funFact,fieldVisible,
funFactVisible,topics,answers,questions,step,openUntil}`. `step` is `setup` or `home`.
`topics` is an array of `{type,topic,visible}`. Type is `interest`, `discuss`, `help`,
`learn`, or `ask_me_about`; topic length 1–200, maximum 22 topic rows total, maximum
two ask-me-about rows, no duplicates. Field length ≤160, fun fact ≤500. Empty
optional fields and no topics are always valid. Display name and goal are required.

The two availability routes are additions to the engineering prompt's API list.
The public question-bank, membership deletion and organiser-invitation GET are
small adaptations supporting S1, one-tap leave and refresh respectively.
`/api/recommendations`, `/api/icebreaker`, and `/api/feedback` are **not implemented**.
Task 3 additions are documented below.

## Verification

```sh
npm test
npm run typecheck
npm run build
# Separately, start a build with placeholder public Supabase configuration for
# the browser-only fixture checks (never deploy these placeholder values):
NEXT_PUBLIC_SUPABASE_URL=https://task2-test.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-test-placeholder npx next build
npm start
npm run test:browser
```

- `npm test`: pure sort tests; real SQL migrations/seed/RLS in PGlite; route
  handler integration tests with a substituted Auth verifier (not hosted Auth).
  Two distinct guest identities exercise availability on/off, payloads and
  event isolation. Expiry advances the injected **server** clock 16 minutes;
  the production TTL remains 15 minutes. QR modules are rasterized and decoded
  independently with `jsqr`.
- `npm run test:browser`: Chromium (`CHROMIUM_PATH`, default `/usr/bin/chromium`),
  production app (`TEST_BROWSER_URL`, default `http://127.0.0.1:3000`), deliberately
  fixture API/Auth responses. Checks S1 loading/error, optional entry/setup,
  save/restore (including tab close and browser restart), S3 empty/list/offline/retry, polling, mobile overflow and QR image.
  Screenshots are ignored under `work/screenshots`. This is not hosted integration.
- Opt-in hosted test: export real public Supabase variables and `TEST_APP_URL`
  pointing at a disposable configured app; `npm test` then runs two real
  anonymous SDK clients through the deployed API, including SDK storage restore.
  It creates anonymous users and an event ending in an hour; it deletes its
  memberships afterwards. Auth users and organiser event remain for admin cleanup.
  Without these variables that test is explicitly skipped.

Runtime dependency additions: the required `@supabase/supabase-js` SDK and the
permitted small `qrcode` encoder. Development additions: its types, `jsqr` for
independent decoding, `playwright-core` for browser checks (uses installed Chromium).
No other runtime dependencies. See [Task 2 validation](docs/Task2-Validation.md)
for executed results, failures and outstanding hosted checks.

## Task 3 — connections API and state

Auth for **every** route below is `Authorization: Bearer <Supabase SDK access token>`.
The API verifies it using `auth.getUser`, then uses the existing `users.auth_id` →
`event_participants(event_id,user_id)` mapping from Tasks 1–2. The brief's custom
session-token/header/hash wording is superseded: no custom token scheme is used.
For GET supply `?eventId=<uuid>`; for mutations supply `eventId` in the JSON body
except the organiser route, where the event ID is in the path. Codes and auth
credentials are never URL parameters. All private responses use `Cache-Control: no-store`.

| Method / path | JSON body beyond eventId | Success |
| --- | --- | --- |
| POST `/api/connections` | `participant`: target ID from board, `duration`: exactly 5 or 10 | Connection state below |
| GET `/api/connections` | — | Connection state; poll every 3 seconds |
| PATCH `/api/connections/:id` | `action`: `accept`, `later` (recipient), or `cancel` (sender) | Connection state |
| POST `/api/connections/code` | `code`: 8-character short code, optional `duration`: 5 or 10 (default 5) | Connection state; owner sees Start / Later |
| POST `/api/sessions/:id/arrive` | — | Connection state; idempotent, both arrivals set startedAt |
| POST `/api/sessions/:id/start` | — | Connection state; caller must have arrived |
| POST `/api/sessions/:id/late` | — | Connection state; partner sees “on their way”; no text input |
| POST `/api/sessions/:id/cancel` | — | Connection state; pre-start only, restores both to open for 15 minutes |
| POST `/api/blocks` | `participant`: target ID, or `requestId`: own request ID | `{ "ok": true }`; symmetric enforcement for event lifetime |
| POST `/api/reports` | `participant`: target ID, or `requestId`: own request ID; optional `category`: nonempty string ≤80 characters | `{ "ok": true }`; report is private, no state change |
| PUT `/api/events/:id/meeting-points` | `meetingPoints`: 1–20 objects `{label, photoUrl, direction}` in configured order | `{ "ok": true }`; organiser only |

`GET /api/connections`, code, session arrive/start/cancel, blocks and reports are
additions beyond the engineering prompt's API list. The late endpoint and organiser
meeting-point configuration are further adaptations supporting the brief. The
organiser invitation GET also returns `meetingPoints: [{id,label,photoUrl,direction}]`.
Task 1 had no configured meeting points, so the organiser configures real venue
landmarks in `/organiser/:id`. Board accept returns neutral unavailability until a
point exists; no venue location or photo is invented. Photo URLs must be HTTPS,
label ≤80 characters, direction ≤240. Configuration is locked while sessions are live, so editing cannot reset live
occupancy. Snapshots remain on past sessions. Seed data is unchanged.

The open-board GET now includes an opaque `participantId` routing field in addition
to name, goal line and optional chip; names are not unique. It conveys no score or
private profile data. Block/report are one-tap actions beside an attendee and in an incoming request.
The request-ID alternative is an adaptation that resolves the other party on the
server, keeping participant IDs out of connection payloads. Blocking privately
dismisses the blocker’s inbox entries with Later’s unchanged-expiry rule. Their
presence and board visibility never depend on a block or a private Later decision.

Connection state (fixed projections, never raw Prisma/SQL rows):

```ts
{
  shortCode: string; // caller's own, shown on S3 only
  incoming: Connection[];
  outgoing: Connection[]; // pending or accepted live request; no expired history
  session: null | {
    id: string;
    partner: {displayName: string; goalLine: string};
    duration: 5 | 10;
    sharedReason: string;
    meetingPoint: null | {id: string; label: string; photoUrl: string; direction: string};
    state: 'meeting' | 'started';
    startedAt: string | null;
    arrived: boolean;
    partnerArrived: boolean;
    partnerOnTheirWay: boolean;
  };
  notice: null | {id: string; message: "Plans changed. You’re open to chat again."};
}
// Connection = {id, displayName, goalLine, sharedReason, duration, kind,
//               status, expiresAt}; kind = 'board' | 'code'; ISO timestamps.
```

Routing request/session IDs and request kind are the only additions to the brief's
content allowlist. Outgoing status is computed as accepted, otherwise pending
before original expiry, otherwise expired. At expiry the state endpoint omits it,
so S4 silently returns to S3, without a history entry or outcome banner. A private
Later removes only the recipient's inbox entry; it cannot shorten expiry, free the
incoming-cap slot, change board visibility, release pair cooldown or change sender
retry/cancel behavior. Code prompts follow precisely the same rule and TTL.
The server stores a single grounded reason at send time (verbatim shared option,
otherwise `You're both here to <goal>` or `<sender goal> · <recipient goal>`).
No free-text request/message field exists. Mutual opposite board requests accept
the original request and its duration; no duplicate row is created.

A code connect permits a closed-board target (the pair is already together), but
still checks active event, membership, block, active session/mute, pending cap,
rate and cooldown. It requires the code owner's Start tap. That creates a started
session with `meetingPoint: null`, meaning already together; no arrival step.
Neither GPS nor any proximity signal is collected. A board session stores the
least-busy point with configured-order ties once, in an event-locked transaction;
both payloads return that exact snapshot. Arrival/start stop at `started`.
Running late is a boolean hold for the active pre-start session. The point remains
held until pre-start cancel or Task 4 closes the session. There is no timer/cron.
A live session mutes incoming prompts and prevents re-opening availability or
leaving the event; pre-start users can cancel first. Task 4 owns started-session exit.

Constants in `lib/connection-policy.ts`: TTL 15 minutes, pending incoming cap 3,
re-request cooldown 30 minutes **after original expiry**, rolling send cap 20 per
participant per event per hour. Private Later entries still consume cap until
expiry. All unavailability causes use exactly HTTP 409
`{"error":"Not available right now."}`. Wrong/cross-event codes give HTTP 404
`{"error":"Code not found. Check it and try again."}` and create no row. Invalid
inputs give 400; unauthenticated 401; nonmembership/wrong-party IDs 404; ended event
410. A cancelled request is withdrawn from both views and retains pair cooldown.

The additive migration revokes browser reads of raw requests and private decisions.
Authenticated DB clients may call `own_connections(event_uuid)` for their safe
projection, which computes expiry using database time and respects event activity.
Sessions use forced RLS for only their two participants; blocks/reports have no
participant SELECT or mutation grants. The server connection remains trusted as
in Task 2. An event row lock serializes all connection/availability/leave mutations
and point assignment; a DB trigger separately forbids overlapping pending rows for
an unordered pair, in either direction.

Additional verification:

```sh
# After building/starting with the public fixture configuration above:
npm run test:connections:browser
```

`tests/connections.test.mjs` exercises HTTP handlers plus real PostgreSQL SQL/RLS in
PGlite, including matched-clock board/code indistinguishability, concurrency and
arrival. `tests/connections.browser.mjs` renders the production UI in two independent
Chromium contexts and routes API calls through those same real handlers and PGlite.
Only identity verification and persisted SDK credentials are fixtures; connection
responses come from the database. It compares actual S4/S3 content for Later,
unseen and opened/no-action at before/at/after expiry, checks refresh restoration,
photo/direction equality, arrival, request retry, offline recovery and cancellation.
These are **not** hosted Supabase Auth or two-real-phone tests. Executed results
and environment limitations are recorded in `docs/Task3-Validation.md`.

## Task 4: conversation arc, private closing and My People

The script is built **once at session creation** in the shared accept function
(board accept, mutual send and code-owner Start). `buildArc` is pure: question
position ascending (then id) defines lightest material; shared answers precede
true differences; seek/offer topics precede goals; consented ask-me-about fields
precede unused material. All field text is verbatim. Without shared/differing
answers the script is exactly prep, expand, close, with a short-arc notice.
Profile edits never rewrite a live script. No LLM or neural-network phase is
implemented; no AI service or key is needed.

Authentication for every route below is the existing Supabase Anonymous Auth
Bearer session. Every request must specify `eventId` (query for GET/DELETE;
JSON for writes); membership, event and pair ownership are checked server-side.
Errors use `{error:string}` and 400/401/404/409; no private decisions appear in
errors. Notes are capped at 500 characters. Responses use explicit allowlists.

| Method / path | Input | Response / behavior |
| --- | --- | --- |
| GET `/api/connections?eventId=…` | Existing contract | `session` now includes `arc: ArcView` from S5 onward and state `meeting`, `started`, or `closing`. A closed conversation stays restorable; the client can privately dismiss it back to the paused room. |
| GET `/api/sessions/:id/arc?eventId=…` | — | `ArcView`, below. This is the deterministic session-script adaptation of the engineering prompt's `POST /api/icebreaker`, rather than generating a new starter per request. |
| POST `/api/sessions/:id/arc` | `{eventId,action,position?,choice?,optedIn?}` | Updated `ArcView`. Enum actions: `advance`, `skip`, `wrap-up`, `keep-talking`, `done`. Advance/skip require the displayed integer `position`; stale positions are no-ops, so racing taps advance once. Done accepts `choice: exchange / again / nothing / null` and boolean `optedIn`; the first Done is immutable. Choosing nothing is complete. |
| PUT `/api/sessions/:id/note` | `{eventId,text}` | `{ok:true}`; creates/edits the author's note only. Empty text deletes. |
| DELETE `/api/sessions/:id/note?eventId=…` | — | `{ok:true}`; deletes only the author's note. |
| GET `/api/people?eventId=…` | — | Private entries `{id,displayName,eventName,note,exchanged,contacts:[{field,value}]}` for completed sessions. No metrics. |
| POST `/api/feedback` | `{eventId,sessionId,conversation_ease?,perceived_value?,willingness_to_reconnect?}` | `{ok:true}`; implements the engineering prompt's feedback endpoint, tied to the session's interaction row + author. Optional ease/value integers 1–5, optional reconnect boolean; absent/null fields stay null. All absent writes no row. First submission wins; no feedback values or existence are returned. |

`ArcView` contains `{script,position,skipped,cardsState,role,side,offered,elapsed,
phase,own,outcome,contacts,note}`. `script` is `{cards,notice,disclosure}`; cards
contain fixed framing and verbatim facts (ask-me-about has `aboutA`/`aboutB`
and, for one-sided material, an unused verbatim `fallback`).
`role` is starter/listener/symmetric; `side` is the viewer's stored A/B role,
never a closing actor. `cardsState` is upcoming/current/skipped/done. `own` is
only the viewer's `{choice,optedIn,done}`. `outcome` is null, mutual `again`, or
mutual `exchange`. Contact fields appear only after **both Done, both exchange,
both opt-ins**, and only owner-consented fields marked `mutual_connection`.
There is no partner-choice, partner-Done, mismatch, feedback or rejection field.

Polling is every three seconds. Offers occur proportionally at 25/55/80 of the
chosen time box, never advance the card, and signal visually plus vibration where
supported. A positional compare-and-set under the event transaction lock handles
racing actions. The client queues actions while disconnected and renders all
remaining cards from its downloaded script; reconnect reconciles shared state.
Private choices, notes and feedback require connectivity to save. No offline
contact release is attempted.

Wrap-up and scheduled closing use one projection and one S7 component. Closing
normalizes the exposed position, skipped states and elapsed time; no closing
actor is stored. The data-only reason and resume position have no browser SELECT
privileges (even `SELECT * FROM sessions` is deliberately denied). The two
members can select permitted session/script columns under RLS. Notes and choices
are author-only; feedback SELECT has no participant policy; contact table reads
remain owner-only. Browser table writes are not granted: validated server routes
perform mutations. Close releases point occupancy, pauses both participants and
records pair history; reopening visibility requires an explicit availability tap.
Keep talking restores the prior card unless either participant has finalized Done
or either is already in another live session.

Validation and honest environment limitations: `docs/Task4-Validation.md`.
