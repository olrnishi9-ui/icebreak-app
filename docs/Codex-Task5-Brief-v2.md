# Codex Task 5 Brief v2 — MeetMates Redesign (SUPERSEDES the Task 5 brief uploaded earlier tonight)

## Authority order (read in this order)

1. **Owner decisions, 2026-11-14 (tonight)** — email one-time-code login (no
   passwords, no social login in this build); personal QR generated from
   the profile, used for door check-in and contact exchange; station
   recommendations on Event Home; talks start at 5 minutes and extend by
   mutual consent to a 15–20 minute cap.
2. **`docs/MeetMates-Spec.md`** — the owner's complete product specification
   (MeetMates, "Explore Broadly. Connect Deeply."). Follow it for journey,
   screens, profile fields, Discover/Requests structure, conversation
   support, feedback, MVP priorities and success metrics.
3. **AGENTS.md design laws** — no scores/percentages/counts shown; rejection
   invisible; grounded content only; no in-app chat in this build.

Where sources conflict, the higher one wins. Two conflicts are already
resolved for you: the spec's mockups show "94%" match scores — the spec's
own §3 note disavows them, and design law 1 bans them: **never display a
match percentage**; explanations ("complementary goals", seek/offer pairs,
shared interests — verbatim from real fields) replace scores everywhere.
The spec's Sent tab lists a "declined" state — **do not implement a
visible declined state** (owner decided 2026-11-14: rejections stay
invisible — final; a non-accepted request reads as expired/closed, never
"declined").

## The quality bar

The owner supplied a design board (MeetMates "User Journey & Key Screens"):
deep-green primary, mint-tinted surfaces, white rounded cards, bottom tab
navigation, avatar-led people cards, generous spacing, polished empty
states. **That polish level is the acceptance bar for every screen** — the
current build's plain styling is explicitly rejected. Screenshots at
390×844 of every screen are a required deliverable per PR; a screen that
looks like an internal tool fails review.

## Part A — Identity, shell, profile, QR (build first)

- **Branding:** the product is **MeetMates** in all UI (landing, titles,
  headers). Tagline: "Explore Broadly. Connect Deeply." (Repo/domain names
  do not change.)
- **App shell:** persistent bottom navigation — **Home / Discover /
  Requests / Matches / Profile** (spec §10). Icons + labels, active state
  in the accent green.
- **Login:** event code → email address → Supabase Auth one-time code.
  Returning users land on their event home. No password UI anywhere.
