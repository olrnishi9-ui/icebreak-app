# Icebreak

Event invitations and guest entry, optional profiles and questions, and a voluntary
“Open to chat” board. Task 2 stops here: connection requests and conversation cards
are not implemented.

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
only name, goal and at most one verbatim shared option. IDs, raw answers, optional
fuel, sort keys, credentials and internal metrics never leave that operation.
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
| `GET /api/events/:id/open` | Event membership required | Array of **only** `{displayName,goalLine,chip?}`; never a wrapper with metrics or IDs |
| `DELETE /api/events/:id/membership` | Own membership | `{left:true}`; cascades answers and fuel, clears availability with membership deletion |
| `GET /api/events/:id/organiser` | Event creator's verified identity only | `{event:{id,name,status},joinCode,joinUrl}` for refreshing the invitation page |

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
`/api/recommendations`, `/api/connections`, `/api/icebreaker`, and `/api/feedback`
are **not implemented**. No Task 3/4 interaction UI or API is included.

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
