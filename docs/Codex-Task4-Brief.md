# Codex Task 4 Brief — Four-Card Conversation Arc, Closing, Contact Exchange, Feedback

*Status: DRAFT, dispatch-ready (drafted ahead of need by the overseer,
2026-11-14). Assumes Task 1 (Next.js + TypeScript + Tailwind scaffold, Prisma
schema + SQL migrations with RLS, seed, contacts table with per-field
visibility/consent, `feedback` table), Task 2 (organiser event creation +
QR/code join, guest join via Supabase Anonymous Auth, progressive profile,
questionnaire, availability toggle with ~15-minute query-time expiry, open-now
list with the §9 sort, screens S1–S3), and Task 3 (connection requests with
invisible decline, meeting-point assignment, arrival, short-code connect,
sessions entering the `started` state, screens S4–S5 with the prep-card slot
reserved and empty) are complete as specified. Follow `AGENTS.md` in the repo
root; it is binding. This brief covers the conversation half of the product:
everything from the moment a session reaches `started` to the session's end —
the four-card arc, closing, double-opt-in contact exchange, the private
remembered fact, and the one-tap feedback.*

---

## ⚑ Scope judgment calls (flagged for the supervisor — read first)

These points were not fully pinned by the design documents; the brief settles
each one as stated. If the supervisor disagrees, these are the lines to change
before dispatch.

1. **Session-model wording.** The Task 3 brief still says "session token";
   Task 2 as built uses **Supabase Anonymous Auth** (participant keyed by the
   authenticated user's id, RLS on `auth.uid()`). This brief follows the
   Task 2 amendment. Same product, updated words.
2. **When `buildArc` runs.** Master §8's flow puts the full card script in
   the S5 payload at accept time (offline insurance), but Task 3 ends at
   `started` with the prep slot empty. This brief settles it as: **`buildArc`
   runs once, server-side, at session creation** (accept or code-connect
   start), the script is stored on the session, and the prep card renders in
   the S5 slot from that moment (it is read while walking — computing it only
   at `started` would make it useless). This requires a minimal hook into
   Task 3's two session-creation paths (one shared server function, no change
   to consent behaviour). If Task 3 has already merged without the hook, this
   task adds it and says so in the PR.
3. **Card timing for the 5-minute box.** Master §4/§9 give absolute offer
   times for the 10-minute box (expand ~2:30, deepen ~5:30, close ~8:00) and
   no 5-minute variant. This brief makes pacing **proportional to the chosen
   duration**: offers at ~25% / ~55% / ~80% of the time box measured from
   `startedAt` (5-min box: ~1:15 / ~2:45 / ~4:00). Offers are offers — a card
   is never force-advanced (see Scope in).
4. **Who starts.** Settled as: on the expand card, the **requester starts**
   (the accepter never has to prepare an opener — the prep card tells the
   accepter "they'll start"); on the deepen card, the **other person
   starts** (alternation, Master §4). For code-connect sessions (no
   requester), the **code enterer** starts the expand card. Prep and closing
   cards are symmetric (no starter). The non-starter's card at each timed
   step is the listener card.
5. **S8 (My People) is in, but minimal.** Master §7 includes S8 and v2 flow
   step 9 makes the remembered fact the point of the exchange; a close with
   nowhere for the exchanged card to land is incomplete. Scope: a private
   list of people met (name, event, own note, whether contact was mutually
   exchanged) + note edit/delete. Nothing more. If the demo schedule forces
   a cut, this is the first cut in this task — the arc, close, and exchange
   are never cut (Master §11 cut order protects them).
6. **Post-close availability.** Task 3 deferred close semantics to this
   task. Settled as: on close, both participants are **un-muted** (can
   receive requests again) but availability is **not** auto-restored — each
   returns to S3 still paused, with a one-tap "open again" prompt. Nobody is
   made visible again without choosing it.
