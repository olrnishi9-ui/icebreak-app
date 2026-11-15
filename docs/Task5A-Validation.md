# Task 5A validation — MeetMates

## Scope and decisions

Part A only: MeetMates identity and visual system, the five-item navigation shell,
email-code accounts, progressive networking profile/review, personal QR, organiser
check-in, and checked-in board visibility. No Part B Discover/Requests tabs,
stations, new-person notifications, saved-person table, or extendable sessions.
The existing consent/session/feedback logic and rejection timing are preserved.
No repo, package, or deployment name changed; no runtime dependency was added.

The owner's follow-up requested an actual judges demonstration. `/organiser` now
has **Create judges demo**: a real event with a generated invitation code, an
explicitly labelled example meeting-point illustration, and zero fabricated Auth
users or attendees. In that event only, real email-authenticated attendees can
choose fictional Alex Morgan / Maya Chen profile values before reviewing and
saving them. `/judges-demo` gives the step-by-step presentation guide. This is
usable application code, but **no hosted demo event has been provisioned by this
run**. The owner's organiser email was supplied privately and is not committed.

## Tests actually executed

| Check | Actual result |
| --- | --- |
| Baseline `npm test`, clean `origin/main` archive | **41 passed / 0 failed / 1 skipped**, 42 tests |
| Final `npm test` | **49 passed / 0 failed / 1 skipped**, 50 tests |
| `npm run test:browser` | **1 passed / 0 failed**; rendered UI + real HTTP handler + migrated PGlite, fixture Supabase Auth |
| `npm run test:connections:browser` | **1 passed / 0 failed**; two clients, reload, accept, meeting, arrivals, offline recovery, three indistinguishable rejection timelines |
| `npm run test:arc:browser` | **1 passed / 0 failed**; both clients, cards, offline actions, private closing, contact exchange and feedback |
| `node --test tests/hosted.test.mjs` | **0 passed / 0 failed / 1 skipped**; hosted configuration and confirmed test-account tokens are absent |
| `npm run typecheck` | Passed; production build also ran TypeScript |
| Native `npm run build` | Blocked by Prisma native-engine download HTTP 403; see limitation below |
| Production build with no-engine Prisma client | Passed, with explicit engine override below; proves Next compilation, not native Prisma/database execution |
| `git diff --check` | Passed |

The hosted test is part of `npm test`; its separately listed skip is not an
additional test. Browser assertions include actual form submission, failed OTP
recovery/resend (fixture provider response), profile review/save, five skippable
preferences, returning login, editing and reload, photo rejection/upload/remove,
QR pixel decoding with independent jsQR, organiser name-search check-in,
QR-to-conversation follow-up, real demo-event creation and sample-persona save,
sign-out without profile deletion, invalid invitation, and responsive overflow.
Screenshots also measure visible button targets against 48×48 pixels.

The old anonymous-only browser smoke was replaced by the current journey, while
both existing connection/arc browser suites were updated for the new navigation
and confirmed-account fixtures and then rerun. Old SQL fixture attendees are now
explicitly marked checked-in by the test administrator; production attendees
cannot do this themselves. Legacy profile fixture interests now use a valid
event tag instead of an invented tag. The underlying assertions remain in place.

### Failures encountered and resolved

- The first post-change unit/integration run had **30 pass / 11 fail / 1 skip**:
  old fixtures lacked check-in and used a now-invalid interest tag. Updating the
  fixtures to model authorised check-in and valid event tags restored those tests.
- Initial browser runs failed from overlapping development/build output and then
  stale/non-unique selectors (`Withdraw` versus existing `Cancel request`, and an
  expertise input versus its sharing checkbox). A clean production server and
  precise selectors fixed the runs. No failures are omitted from this report.
- An added QR regression initially expected HTTP 201 from the existing send
  endpoint, which actually ships HTTP 200. Its expectation was corrected and the
  whole main suite was rerun.
