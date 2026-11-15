# Task 5B validation — MeetMates

Part B only, based on merged Task 5A (`f95613b`). Branding, repository, package,
identity, QR consent and deployment names remain unchanged. The governing brief
is `docs/Codex-Task5-Brief-v2.md` with the owner's Task 5B overrides.

## What changed

- Discover: For You / All Attendees / Saved; avatar-led public profiles, exact
  field evidence, suggested topics, private bookmarks and name/org search.
  Checked-in, available, unblocked, non-busy candidates feed For You. Comparison
  keys never leave the server: unmet, goal, seek/offer, shared answers, opened
  time, stable identifier. Directory/Saved keep unavailable people browsable.
- Requests: Received / Sent / Matches / Saved. Later is invisible; withdrawal is
  explicit. Sent retains pending, accepted, and expired/closed history. Closing
  an accepted introduction changes Sent to closed, preserving Matches history.
- Matched Profile: full public profile, exact mutual-value fields, topics,
  confirmation/start time, meeting-point snapshot and the existing prep card.
  Existing arc structure, starter/listener roles, optional cards, contact double
  opt-in, private remembered facts and offline arc behavior remain intact.
  Display categories map to Icebreaker / Shared interest / Professional insight /
  Complementary value / Next step without generating new facts.
- Five-minute new invitations; a calm timer that never closes the session.
  Extend +5 opens in the final minute; proposer plus partner must consent, under
  the event transaction lock, up to 20 minutes. Later writes nothing, does not
  alter the proposer's response, and expires just like an unanswered proposal.
  Closing/cancelling does not reopen availability. Save and Follow Up bookmarks
  the person; Meet Someone New leads through optional feedback to Discover.
- Optional feedback reason chips and a separate write-only private feedback
  note. Existing nullable training labels and one-write behavior are preserved.
- Organiser station CRUD; a maximum-ten shortlist using exact profile/tag
  intersections, one evidence line each and private attendee dismissals.
- Home polls for one newly checked-in available person with exact shared or
  complementary evidence. Persisted dismissals prevent repeated suggestions.
  No count, score, numerical rank, reputation feature, LLM or booking claim.

Sparse profiles never cause invented affinity: if there is no shared field,
the card quotes the available seek/offer fields or explicitly attributes the
person's real goal. Suggested topics are drawn verbatim from those public
fields. Such a fallback cannot clear the arrival-notification evidence bar.

## Schema audit

Only **new migration `202611150006_discovery`** changes SQL. All earlier
migrations remain byte-for-byte unchanged.

| Object | Change and access boundary |
| --- | --- |
| `saved_people` | Composite event/owner/person primary key, same-event membership FKs, no self-save, cascade on membership removal. SELECT policy returns only the caller's bookmarks; browser writes revoked. |
| `stations` | Event FK; bounded name/description/location; tags required; event/id uniqueness supports dismissal FK. Event members can read station definitions; CRUD is organiser-checked in the API. Browser writes revoked. |
| `station_dismissals` | Composite event/owner/station key; event membership and same-event station FKs; only caller's dismissals readable. Browser writes revoked. |
| `discovery_dismissals` | Composite event/owner/person key and same-event membership FKs; only caller's dismissals readable. Browser writes revoked. |
| `session_extensions` | Session/base-duration primary key, session/proposer FKs, boolean consents. No browser SELECT policy or privilege, and no browser write privilege. Only the trusted two-member session API operates it. |
| `sessions` | Duration CHECK expands to 5/10/15/20, preserving legacy rows. New invitations accept only five. No existing timestamps, arc scripts or contacts rewritten. |
| `feedback` | Adds `reasons text[]` constrained to the four chips and `private_note varchar(500)`. Existing labels unchanged. Authenticated SELECT has no policy, so even the author sees no rows; all browser writes revoked. The API returns only `{ok:true}`. |
| `app_private.request_projection` | Replaced in the new migration to keep private Sent history. Recipient decisions remain absent; pending persists until the original expiration, regardless of Later. The existing function privileges and safe `own_connections` wrapper remain. |
| Prisma | Models mirror all new tables, composite FKs, relationships and defaults; checks/RLS remain migration-managed as before. |

Role-switched PostgreSQL tests prove all five new tables have ENABLE + FORCE RLS;
private saved/dismissal rows do not cross users, an outsider cannot read stations,
browser mutations fail, and extension votes cannot be selected. HTTP tests prove
membership/auth/organiser/session boundaries and recursively inspect response
keys for banned metrics or private feedback. Existing request rejection,
contact-consent and arc-closing indistinguishability tests still run.