7. **Feedback is about the conversation, never a rating of the person.**
   The three fields rate the *session's* ease/value/reconnect-willingness
   (the engineering prompt's schema), copy must say so, and the row is
   written against session + author. It is never shown to the partner, never
   shown to the organiser individually (future aggregate use only), and
   skipping it leaves no trace anywhere.

---

## Objective

Build the complete in-conversation experience, end to end, for a live
two-user session:

1. A deterministic **`buildArc(a, b, event)`** function selects the pair's
   conversation material from consented structured data only and produces
   the full card script: **prep → expand → deepen → spare(s) → close**.
2. The **prep card** fills the S5 slot Task 3 reserved: time box, one true
   commonality, who starts — read while walking to the meeting point.
3. **S6 (Conversation)** runs the arc on both phones, synchronised: timed
   card offers, alternating starter, a **listener card** for the
   non-starter, phones-down rhythm between cards, every card skippable,
   "next card" always available, wrap-up reachable from every card, stall
   rescue only from unused true material, and an **honest closing
   suggestion** when the real material runs out — never generic filler.
4. The **closing card**: either person can trigger the **same** closing
   card at any time; a person-triggered close is indistinguishable from the
   timed one for both participants, and who triggered it is never stored in
   any client-visible way (`closeReason` is data-layer only, never
   serialised).
5. **S7 (Close & Exchange)**: each person privately picks a next step
   (exchange contact / meet again this event / that's all) — a choice is
   visible to the other only if **both** picked it; contact details are
   released **only on double opt-in**, per-field, from the separate
   contacts table.
6. Each person can privately save **one remembered fact** about the other
   (S8, author-only forever), and after closing, an **optional one-tap
   feedback** (conversation_ease, perceived_value,
   willingness_to_reconnect) is stored privately as the product's future
   training labels.
7. Closing a session completes the lifecycle Task 3 deferred: `closedAt`
   set, meeting point released, both participants un-muted, pair recorded
   as having had a session together (they sort last in each other's
   open-now lists, Master §9).

Screens delivered: the prep-card content in S5, S6 (Conversation),
S7 (Close & Exchange), and S8 (My People, minimal per judgment call 5).

---

## Context

Read these sections before writing code; they are the spec for this task.

**Master-Evaluation-MVP-Design.md**
- §0 verdict 4 / §4, Step 4 (Starter reveal) — the single starter is
  replaced by the four-card arc: prep read while walking; expand ~2:30
  (shared goal, stated as complementary difference where true); deepen
  ~5:30 (ask-me-about, self-authored); closing ~8:00 (each says one specific
  thing they'll remember; next-step options private unless mutual). Prompts
  appear on **both** phones, synchronised, alternating who starts; the
  non-starter's card is a listener card (one follow-up question). Phones
  face-down between cards. Skip and "next card" always available; a flowing
  conversation is never interrupted by force — cards are offers, not
  orders. No meaningful overlap → a true difference; not even that → an
  event-situational hook; **never fabricate a shared interest**.
- §4, Step 5 (Continue & exchange) — contact exchange is double opt-in and
  private: a share lands only if both chose it, otherwise nothing is shown
  and nothing is recorded as a rejection; declining is indistinguishable
  from the session simply ending. Early exit is the closing card's design
  (either person can trigger it; the trigger is unattributable; the rule is
  disclosed in advance). The card's genuine value is the **one remembered
  fact**, kept private to its author, always.
- §5, Failure scenarios — #5 (prompts feel scripted → direction-only cards,
  own words, never a sentence to read aloud); #6 (phone time expands →
  face-down rule, synchronised vibration, ~9 seconds of phone time total);
  #12 (connectivity dies → entire session script downloaded at accept time;
  offline tolerance; reconnect restores state); #17 (a prompt surfaces
  something sensitive → structured fields only, verbatim; ask-me-about is
  self-authored).
- §6, Must Have table — "Four-card conversation arc, both phones,
  alternating starter + listener card" (the actual bottleneck); ask-me-about
  field (max 2, self-authored) deepens card 3.
- §7, screen S6 (Conversation) — objective: support talk while demanding
  ~9 seconds of phone time total. Info: current card only (direction, one
  true fact), subtle elapsed indicator, small "wrap up" entry on every
  card. Primary: none — talking is primary; "next card" is the one control.
  Secondary: wrap up. States: card skipped → next; material exhausted →
  honest closing suggestion ("you've used the real material — a good place
  to wrap up"). Error: offline → cards already on device (session script
  downloaded at S5), nothing breaks. Next: S7 at closing signal (~8 min) or
  either person's wrap-up. Accessibility: vibration + visual flash both
  signal a new card.