- Interface review found a missing sign-out action and an oversized native
  checkbox from shared input styling. Sign-out was implemented and exercised;
  checkbox sizing/spacing was fixed and screenshots refreshed.
- Initial `npm ci` could not write the home npm cache. `npm ci --cache
  /tmp/meetmates-npm` completed successfully. No lockfile/dependency changes.

## Schema audit

Exactly one new migration: `202611150005_meetmates/migration.sql`. Earlier
migrations and `AGENTS.md` are unchanged. No new tables, policies, grants,
security-definer functions, extensions, or browser write privileges.

| Existing table | Additions | Privacy/integrity |
| --- | --- | --- |
| `events` | `interest_tags text[]`, `is_demo boolean` | Existing event SELECT RLS remains; only the trusted API creates events; demo marker creates no fictional membership |
| `event_participants` | role, organization, industry, introduction, photo, networking_goals, profile_saved, checked_in_at, qr_token | Existing own-row SELECT RLS; browser writes remain revoked; unique 64-hex token and photo-size CHECK |
| `users` | `is_guest` default becomes false | Existing Auth linkage and RLS remain; old identities are not rebound |

Photo is a bounded PNG/JPEG/WebP data URL in the private membership row (UI file
limit 130 KB, server 180,000 characters). This avoids adding public storage grants
or dependencies. Role/organization/industry/expertise/introduction/goals stay
event-scoped. The owner-only profile API returns them; the board projection still
returns only its existing allowlist.

`tests/identity.test.mjs` applies every migration to real embedded PostgreSQL and
switches to `authenticated` with per-user `auth.uid()`. It proves:

- own QR/new profile fields readable, other membership QR/photo/role hidden;
- organiser browser still cannot directly SELECT another membership;
- attendee cannot UPDATE check-in, even their own; no write grants added;
- API check-in/search rejects non-organisers and wrong events; repeated check-in
  preserves its timestamp; unchecked attendees are absent from the board;
- invalid fields/goals/tags/photos cannot partially save; QR is 256-bit random,
  stable on resave, and differs from the raw participant id;
- QR resolves only an existing started conversation of the caller, with no
  contact payload; outsiders cannot resolve that relationship;
- the production Auth verifier rejects anonymous and unconfirmed identities.

Existing suites additionally prove contact/answer/feedback/decision privacy,
field-level double opt-in, raw-request projection safety, and invisible rejection
responses/timing. `participantId` deliberately remains on actionable open-list
entries; the hosted rider expectation now checks that allowlist and UUID shape.

`prisma/demo-open.sql` marks fictional seed rows checked-in only when an
administrator explicitly runs it. New real memberships remain unchecked-in.

## Visual and interface evidence

The [screenshot gallery](screenshots/task5a/README.md) contains **38** captured
390×844 screens. Screenshots are actual rendered application views, not mockups;
fixtures are disclosed. They contain only disposable fictional/test data.

Committed primary: **#0B7A55**; mint **#EAF6EF**; ink **#163C30**; muted
**#49695D**; white rounded cards; system sans fonts; mobile headings 28/19/17,
body 16, utility 13; controls ≥48px, 200ms transitions, reduced-motion support.
All existing screens inherit this Tailwind-only system, including meeting,
conversation, closing, feedback, private people/notes and organiser controls.

## What local checks cannot prove / live demo blocker

No Supabase, database, or Vercel credentials are configured in this environment.
No migration was applied to a hosted database. No real OTP was sent or received.
The hosted suite requires `TEST_APP_URL`, public Supabase configuration, and two
confirmed email-account access tokens (`TEST_ACCOUNT_TOKEN_A/B`). The test now
uses confirmed email sessions; it no longer starts anonymous accounts.