## Executed verification

- `npm test`: **61 passed / 0 failed / 1 skipped (62 tests)**. Baseline was
  49 / 0 / 1; twelve new passing tests cover deterministic projections,
  discovery, bookmarks, station CRUD/dismissals/limit, notifications, five-minute
  defaults, matched-profile access, extension consent/windows/cap, feedback,
  RLS, event scope and payload inspection. The hosted test remains skipped
  without its explicit disposable deployment configuration.
- `npm run typecheck`: passed, exit 0.
- Production compile: `npm run build` passed, exit 0, with
  `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true`,
  `PRISMA_QUERY_ENGINE_LIBRARY=/bin/true`, `PRISMA_GENERATE_NO_ENGINE=1`, and
  fixture public Supabase configuration. This generates an **engine-free**
  Prisma client and compiles/prerenders Next; it does not exercise Prisma's
  database engine. The `/bin/true` paths only bypass engine downloads during
  compile verification; they are not production configuration or committed.
- `TEST_BROWSER_URL=http://localhost:3001 node --import tsx --test tests/discovery.browser.mjs`:
  **1 passed / 0 failed**, real production-rendered UI → application HTTP
  handler → all-migrations PGlite, two account contexts plus organiser flows.
  Covers saving/search/request/Later/withdrawal, matched profile/prep, mutually
  extending through 20, closing/feedback, paused availability, Matches history,
  Home suggestions/dismissals, organiser create/edit/delete, and empty states.
- **30 screenshots**, each verified as **390×844**, with no horizontal overflow
  and all visible app button targets at least 48×48. Gallery:
  [screenshots/task5b](screenshots/task5b/README.md).
- `git diff --check`: passed.

### Failures encountered and resolved

The first service run was **40 passed / 9 failed / 1 skipped**: old assertions
expected upfront ten-minute sessions, disappearing expired requests, automatic
availability restoration and removed Discover copy; an overly restrictive
feedback SELECT privilege also broke the existing empty-row RLS contract.
Assertions were updated for the owner's new behavior, and feedback retained its
no-policy empty-row contract. Final results above include these tests.

An initial typecheck found a callback type mismatch; it was fixed. Initial mobile
runs failed first on the dev server's 127.0.0.1 origin restriction and then on
Next's small developer-overlay button. Production-server capture resolves both;
no app target assertions were removed. The first npm install used an unwritable
default cache; installation succeeded with a temporary workspace-safe cache.

Normal Prisma engine generation was attempted and failed with **HTTP 403** from
`binaries.prisma.sh` (both checksum and engine-file requests). Ignoring missing
checksums did not resolve the binary-file restriction. Engine-free generation
and the production compile above succeeded; a normal binary-engine build is
still an environment verification limit, not claimed as passed.

## Limits / supervisor gate

PGlite is a migrated local Postgres implementation, not hosted Supabase. Browser
Auth credentials and email verification are fixtures. These suites cannot prove
real OTP delivery, hosted JWT verification/role wiring, Supabase RLS deployment,
Prisma's native engine/pooler integration, Vercel configuration, or real phones at
the venue. The supervisor must apply the additive migration and verify hosted
flows before approving rollout. No hosted/deployment verification, merge or
production data writes were performed. Older browser scripts were not counted
as executed; the new Part B journey is the executed browser suite.

## Files changed

- `README.md`
- `app/components/connection-flow.tsx`
- `app/components/conversation.tsx`
- `app/components/discover.tsx`
- `app/components/matched-profile.tsx`
- `app/components/station-editor.tsx`
- `app/event/[id]/page.tsx`
- `app/organiser/[id]/page.tsx`
- `docs/Task5B-Validation.md`
- `lib/arc-service.ts`
- `lib/arc.ts`
- `lib/connection-service.ts`
- `lib/connections.ts`
- `lib/discovery-service.ts`
- `lib/discovery.ts`
- `lib/http.ts`
- `prisma/migrations/202611150006_discovery/migration.sql`
- `prisma/schema.prisma`
- `tests/connections.test.mjs`
- `tests/discovery.browser.mjs`
- `tests/discovery.test.mjs`
- `tests/entry.test.mjs`
- `docs/screenshots/task5b/`: 30 viewport PNGs and gallery README.