- §7, screen S7 (Close & Exchange) — objective: end well and choose next
  steps privately. Info: "say one thing you'll remember" prompt, three
  private next-step options (exchange contact / meet again this event /
  that's all), contact share toggle. Primary: Done. Secondary: keep
  talking (returns to S6, no penalty). Empty: choosing nothing is a
  complete, valid ending. Accessibility: options are text buttons, large;
  nothing about the partner's choice is implied by timing or wording.
- §7, screen S8 (My People) — per person: name, event, the one fact you
  wrote, whether contact was mutually exchanged. Secondary: edit/delete a
  note. Fully private; nothing here is visible to organisers.
- §8, Technical architecture — data model rows this task owns:
  `Session(id, requestId, meetingPoint, cardState, startedAt, closedAt,
  closeReason: timer|either|unknown)` — *closeReason is stored as `either`
  by design, never who*; `ContactExchange(sessionId, participantId,
  optedIn)` — a card is released only when both rows for a session are
  `optedIn`; `Note(participantId, aboutParticipantId, text)` — readable
  only by its author. Flows: accept pushes both to S5 **with the full card
  script in the payload** (the offline insurance); card progression is
  client-side state synced opportunistically; if sync fails, the
  conversation literally does not care. Access rules: nobody — including
  organisers — can read another participant's answers, notes, or request
  history. Testing strategy items (1) two real phones, full journey;
  (2) refresh/close/reopen restores state at every step; (3) payload
  inspection; (5) airplane-mode mid-session: cards must keep working.
- §9, Matching and conversation logic — the `buildArc` pseudocode (quoted
  in Scope in below) and its rules: only consented, structured data;
  verbatim presentation, no paraphrase, no inference; if `shared` and
  `differ` are both empty, the arc is [situational opener, expand(goals),
  close] — shorter, and the app says so honestly rather than padding with
  generic questions. List sort note: people who have already had a session
  together sort last (this task records the pair history that makes that
  rule real).
- §10, Edge cases — browser closed / page refresh mid-interaction (session
  restores the exact step, cards included; card state persisted server-side
  per session); internet lost (session script already on device; sync
  resumes opportunistically); zero shared preferences (difference card →
  situational hook → honest short arc; never fabricated overlap);
  incomplete profile (goal-only users pair fine; material selection
  degrades per §9).

**Critical-Evaluation-v2-and-Engineering-Review.md**
- Part A §5 user flow steps 7–10 — the arc as the user lives it: prep
  (walk over) → expand (~2:30, goals stated as complementary where
  different; other phone shows a listener card: ask one follow-up) →
  deepen (~5:30, ask-me-about or an unused true difference) → close
  (~8:00). Phones face-down between cards; both vibrate together; every
  card skippable; "next card" rescues a stall from unused true material
  only; if material runs out, the app suggests closing honestly. Step 8:
  either person can trigger the same closing card at any time
  (indistinguishable from the timer — the rule is disclosed up front);
  each privately picks a next step; a choice is visible to the other only
  if both picked it. Step 9: contact cards exchanged only on double
  opt-in; each person can privately save one remembered fact (My People,
  visible to no one else). Step 10: optional one-tap feedback (ease /
  value / would talk again) stored privately — the future training data,
  collected with consent from day one.
- B-amendment (fuel fix, Part B §B2/B4 discussion of §5/§9) — the spec's
  help/learn topic fields create **complementarity (seek/offer)**, stronger
  fuel than binary overlap: **`buildArc`'s expand step prefers a seek/offer
  pair when one exists** (one can help with X, the other wants to learn X —
  verbatim topics), ahead of the plain goal relation. Conceded and fixed in
  the earlier review; this brief implements it.
- B-amendment (feedback) — feedback belongs in the **product schema**, not
  just an external experiment: the experiment and the label pipeline are
  one instrument. The `feedback` table exists from Task 1 with exactly
  these fields; this task wires the product surface that fills it.
- B2.2 (grounded generation ruling) — no ungrounded generation: card
  content in this task is **deterministic and verbatim**; there is no LLM
  call in this task at all (AGENTS.md law 4 governs later phases).

**Engineering prompt (Codex_engineers.docx, via supervisor) — API list to adapt**
This task implements `POST /api/icebreaker` (the arc/session surface) and
`POST /api/feedback` from the prompt's list, and adds the session-card,
close, exchange, and note routes the list does not name; document every
adaptation in the README API contract.

---

## Scope in

**`buildArc(a, b, event)` — deterministic material selection (pure function)**
- Implement Master §9 as a pure, unit-tested function. Inputs: both
  participants' answers (choice/skipped per question), both goal lines,
  both participants' `user_interests` rows (interest / discuss / help /
  learn / ask_me_about, from Tasks 1–2), the event (name, current session
  context for the situational hook). Output: the ordered card script.
  ```text
  shared   = answers where a.choice == b.choice and neither skipped
  differ   = answers where a.choice != b.choice and neither skipped
  opener   = lightest item in shared, else lightest item in differ,
             else event-situational hook ("both at this event")
  expand   = seek/offer pair if one exists (a.help ∩ b.learn or
             b.help ∩ a.learn, verbatim topics), else the goal relation:
             same goal -> "you're both here to X";
             different goals -> both goal lines, stated verbatim
  deepen   = partner's askMeAbout (if set), else a story-bearing item
             from shared/differ that has not been used
  spare    = remaining unused shared/differ items, then a hook-back card
             ("return to something they mentioned and ask one more question")
  close    = fixed closing card (remembered-thing + private next step)
  return [prep(opener), expand, deepen, spare..., close]
  ```