The existing `https://icebreak-app.vercel.app` was attempted with the shell and
returned **CONNECT tunnel HTTP 403 from the environment gateway**. This does not
prove that the website itself is down. Shared-browser creation also failed with
“Browser Use could not read requirements.” No hosted event, successful hosted
login, or live end-to-end result is claimed.

Prisma's normal native engine download from `binaries.prisma.sh` returned 403.
For compilation only, the executed successful command was:

```sh
NEXT_PUBLIC_SUPABASE_URL=https://meetmates-test.invalid \
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-public-key \
PRISMA_SCHEMA_ENGINE_BINARY=/bin/true \
PRISMA_QUERY_ENGINE_LIBRARY=/bin/true \
PRISMA_GENERATE_NO_ENGINE=1 npm run build
```

Prisma reported `engine=none`. The engine path placeholders bypass unavailable
binary downloads; they are not functional database engines, are not committed
configuration, and must **not** be used for deployment. Next compiled and type
checked the actual app; native Prisma execution, hosted migrations, production
pooler behaviour, Auth email configuration, real email delivery, camera scanning
on a physical phone, and real device/browser combinations remain unproven.

For hosted review: install normally with native engine access; apply all
migrations; configure Supabase email OTP with `{{ .Token }}` in its email template
and anonymous sign-ins disabled; deploy this PR on the existing deployment; sign
in with the owner's organiser email; create the judges demo; have two inbox
owners complete the guide. The application provides name/link fallbacks for
browsers without native camera QR detection. The live gate remains outstanding.

Review verdict: source implementation and local interface flows are verified.
The weakest remaining part is live deployment/Auth verification, which requires
the missing configuration and network access.

## Four-perspective self-review

| Perspective | Verdict and strongest evidence | Highest-priority remaining action |
| --- | --- | --- |
| Goal owner | Part A source and local journeys verified; 38 viewport captures and all three browser suites pass; live event not provisioned | Configure/deploy and provision the hosted judges event |
| Beginner | Guide names the real screens/actions and two inbox/device setup; optional persona loading exercised in UI | Rehearse once with the actual presenter/inboxes |
| Domain expert | RLS, event scoping, production Auth verifier and double opt-in tests pass; no Part B feature added | Verify native Prisma/pooler and deployed migration |
| Skeptical verifier | Fixture Auth is explicitly separated from real HTTP/SQL and interface tests | Prove actual OTP delivery and physical camera scanning |

## Files changed

- `.env.example`
- `README.md`
- `app/components/bottom-nav.tsx`
- `app/components/check-in.tsx`
- `app/components/connection-flow.tsx`
- `app/components/conversation.tsx`
- `app/components/email-login.tsx`
- `app/components/personal-qr.tsx`
- `app/components/profile-editor.tsx`
- `app/components/shared.tsx`
- `app/event/[id]/page.tsx`
- `app/globals.css`
- `app/join/[code]/page.tsx`
- `app/judges-demo/page.tsx`
- `app/layout.tsx`
- `app/organiser/[id]/page.tsx`
- `app/organiser/page.tsx`
- `app/page.tsx`
- `app/qr/[id]/[token]/page.tsx`
- `docs/README.md`
- `docs/Task5A-Validation.md`
- `lib/connection-service.ts`
- `lib/demo-personas.ts`
- `lib/http.ts`
- `lib/service.ts`
- `lib/supabase.ts`
- `lib/types.ts`
- `package.json`
- `prisma/demo-open.sql`
- `prisma/migrations/202611150005_meetmates/migration.sql`
- `prisma/schema.prisma`
- `public/demo-meeting-point.svg`
- `tests/arc.browser.mjs`
- `tests/browser.smoke.mjs`
- `tests/connections.browser.mjs`
- `tests/entry.test.mjs`
- `tests/helpers/connections.mjs`
- `tests/hosted.test.mjs`
- `tests/identity.browser.mjs`
- `tests/identity.test.mjs`
- `docs/screenshots/task5a/`: 38 PNG viewport captures and their gallery README.
