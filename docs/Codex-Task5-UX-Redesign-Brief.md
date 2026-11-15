# Codex Task 5 Brief — UX Redesign: Accounts, Personal QR, Stations, Extendable Talks

Status: replaces the earlier Task 5 design-pass draft in full. Owner-approved
flow (Leo, 2026-11-14): homepage → event code → email code login → profile
form → personal QR → event-day check-in by QR → station recommendations →
match notifications → invitation → 5-minute talk, extendable to 15–20.
Login decision (Leo, 2026-11-14): **email one-time-code login, no passwords.**

Read AGENTS.md first — it binds, with one amendment recorded there: accounts
are now real (Supabase Auth email OTP); "anonymous users" no longer applies
to attendees. The design laws (no scores/counts shown, rejection invisible,
grounded content only) are unchanged.

## Part A — Accounts, profile, personal QR, check-in (build first)

### A1. Login (Supabase Auth, email OTP)
- After entering the event code, the attendee enters an email address;
  Supabase Auth sends a one-time code (OTP) / magic link. No password
  fields anywhere; no forgot-password flow exists or is needed.
- The account is the identity across events; the profile (A2) is per-event
  participation, as today. `users.auth_id` already references
  `auth.users(id)` — reuse it; stop creating anonymous sessions for
  attendees. (Organiser flow keeps working as-is.)
- Returning attendee with a completed profile for this event goes straight
  to their QR / event home. First-time attendee goes to the profile form.

### A2. Profile form (one question per screen, large tappable options)
Required, in this order:
1. **Name** (display name).
2. **Intention** — what they are here for, WITH direction: a short line plus
   a looking-for / offering split where applicable (e.g. goal chips +
   "I can help with…" / "I want to learn…" — the existing help/learn fields
   already model this; surface them here instead of burying them).
Optional:
3. **Where are you coming from** (free text, skippable).
4. **Age bracket** (optional, skippable, brackets only — never a birth date;
   never used in matching, never shown to other attendees).
Then the existing 5 preference questions, still skippable.
Nothing else. The form is the registration; it happens BEFORE the event day.

### A3. Personal QR (auto-generated, never a user step)
- The moment the profile is saved, generate the attendee's personal QR for
  this event (encodes an unguessable per-participant token — NOT the raw
  user id). It lives on the event home screen, one tap from anywhere.
- Jobs: (a) door check-in (A4); (b) peer contact exchange — scanning a
  person's QR after a conversation is the fastest path to the existing
  double-opt-in exchange (it pre-fills WHO; consent still required, both
  sides, per field).
- The QR screen shows name + event name under the code, large and bright
  (screen brightness boost optional; do not add if it complicates the build).

### A4. Event-day check-in
- Organiser (or a door device signed in as organiser) scans attendee QRs →
  participant marked `checked_in_at`. Only checked-in participants appear
  on the board, receive match notifications, or get station
  recommendations — this is the moment "AI matching starts working."
- Fallback: organiser can check in by name search (QR forgotten / phone
  dead). Attendee self-check-in by button is NOT offered (it would make
  the QR meaningless); if the organiser has enabled it for the event, a
  "I'm here" button may appear — organiser setting, default off.

### A5. Visual redesign (applies to ALL screens, old and new)
The owner judged the current UI "too simple." Direction (binding):
- Warm, calm, human — a social product for nervous people, not enterprise
  SaaS, not a dating app. Mobile-first 360–400px, one hand, crowded room.
- One warm accent colour on near-white warm-grey surfaces; rounded-2xl
  cards; soft shadows; type scale: page title 24–28 semibold, card title
  17–19, body 15–16, meta 13 grey, nothing below 13px. Tap targets ≥48px.
  One full-width accent primary button per screen; quiet text secondaries.
- Landing page = a real product hero ("Make room for someone new."),
  event-code input as the single focal point, three one-line how-it-works
  rows.
- The four conversation cards keep distinct soft tints + label chips
  ("Get ready / Start here / Go deeper / Wrap up"); the session progress
  indicator (dots/thin bar) shows session progress, never a score.
- Motion 150–250ms ease; no confetti, no celebration theatre, no "match"
  wording or hearts anywhere. Empty states always say what to do next.
- Tailwind only, no new runtime dependencies, no webfonts, contrast ≥4.5:1.
- All existing tests must keep passing; selector changes declared in the PR.

## Part B — Stations, match notifications, extendable talks (build second)

### B1. Stations
- Organiser CRUD for stations (name, one-line description, optional photo,
  location note) — same organiser surface as meeting points.
- Each checked-in attendee gets a **ranked shortlist (max 10)** of stations
  with a **one-line reason on every item**, grounded verbatim in their
  intention/profile fields (deterministic rules over intention + help/learn
  topics vs station tags the organiser sets; NO LLM generation, NO scores
  shown — the reason line is the explanation, e.g. "Matches your goal:
  Find teammates"). List re-sorts as the event changes; dismissing a
  station removes it for that attendee.
- Stations are recommendations, not assignments; no booking, no capacity
  claims.

### B2. Match notifications
- When a newly checked-in participant clears the existing board-ordering
  bar for an attendee (shared goal or a seek/offer pair or a shared
  answer), the attendee's event home shows a quiet banner: "Someone new
  you'd probably enjoy is here" + the person's board card (name, goal,
  one shared chip — the same fields the board already shows; no new data).
- Polling-based (the existing 3s poll); no push infrastructure, no counts
  ("3 new matches" is banned — design law), one banner at a time, gone
  when opened or when the person leaves the board.

### B3. Extendable talks
- New invitations default to **5 minutes** (the 10-minute upfront option is
  removed for this flow). The four-card arc pacing rescales to the CURRENT
  session length.
- From ~1 minute before the end, either person may tap **"Extend"**;
  extension requires BOTH to agree (the other sees "Alex would like more
  time — extend?" with Extend / Wrap up). Each extension adds 5 minutes,
  up to a **20-minute total cap**. If the other declines or doesn't answer,
  the session closes with the SAME closing card as a natural end — the
  requester cannot tell a decline from a timeout (rejection-invisibility
  law applies to extensions too).
- Extending never skips the closing card; contacts/feedback flow unchanged.

## Hard constraints
- AGENTS.md design laws bind in full: no scores/percentages/counts/rankings
  anywhere in UI or payloads; rejection (request, extension) never visible;
  grounded content only.
- No passwords anywhere. No in-app chat. No new data shown about a person
  beyond what the board already shows.
- Schema changes go in NEW migrations; existing migrations untouched.
  New tables/columns: stations, station tags/dismissals, participants.
  checked_in_at, personal QR token. RLS on everything new, proven by tests
  in the existing style.
- Testing honesty: full suite must pass; report actual counts; state what
  the suites cannot prove (hosted verification is the supervisor's gate).

## Deliverables
- Two PRs, in order: "Task 5A: accounts (email OTP), profile form, personal
  QR, check-in, visual redesign" then "Task 5B: stations, match
  notifications, extendable talks". Each PR: files changed, audit of schema
  changes, tests run with results, screenshots (390×844) of every new or
  redesigned screen.