- "Lightest" uses the question order from the seed/config (earlier =
  lighter); the ordering rule is a named, documented constant of the
  function, not an emergent property.
- Every card's content is **verbatim structured data**: the option text
  both picked, the goal line(s), the help/learn topic strings, the
  ask-me-about string its author wrote. Fixed UI framing copy (labels,
  instructions) is the only other text, and it never describes a person.
- If `shared` and `differ` are both empty: the arc is exactly
  [prep(situational opener), expand(goals), close], and S6 says so
  honestly (short-arc notice) rather than padding.
- The script is computed **once**, at session creation (judgment call 2),
  stored on the session (extending `cardState` or a sibling column via a
  new migration), and included in the session payload from S5 onward — the
  offline insurance of Master §8. Recomputation never happens mid-session;
  later profile edits do not alter a live session's script.

**Prep card (fills the S5 slot reserved by Task 3)**
- Content: partner display name, the time box (the duration chosen in
  Task 3), the opener (one true commonality — or the true difference /
  situational hook, framed honestly as what it is), and **who starts** the
  expand card (judgment call 4), stated plainly on both phones: the
  starter's phone says "you start"; the other's says "[name] starts — you
  just listen first." For the accepter, the prep card also carries the
  line that they do not need to prepare an opener.
- The prep card is identical in facts on both phones (same opener string);
  only the who-starts framing differs by viewer. It renders from accept
  (board flow) or from session start (code-connect flow, where there is no
  walk — it shows briefly on the started screen instead).

**S6 Conversation — synchronised card progression**
- Session payload (polled every 3s, as in Tasks 2–3) carries: the full arc
  script, the current card index, each card's state (upcoming / current /
  skipped / done), the elapsed time, and the viewer's role for the current
  card (starter / listener / symmetric). Card state is persisted
  server-side per session (Master §8/§10): refresh, close, or reopening
  restores the exact card.
- **Timed offers:** at ~25% / ~55% / ~80% of the chosen duration from
  `startedAt` (judgment call 3), the next card is *offered*: both phones
  signal together (Vibration API where supported + visual flash — Master
  §7 accessibility) and show the next card as available. An offer never
  force-advances: if nobody taps, the current card stays. Either
  participant may tap **"next card"** at any time to advance for both
  (shared state, single advance, idempotent under racing taps).
- **Starter / listener:** on expand and deepen, the starter's card carries
  the direction ("say one thing about yourself first, then ask" framing —
  direction only, never a sentence to read aloud); the non-starter's card
  is the **listener card**: the same true fact plus exactly one follow-up
  question direction. Roles alternate per judgment call 4 and are computed
  from the stored script + card index, identically on both phones.
- **Phones-down rhythm:** after a card is advanced past, the screen
  returns to a minimal "keep talking" state (partner name, subtle elapsed
  indicator, "next card" and "wrap up" controls only) — the app gets out
  of the way between cards (AGENTS.md law 7).
- **Skip:** either participant may skip the current card for both; a
  skipped card is marked skipped in the shared state and never re-offered.