- **Profile form (spec §2 Screen 4), one section per screen, selection-first:**
  name; photo (optional upload or initials avatar); job title/role;
  organization; industry + expertise (short text); short introduction;
  interest tags (multi-select from the event's tag set); networking goals
  (multi-select from the spec's goal list); mutual value — "I can offer"
  and "I'm looking for" (the existing help/learn fields, promoted here);
  a Review step before saving. The existing 5 binary preference questions
  stay, after the form, still skippable — they feed conversation prompts,
  not the profile. Age and origin are NOT collected (not in the spec).
- **Personal QR:** auto-generated on profile save (unguessable
  per-participant token, never the raw user id); lives on the Profile tab
  and one tap from Home; name + event under the code. Organiser scans to
  check in (`checked_in_at`); only checked-in participants appear in
  Discover, get match notifications, or get station recommendations.
  Name-search check-in fallback for organisers. Scanning a person's QR
  after a talk opens the existing double-opt-in contact exchange with the
  person pre-filled (consent unchanged).
- **Event Home (spec §5):** event name + session info; quick tiles to
  Discover / Requests / Matches; my QR shortcut; station shortlist slot
  (Part B fills it); notifications area (quiet banners, no counts).
- **Visual system (applies to every screen incl. existing ones):** deep
  green primary (#0B7A55 family — pick one exact value and commit), mint
  surface tint, white cards, rounded-2xl/3xl, soft shadows; type scale
  24–28 / 17–19 / 15–16 / 13; tap targets ≥48px; one primary button per
  screen; motion 150–250ms; contrast ≥4.5:1; Tailwind only, no new runtime
  deps, no webfonts.

## Part B — Discover, Requests, conversation, stations (build second)

- **Discover (spec §6):** tabs **For You / All Attendees / Saved**. For You
  = checked-in, availability-aware, ordered by the existing deterministic
  rules (shared goal → seek/offer complementarity → shared answers;
  ordering invisible). Every card: photo/initials, name, role ·
  organization, expertise/interests tags, **"Why you might connect"** —
  one grounded line built ONLY from real fields (a seek/offer pair, a
  shared goal, a shared interest), and suggested topics drawn from the
  same fields. Actions: **Request a Short Introduction**, **Save**.
  All Attendees = the full checked-in directory (search by name/org).
  Saved = bookmarked people (new `saved_people` table).
- **Requests (spec §4):** tabs **Received / Sent / Matches / Saved**.
  Received: accept / later (decline stays invisible to the sender — the
  sender's Sent view shows pending → accepted → expired/closed, never
  declined). Withdraw for sent requests. Matches = accepted introductions
  with meeting point + time.
- **Matched Profile (spec §8):** full profile, mutual-value explanation,
  suggested topics, meeting point + time — this is the prep card's home;
  keep the existing four-card arc as the conversation structure, with
  prompt categories mapped to the spec §5 table (Icebreaker / Shared
  interest / Professional insight / Complementary value / Next step).
- **Sessions:** invitations default to **5 minutes**; a **visible but calm
  timer** (elapsed/remaining ring or bar — never a force-cut); from ~1
  minute before the end either person may propose **Extend +5**; both must
  agree; **20-minute total cap**; a declined/ignored extension is
  indistinguishable from a natural end. Closing offers **Save and Follow
  Up** and **Meet Someone New** (returns to Discover, availability NOT
  auto-restored — attendee re-opens manually, as today).
- **Feedback (spec §7):** after closing — Was it worthwhile? (the existing
  perceived_value), Do you want to follow up? (willingness_to_reconnect),
  conversation ease, optional private note, optional reason chips
  (collaboration / learning / investment / advice). Write-only, never
  shown to the other person, never a reputation score. This is the
  training-label pipeline — keep the schema compatible.
- **Stations (owner instruction; not in the spec — keep):** organiser CRUD
  for stations (name, description, tags, location note); Event Home shows
  a ranked shortlist (max 10) with a grounded reason line per station
  (intention/help/learn vs station tags); dismissible per attendee.
- **Match notifications:** quiet banner on Home when a newly checked-in
  participant clears the Discover bar for you ("Someone new you'd
  probably enjoy is here" + their card). Polling-based; no counts; one at
  a time.

## Explicitly NOT in this build
Match percentages or any score display; visible "declined" status; in-app
chat or messaging of any kind; video; social (Google/Apple) login; event
directory/search across events (code/QR join only — directory is backlog);
calendar sync; contact export; tone modes; organiser analytics beyond
today's aggregate counts; synchronized matching rounds (spec leaves it
open; ad-hoc invitations stay).

## Constraints & deliverables
- AGENTS.md binds in full. New schema only via NEW migrations; RLS on all
  new tables, proven by tests in the existing style. No payload may gain a
  banned field; payload inspection will be re-run at review.
- Two PRs in order: "Task 5A: MeetMates identity, shell, profile, QR,
  check-in, visual system" then "Task 5B: Discover, Requests, matched
  profile, extendable sessions, stations, notifications". Each PR: files
  changed, schema audit, tests actually run with counts (baseline 41 pass
  / 1 skipped must not regress), and 390×844 screenshots of every new or
  redesigned screen.
- State honestly in each PR what the local suites cannot prove; hosted
  verification after merge is the supervisor's gate.