- **Stall rescue / material exhaustion:** "next card" draws only from the
  script's unused true material (spares, then the hook-back card). When
  the script's material is exhausted before the closing offer, S6 shows
  the honest closing suggestion ("you've used the real material — a good
  place to wrap up") with the wrap-up control — **no generic filler
  question may be generated, ever** (no code path exists that invents a
  prompt).
- **Wrap up:** a "wrap up" control is present on every S6 card and on the
  keep-talking state. Tapping it (either person, any time) moves **both**
  phones to the closing card / S7. See the closing rules below.

**Closing card + session close (the indistinguishable exit)**
- The closing card is **the same card** whether reached by the ~80% timed
  offer, by script exhaustion, or by either person's wrap-up tap — same
  content, same layout, same timing behaviour in every payload. The prep
  card and S6 disclose the rule in advance ("either of you can wrap up at
  any time — it looks exactly like this card arriving on schedule").
- On close: `Session.closedAt` is set; `closeReason` is stored at the data
  layer only as `timer` (timed offer accepted at the close step) or
  `either` (any person-triggered or exhaustion close) per Master §8 —
  **never who**, and `closeReason` is **never serialised** to any client
  payload. Both clients land on S7 on their next poll (or immediately for
  the tapper).
- Close side effects (this task owns them; Task 3 deferred them here): the
  meeting point's live-session count is released (Task 3's assignment
  function sees the point as free); both participants are un-muted (new
  requests allowed again); availability stays **off** for both (judgment
  call 6) with a one-tap re-open prompt on S3; the pair is recorded as
  having had a session together so Task 2's sort places them last for each
  other (Master §9) and a second session between the same pair is possible
  but never required.

**S7 Close & Exchange**
- Per Master §7: the remembered-thing prompt ("say one thing you'll
  remember" — spoken, face-to-face; the app does not ask them to type it),
  the three private next-step options (**exchange contact / meet again
  this event / that's all**), and the contact share toggle. "Keep
  talking" returns to S6 with no penalty (session re-opens in place;
  `closedAt` from a wrap-up is only final once S7's **Done** is tapped —
  if they keep talking, the session resumes and can be closed again).
  Choosing nothing and tapping Done is a complete, valid ending.
- **Next-step mutuality:** each participant's choice is stored privately
  (`ContactExchange`-style per-participant rows / session close choices).
  A choice becomes visible to the other participant **only if both chose
  the same option**; then both see exactly that one shared outcome.
  One-sided or differing choices are shown to **no one** — the end state
  reads identically ("that's a wrap") whether the partner chose the same,
  chose differently, or chose nothing. No timing signal: outcomes are
  revealed to both only when both have tapped Done, or when the event
  ends, whichever comes first.
- **Contact exchange (double opt-in, per-field):** the share toggle opts
  the participant into sharing the contact fields they marked visible in
  the Task 1 contacts table (per-field visibility/consent flags). Release
  rule: a participant receives the partner's fields **iff both** opted in
  **and** both selected "exchange contact" — and then only the fields the
  *owner* marked visible. Released fields land in the viewer's S8 entry
  for that person. If either side does not opt in, **nothing** is released
  and nothing about the other's decision is shown, stored client-side, or
  inferable from the payload.
- **Remembered fact (private note):** on S7 (and later in S8) each
  participant may write one short note about the other (the remembered
  fact). Stored in the `Note` model (author, about, text); RLS: readable
  and writable **only by its author** — not by the person it's about, not
  by organisers, not by any other participant. Optional; skipping leaves
  no row and no visible difference.

**S8 My People (minimal, judgment call 5)**
- Private list of the viewer's completed sessions: partner display name,
  event name, the viewer's own note (view/edit/delete), whether contact
  was mutually exchanged, and the exchanged fields if any. Nothing else.
  No counts displayed as metrics; it is a list, not a scoreboard. Empty
  state invites a first session.

**Feedback (optional, one tap, private)**
- After Done on S7, show the feedback prompt **once**: three one-tap
  scales — conversation_ease, perceived_value, willingness_to_reconnect —
  each skippable, the whole prompt dismissible. Submitting writes one row
  to the Task 1 `feedback` table (session, author, the three values).
- Copy frames it as rating **the conversation format**, never the person
  (judgment call 7). The partner never sees it; organisers never see
  individual rows in this task; it exists as consented training labels for
  later phases (AGENTS.md ML rules). No feedback state (given / skipped /
  values) appears in any payload the partner can read.

**Access control / RLS**
- Every API query scoped by `eventId` + the caller's authenticated session
  (Supabase Anonymous Auth, as built in Task 2).
- RLS policies (new migration if needed) so that, at the database level as
  well as the API level: a session, its card state, and its script are
  readable/writable only by its two participants; notes are author-only;
  contact fields cross to the partner only through the release rule above
  (never by direct table read); feedback rows are readable by no
  participant (not even their own after submission — write-only from the
  client) and never by the partner.
- All API inputs validated server-side (card actions are enum-only:
  advance / skip / wrap-up / done / keep-talking; note text length-capped;
  feedback values within their scale).

**Docs**
- README: final API contract for every route implemented or adapted in
  this task (method, path, auth = Supabase session, request/response
  shapes), explicitly noting which routes implement the engineering
  prompt's `POST /api/icebreaker` and `POST /api/feedback` and which are
  additions, and that the LLM and NN phases remain unimplemented by design.

---

## Scope out

- Any LLM call, generated prompt text, or "AI" claim of any kind — card
  content is deterministic and verbatim in this task (AGENTS.md laws 3–4;
  LLM phrasing is a later phase and never decides flow).
- The neural network, feature pipeline, experiment runner — later phases,
  gated per AGENTS.md ML rules. The feedback collected here is the gate's
  input, nothing more.
- Organiser aggregate-stats view, end/archive-event flow — later task
  (Must-Have for the product; not required for the demo loop this task
  completes).
- The group games (Sort Everyone, Duo) and the digital business-card
  exchange product surface — a different product line; not part of this
  app flow, not part of this task.
- Runtime-editable card copy, question-bank management, per-event custom
  questions — card framing copy is fixed in code for this task.
- Editing the arc after session creation (profile changes mid-session do
  not rewrite a live script — by design, see Scope in).
- A second session's *different* arc treatment (pair memory beyond the
  sort-last rule and never re-using a revealed ask-me-about verbatim is
  future work; this task always builds the arc from current data).
- Websockets / Supabase Realtime — polling only (AGENTS.md stack rule).
- Push notifications; card offers are discovered by polling + the
  on-screen state, nothing more.
- Native apps, offline session scripts beyond the in-payload script
  (already covered), organiser removal of a participant (later task).

---

## Constraints

The following are quoted verbatim from `AGENTS.md` and are binding on this
task. Violating one fails review.

> 1. **Never display** compatibility scores, percentages, rankings, vote/match counts,
>    or popularity metrics anywhere in UI or API responses to clients.
>    `recommendations.score_internal` must never leave the server.
>    *(In this task: no card counts, no "sessions completed" tallies, no
>    feedback values, and no exchange outcomes beyond the one mutual
>    outcome the pair shares are ever displayed or sent.)*

> 2. **Rejection is never visible.** A declined or ignored connection request must be
>    indistinguishable from an expired one for the requester — same UI, same timing,
>    no status they can read. There is no "declined" state exposed to senders.
>    *(In this task, the same law applied to exits and choices: a
>    person-triggered close is indistinguishable from the timed close; a
>    one-sided next-step choice or a withheld contact share is
>    indistinguishable from the session simply ending. See the closing and
>    S7 rules under Scope in.)*

> 3. **Grounded content only.** Conversation cards/prompts may use only structured,
>    consented data, presented verbatim. Never fabricate a shared interest, never
>    paraphrase a user's profile into an inference ("seems introverted" is banned —
>    no code path may generate evaluations of a person).
>    *(In this task: `buildArc` is the only source of card content; every
>    string it emits is either fixed framing copy or a verbatim structured
>    field. There is no code path that invents a prompt when material runs
>    out — exhaustion leads to the honest closing suggestion.)*

> 4. **LLM use (later phases only):** server-side only; structured JSON output with
>    `evidence_fields` and `safety_status`; a validator rejects output not supported
>    by its cited evidence; a deterministic template fallback must work with the API
>    switched off. The LLM never decides visibility, consent, or conversation flow —
>    the four-card arc structure (prep → expand → deepen → close, alternating starter,
>    listener card) is deterministic.
>    *(In this task: no LLM is used at all; the deterministic arc is the
>    whole deliverable.)*

> 6. **Event-scoped, expiring data.** Every query is scoped by event + the caller's
>    session token. A participant can never read another participant's private
>    answers, contact details, internal scores, or feedback — enforce with RLS and
>    prove it with a test. Contact details live in a separate table with per-field
>    visibility/consent flags and are released only on double opt-in.
>    *(In this task: notes are author-only, feedback is write-only from the
>    client, and contact fields move only through the double-opt-in release
>    rule — each proven by a test, below.)*

> 7. **Face-to-face first.** No in-app chat/messaging. The app structures a real
>    conversation and then gets out of the way (phones face-down between cards).
>    *(In this task: cards give direction, never sentences to read aloud;
>    the remembered-thing prompt is spoken, not typed to the partner; there
>    is no message field anywhere in S6/S7.)*

Stack rules from `AGENTS.md`, verbatim:

> Polling (3s) instead of websockets unless a task brief says otherwise. Keep dependencies minimal.

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
- `buildArc` is a **pure function** with no I/O, no randomness, and no
  clock access: same inputs → same script. All timing derives from the
  stored `startedAt` + the session's chosen duration at read time.
- Card content strings are either fixed framing copy or **verbatim**
  structured fields (option text, goal line, topic string, ask-me-about
  string). No string concatenation may create a claim about a person
  beyond joining those verbatim fields with framing copy.
- The closing trigger is **unattributable by construction**: no field
  readable by either participant (payload, UI state, timing of state
  changes beyond the close itself) may encode who tapped wrap-up, and
  `closeReason` is never serialised to a client.
- Next-step choices and contact opt-ins are **write-only from each
  participant until mutual**: a participant's payload contains their own
  choices and, only once both are Done, the single mutual outcome if one
  exists. There is no payload state for "partner chose differently."
- Session close is idempotent and race-safe: simultaneous wrap-up taps,
  or a wrap-up racing the timed offer, produce exactly one close and one
  S7 landing for both.
- The full arc script ships in the session payload from S5 onward
  (Master §8); the client must be able to render every card from that
  payload with the network down after `started`. Card *actions* sync
  opportunistically; a sync failure never blocks the conversation.

---

## Acceptance criteria

All criteria are testable; run them and report actual results (AGENTS.md
testing-honesty rule).

**`buildArc` (unit tests, required)**
1. Seeded pair with a known shared non-skipped answer: the prep opener is
   that answer's verbatim option text, framed as a commonality. Pair with
   no shared answer but a known difference: the opener is the verbatim
   differing item, framed as a difference (never as a commonality). Pair
   with all answers skipped/differing-free (no shared, no differ): the
   opener is the event-situational hook and the arc is exactly
   [prep, expand, close] with the honest short-arc notice — assert no
   other content strings exist in the script.
2. Expand selection: with a seek/offer pair seeded (A help="TypeScript",
   B learn="TypeScript"), expand uses that pair's verbatim topic ahead of
   the goal relation. Without one, expand equals the verbatim goal
   relation (same goal → the shared goal line; different goals → both goal
   lines verbatim, unembellished).
3. Deepen selection: with B's ask-me-about set, A's deepen card presents
   B's ask-me-about string **verbatim** (and B's deepen card presents
   A's, if set); with neither set, deepen is an unused story-bearing
   shared/differ item; an item used as the opener never repeats as deepen.
   No card string in any seeded scenario contains text that is not a
   verbatim field or fixed framing copy (assert by construction/fixtures).

**Prep card**
4. After an accept (Task 3 flow), both participants' S5 payloads contain
   the prep card with the **identical** opener string and time box; the
   who-starts framing differs correctly by viewer (starter vs non-starter,
   per judgment call 4), and the accepter's version carries the
   no-opener-to-prepare line. For a code-connect session, the prep card
   appears on the started screen instead of S5.

**S6 progression + synchronisation (two-session, required)**
5. **Two-session end-to-end test (required):** two independent sessions
   (separate browser contexts or two authenticated clients) in the same
   event run the **full flow**: join → questionnaire → open → request →
   accept → meeting point → both arrive → `started` → arc plays (advance
   through expand and deepen) → close → S7 exchange → feedback. Assert at
   each step that both clients agree on the session state.
6. Synchronisation: advancing a card on A appears on B's next poll with
   the same card index and content; simultaneous advance taps from both
   advance exactly one card. Refresh/close/reopen mid-arc (on the deepen
   card) restores the exact card and role for both participants.
7. Roles: on expand, the designated starter's card carries the direction
   and the other's is the listener card (same fact + exactly one
   follow-up direction, no second prompt); on deepen the roles are
   reversed. The role assignment is identical in both payloads (each
   phone's view of who starts agrees).
8. Timed offers: with a shortened test duration, at each offer point both
   clients show the next card as offered (signal state) **without** the
   card advancing on its own; the current card remains until someone taps.
   Skipping a card marks it skipped for both and it is never re-offered.
9. Exhaustion: with a minimal-material pair (criterion 1's short arc),
   advancing past the last real card shows the honest closing suggestion
   and the wrap-up control; assert the client received **no** additional
   prompt content beyond the script (payload diff against the stored
   script is empty).

**Closing (indistinguishability, required)**
10. **Early-exit indistinguishability test:** scenario (a) A taps wrap-up
    at ~30% of the duration; scenario (b) the pair plays to the timed
    closing offer and accepts it. Capture both participants' payloads and
    S6→S7 UI states in both scenarios and assert they are identical in
    shape and content (same closing card, same S7) — and that no payload
    in either scenario contains `closeReason`, a trigger-er identity, or
    any field from which who closed could be inferred. The stored
    `closeReason` at the data layer is `either` in (a) and `timer` in
    (b), readable by no participant (criterion 15).
11. Close side effects: after close + Done, the meeting point is released
    (Task 3's assignment test scenario sees the point free), both
    participants can receive new requests (un-muted), both appear in
    open-now lists **only after** re-toggling open, and each sorts last in
    the other's list (pair history). "Keep talking" from S7 returns both
    to S6 with the session live and closable again.

**Exchange + notes (S7/S8)**
12. Double opt-in: A opts in + picks "exchange contact", B picks "exchange
    contact" but does **not** opt in → nothing is released to either side
    and both end states read identically. Both opt in + both pick
    exchange → each receives exactly the fields the other marked visible
    in the contacts table (seed a field marked not-visible and assert it
    is absent). One-sided "meet again" → neither sees any outcome; mutual
    "meet again" → both see exactly that outcome, revealed only after
    both tapped Done.
13. Remembered fact: A saves a note about B → the note appears in A's S8
    entry for B; B's payloads and S8 contain no trace of it; A can edit
    and delete it. Skipping the note leaves A's S8 entry present (name,
    event) with no note — a valid state.

**Feedback**
14. After Done, the feedback prompt appears once; submitting writes
    exactly one `feedback` row with the three fields for that
    session+author; dismissing writes none. The partner's payloads never
    contain the values or the fact of submission. Copy check: the prompt's
    text frames the questions as about the conversation format (assert the
    shipped strings; no string rates or names the partner).

**Payload inspection (required)**
15. Automated test asserts: session/arc payloads contain only the script,
    card state, elapsed time, the viewer's own role/choices, and the
    mutual outcome when it exists — and none of: `closeReason`, raw
    answers or answer IDs beyond the card items themselves, the partner's
    note, the partner's feedback (values or existence), contact fields
    before the release rule fires, session credentials, or any key
    matching score/rank/count/percent/compatib*. A third participant in
    the same event polling the session endpoints gets nothing.

**RLS / access control**
16. Using participant A's credentials at the data layer: reads of B's
    notes (about anyone), all feedback rows, and a session A is not part
    of return zero rows or are denied. The session's two participants read
    the session and card state fine. Contact rows are never directly
    readable by the partner — release happens only through the S7 flow
    (criterion 12).
17. Cross-event: credentials from event A used against event B's
    session/arc/note/feedback endpoints return nothing (404/empty). An
    unauthenticated request to every route in this task is rejected.

**Build + states**
18. S6 renders its keep-talking (phones-down), offered-card, and
    material-exhausted states; S7 renders the choosing-nothing ending as
    complete; production build completes; the test suite you added
    actually runs and its real output is pasted into the PR report.
    **Offline check:** with the network blocked after `started`, the
    client renders every remaining card from the payload it already holds
    (Master §8 testing item 5).

---

## Deliverables

One pull request (small and reviewable; split into two only if the diff
becomes unreviewable, and say so) containing:

- The `buildArc` pure function + unit tests, the arc script computed at
  session creation and stored on the session, and the prep-card content
  rendered into the S5 slot Task 3 reserved.
- Screens S6 (Conversation), S7 (Close & Exchange), S8 (My People,
  minimal), plus the S3 re-open prompt after a closed session.
- API routes for: session card state + actions (advance / skip / wrap-up /
  keep-talking / done), next-step choices + contact release, notes
  (create/edit/delete, author-only), and `POST /api/feedback`.
- Any schema/RLS migrations this task required beyond Tasks 1–3 (arc
  script storage, close choices, note/feedback wiring), as new migration
  files (never edits to already-applied migrations).
- Tests: `buildArc` unit tests; the two-session full-flow end-to-end
  (criterion 5); closing indistinguishability (10); exchange/notes/
  feedback tests (12–14); payload inspection (15); RLS checks (16–17);
  the offline-render check (18).
- README updated with the final API contract for this task's routes and
  the adaptation notes from Context.
- PR description as the task report: files changed, key decisions, what
  was run and its real result, what failed or is unfinished (AGENTS.md
  format).

---

## Prohibitions

- Do NOT add any LLM call, AI-generated text, or runtime-generated prompt
  of any kind — card content is `buildArc` output (verbatim fields + fixed
  framing copy) only, and no code path may invent a prompt when material
  runs out.
- Do NOT expose who triggered a close, `closeReason`, or any timing/field
  signal from which the trigger-er could be inferred, in any endpoint,
  payload, or screen — and do NOT store the trigger-er's identity in any
  client-readable record.
- Do NOT reveal a next-step choice, a contact opt-in, or a feedback value
  (or its existence) to the partner unless the mutual-release rules in
  this brief fire — and do NOT create a payload state for "partner chose
  differently / declined."
- Do NOT release contact fields by direct table read, all-fields bundles,
  or organiser access — per-field, double-opt-in release only.
- Do NOT frame feedback as rating the partner, in copy, field names shown
  to users, or payload keys; do NOT show feedback values to anyone in this
  task.
- Do NOT force-advance a card on a timer, interrupt a conversation with a
  modal, or remove the "next card" / "wrap up" controls from any S6 state.
- Do NOT use the words "match" / "matches for you" / "recommended for you"
  in UI copy, route names, or response fields for the arc or exchange.
- Do NOT add in-app chat/messaging, a free-text field addressed to the
  partner, or a sentence-to-read-aloud on any card (direction only, own
  words).
- Do NOT add accounts, passwords, or email collection beyond what Tasks
  1–3 already have; do NOT add websockets, Supabase Realtime subscriptions,
  cron jobs, or push notifications (polling + query-time state only).
- Do NOT modify `Master-Evaluation-MVP-Design.md`,
  `Critical-Evaluation-v2-and-Engineering-Review.md`, or `AGENTS.md`, and
  do not edit already-applied migrations or destructively re-seed Tasks
  1–3 seed data.
- Do NOT claim any test passed that was not executed in the PR's
  environment; report failures and unfinished items explicitly.
