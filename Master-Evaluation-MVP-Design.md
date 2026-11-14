# Master Evaluation & MVP Design — Event-Based Social Discovery App

*Produced 2026-11-14 by running Leo's master prompt in full. This document evaluates the
prompt's version of the product (event room, ~5 preference questions, discover/connect,
starter reveal, contact exchange) against everything the team has already established:
the ChatGPT 10-round debate, the ChatGPT ideation session, the Claude consultations
(Sort Everyone, Duo v2, four-card conference arc), and the organiser-barriers research.
Where this prompt conflicts with an earlier settled decision, the conflict is flagged
and a ruling given. Nothing here changes the Codex build plan until Leo and the team
confirm it.*

## 0. Executive verdict (read this first)

1. **The problem is real but narrower than stated.** The barrier is not "people can't
   find common interests." It is *permission*: not knowing whether the other person
   wants to talk, and not knowing how to leave. Every feature should be graded against
   one test — **does this lower the shyest person's cost of the first sentence, and
   their cost of exiting?**
2. **Pick Option B (voluntary availability + mutual consent) as the primary MVP
   experience**, with Option A's short code kept as the fallback join mechanism.
   Option C (suggested introductions) is demoted to a sort order on the availability
   list, never a "match." Justification in §4.
3. **Five binary preference questions cannot power matching, and must not be asked to.**
   They can power exactly two things: one true commonality and one true difference to
   open a conversation. Anything more is theatre. Event-goal ("what do you want from
   this event") is a stronger signal than coffee-vs-tea and should outrank it.
4. **Step 4 as written (one starter on reveal) will fail the exact bottleneck Leo
   identified**: one prompt does not sustain minutes 2–10. Replace it with the
   four-card shared arc already designed (prep → expand → deepen → close, both
   phones, alternating starter, listener card). This is the product's actual
   differentiation; the starter alone is a commodity (question-card decks exist).
5. **No accounts. Guest, event-scoped sessions.** Accounts are the single largest
   adoption risk identified in the debate (on-site download + register + questions
   was rated fatal). Join target: under 30 seconds, QR → name → 5 taps → in.
6. **Differentiation is real but thin, and the moat is near zero** (§13). What is
   defensible is not features but the *structure*: consent signal before approach +
   a shared conversation structure during + a private memory after. A competitor can
   copy each piece in a weekend; the honest pitch is execution and event partnerships,
   not uniqueness.
7. **The validation gate is a host, not another app.** If a good human host with a
   microphone produces equal "ease of starting" scores in the §12 experiment, the
   product's reason to exist shrinks to its private data layer (true answers, private
   guesses, persistent cards). Run that experiment before believing anything else.

---

## 3. The five assumptions, challenged

### A1. "People want to meet individuals outside existing groups" — Confidence: High

- **Why it might be true:** People attend orientations, hackathons and conferences
  partly *for* new contacts; loneliness data (US Surgeon General 2023: about half of
  US adults report loneliness) suggests unmet demand for connection.
- **Why it might be false:** Attendance motives are often instrumental (learn, recruit,
  compete, get the certificate). Stated desire to "meet people" in a survey is cheap;
  revealed behaviour at events is clustering with known people. Wanting *more
  connection in life* is not the same as wanting *a stranger conversation at 2 p.m.
  in this corridor*.
- **Hidden assumptions:** (a) the desire is active at the event, not just in general;
  (b) it applies to the people physically present, not an imagined better crowd;
  (c) wanting to meet people implies wanting an app's help to do it.
- **Failure situation:** A hackathon team-formation hour. Participants say they want
  to meet new people, but rationally prioritise finding teammates with needed skills
  in the next 20 minutes. A social-discovery prompt is noise; they use it zero times.
- **Who disagrees:** Extroverts who already work the room (no unmet need); people
  attending with a close friend group as a social unit (the group *is* the point);
  anyone burned by a previous forced-mixer experience.
- **Cheap experiment:** At one real event, put a physical "open to chat" table sign /
  sticker opt-in at check-in (no app). Count opt-ins vs total attendees, and how many
  opt-ins actually get approached. Cost: printing.
- **Success criterion:** ≥25% of attendees opt in *and* ≥40% of opt-ins have at least
  one conversation with a non-group member during the event (observed or self-report).
- **If it fails:** The demand is for *specific* connections (teammates, mentors,
  recruiters), not open social discovery. Pivot the product to goal-directed
  introduction (find a teammate / find a cofounder) or stop.

### A2. "Difficulty initiating conversations is a major barrier" — Confidence: High

- **Why it might be true:** Consistent with the liking-gap and stranger-talk research
  (Epley & Schroeder 2014: people predict talking to strangers will go worse than it
  does); approach anxiety and fear of interrupting are the most-cited barriers in the
  organiser research.
- **Why it might be false:** For many attendees the binding constraint is *opportunity
  structure* (seating, schedule density, no breaks), not initiation skill. Others can
  initiate fine but find the *payoff* low — small talk with a random attendee rarely
  converts to anything, so they rationally don't bother. "Can't start" and "not worth
  starting" look identical from outside.
- **Hidden assumptions:** (a) initiation is the binding constraint, not continuation
  or follow-up; (b) people who don't initiate *wish they could*; (c) lowering
  initiation cost changes behaviour rather than just making people feel better about
  not initiating.
- **Failure situation:** A conference coffee break of 10 minutes between dense
  sessions. Nobody initiates — not from anxiety but because 10 minutes minus queue
  time minus finding a seat leaves 3 minutes, and a failed conversation has no exit.
  An app prompt doesn't fix a schedule problem.
- **Who disagrees:** Experienced networkers (initiation is a solved skill for them);
  people whose barrier is language confidence rather than social initiation per se;
  attendees who came for content and experience unsolicited approaches as intrusion.
- **Cheap experiment:** Two identical mixers, same crowd type. One gets a host who
  only announces "find someone you don't know, you have 5 minutes" (permission, no
  tool). Count cross-group conversations per attendee vs the no-announcement control.
- **Success criterion:** The permission-only condition raises cross-group conversations
  by ≥50% over control. That would prove initiation/permission is a real, movable
  barrier — and also set the bar the app must beat.
- **If it fails:** Initiation is not the constraint; opportunity or motivation is.
  The product should become scheduling/structure for organisers (assigned rotations,
  hosted formats), not a participant-facing prompt tool.

### A3. "Shared interests make conversations easier" — Confidence: Medium

- **Why it might be true:** Perceived similarity is one of the most robust predictors
  of initial attraction (Montoya et al. 2008, meta-analysis of 313 studies). A shared
  fact gives both parties a third object to talk about instead of performing
  themselves.
- **Why it might be false:** *Perceived* similarity does the work, and it can be
  created by almost any discovered overlap in the moment ("you're also in the wrong
  room?"). Pre-computed similarity from 5 binary answers is mostly generic (half the
  room is a night owl). Similarity also caps depth: two people who establish "we both
  like photography" have a topic, not a conversation — the follow-up questions
  (Huang et al. 2017) are what actually generate liking.
- **Hidden assumptions:** (a) the shared interests surfaced are *specific* enough to
  carry a story (specific + uncommon + story-bearing was our earlier design law);
  (b) users answer honestly; (c) similarity matters more than the *situation* (both
  being lost, both queuing) which in practice opens more conversations.
- **Failure situation:** Two users matched on "both prefer city exploration" exchange
  one sentence each ("I love Tokyo." "Me too.") and stall — the commonality was true,
  generic, and exhausted. Meanwhile the pair with *no* overlap talks for 10 minutes
  about why one plans trips and the other wings it, because the difference had a
  story in it.
- **Who disagrees:** People whose conversational strength is curiosity about
  difference; domain experts paired with a novice in their field (asymmetry is the
  interesting configuration); anyone who has been "matched" by a shallow algorithm
  before and learned to distrust it.
- **Cheap experiment:** In the §12 study, randomise treatment pairs to receive either
  a commonality opener or a difference opener. Compare "ease of starting" and
  "meaningful details learned."
- **Success criterion:** Either opener beats control on ease-of-starting by a clear
  margin; if difference ≈ commonality, stop optimising for overlap entirely.
- **If it fails:** Shared interests are not the mechanism; *any concrete, true,
  specific hook* is. Reframe the product around hooks (including situational ones),
  and drop all matching language.

### A4. "People will briefly use phones during face-to-face interaction" — Confidence: Medium

- **Why it might be true:** People already glance at phones constantly; a glance that
  is *synchronised and explained* ("we both get prompts") carries none of the rudeness
  of a unilateral glance. The four-card arc is built exactly on this.
- **Why it might be false:** The social meaning of a phone glance depends on norms of
  the setting. In formal/professional contexts, and in several cultures, any phone use
  mid-conversation reads as disinterest regardless of explanation. Also, "briefly" is
  doing heavy lifting: prompts every ~3 minutes is a rhythm some users will experience
  as the app interrupting a conversation that was finally flowing.
- **Hidden assumptions:** (a) both parties know the other is also using the app (only
  true inside mutual-consent pairs, not if one side hides it); (b) users can read a
  card in ~3 seconds and re-engage; (c) the conversation is weak enough to need the
  phone — the better it goes, the more the phone becomes the enemy.
- **Failure situation:** A senior professional at a formal reception is paired with a
  junior attendee. The junior's phone vibrates; he glances. The senior reads it as
  the exact behaviour she judges in meetings. The app has now *cost* the junior social
  capital — the opposite of its purpose.
- **Who disagrees:** Older/professional users; formal-mode events; anyone whose
  personal brand is "present and attentive"; users in cultures where phone-down is a
  strong respect signal.
- **Cheap experiment:** In the §12 study, observers log phone glances and partners
  rate "felt attended to" after. Compare arc-with-vibration vs arc-delivered-all-
  upfront (all cards shown before sitting down, phone then away entirely).
- **Success criterion:** Partner "felt attended to" scores within noise of the
  no-phone control, while ease-of-starting stays higher.
- **If it fails:** Move all structure *before* the conversation (prep card only) and
  make the in-conversation product zero-phone: the app ends at the handshake. That is
  a smaller product but an honest one.

### A5. "Participants will want to use the app again" — Confidence: Medium

- **Why it might be true:** Life is a series of new rooms (new semester, new job, new
  city); each transition re-creates the problem. A private "people I met" memory with
  one remembered fact per person has standalone value at the *next* event.
- **Why it might be false:** The need is episodic and self-extinguishing — success
  means the user builds a circle and stops needing introductions. Worse, the app is
  event-bound: if organisers don't adopt it at the next event, there is no room to
  join. Repeat use is therefore not a user-retention problem; it is an *organiser
  distribution* problem wearing a retention costume.
- **Hidden assumptions:** (a) the same user attends multiple app-enabled events;
  (b) the remembered-cards feature is valuable enough to reopen the app for;
  (c) novelty doesn't decay — the second event's prompts feel as fresh as the first.
- **Failure situation:** A student loves it at orientation week. By October she has a
  friend group; at the next club fair the app offers introductions she no longer
  wants, and the prompts now feel like training wheels she's embarrassed by. She
  doesn't delete it — she just never opens it again, which is worse data.
- **Who disagrees:** Anyone past the transition window (settled students, settled
  employees); one-event attendees (conference tourists); organisers evaluating on
  per-event value who don't care about cross-event retention at all.
- **Cheap experiment:** Run the app at two events 4–6 weeks apart with overlapping
  populations (e.g., two club fairs). Measure % of event-1 users who join event 2's
  room *without being prompted by a researcher standing there*.
- **Success criterion:** ≥20% unprompted return among users who attend both events.
- **If it fails:** Accept it: this is a per-event tool sold to organisers, not a
  consumer app with retention. Business model, metrics and roadmap all change
  (per-event pricing, organiser dashboard becomes the product).

---

## 4. The proposed journey, step by step — and the Option decision

**Step 1 (Join).** QR join is right; accounts are wrong. Rulings: guest sessions
(event-scoped, a token in the browser, no email, no password); display name required,
everything else optional; join must work in **under 30 seconds** or the room never
reaches critical mass. Someone without a smartphone is out of scope for the MVP —
say so honestly rather than designing a paper fallback nobody will build. The QR
belongs to the **organiser** (check-in desk, slide, badge back); user-shared QRs are
for the Step-3 fallback code, a different thing.

**Step 2 (Five questions).** Keep five, not ten — but change what they are *for*.
With 5 binary answers there are 32 possible fingerprints; in a 60-person room most
pairs share 2–3 answers by chance, so "overlap" carries almost no information and
must never be presented as compatibility. Their real job: supply **one true
commonality and one true difference** for the conversation arc. Two changes:
(a) add ONE event-goal question ("I'm here to: find teammates / meet people in my
field / explore something new / just socialise") — it outranks preferences for
sorting and for the expand card; (b) every question gets a **skip** and the pair
("neither / both") escape where the binary is false (coffee *and* tea people exist).
Questions must be re-writable per event type: the conference set and the orientation
set share at most two items.

**Step 3 (Discover/Connect) — the decision.**

| Criterion | A: Direct code | B: Availability board | C: Suggested introductions |
|---|---|---|---|
| Technical complexity | Lowest (one code lookup) | Low (list + flag + request row; polling suffices) | Medium–high (ranking, explanations, tuning) |
| Social comfort | High — encounter already happened | High — consent precedes approach; no visible rejection | Medium — being "suggested" can feel like being assigned; ignoring a suggestion is a soft rejection |
| Privacy | Best (nothing browsable) | Good (only opted-in users listed, minimal fields) | Weakest (profiles exist to be ranked) |
| Cold-start risk | None (works with 2 users) | **High** (empty board = dead product) | Highest (needs density *and* data quality) |
| Adoption | Easy to demo, hard to discover organically | Needs organiser push at check-in | Needs both, plus trust in the algorithm |
| Event suitability | Any size, incl. tiny | Small-to-mid events, breaks/mixers | Large conferences only |
| Hackathon build time | ~1–2 h | ~4–6 h | 8 h+ and still embarrassing |

**Decision: Option B is the primary experience.** Reason: B is the only option that
attacks the #1 barrier (not knowing whether the other person wants to talk) *before*
the approach. A presupposes the hardest part already happened and reduces the product
to a digital business card. C promises intelligence that 5 binary answers cannot
deliver, and its failures (irrelevant suggestions) actively teach users to distrust
the app. **A survives as the fallback**: every user has a short code; if the board is
empty or two people have already met, the code connects them into the same Step-4
flow. **C survives only as an invisible sort order** on the B list (shared goal
first, then shared answers), labelled honestly as "people who are open to chat,"
never "matches for you."

**Step 4 (Starter reveal).** As written, this is the weakest step (see verdict 4).
Replace the single starter with the **four-card arc** (full spec already exists in
the Claude consultation of 2026-11-14): prep card read while walking to the meeting
point; expand card ~2:30 (shared goal, stated as complementary difference where
true); deepen card ~5:30 (ask-me-about, self-authored); closing card ~8:00 (each
says one specific thing they'll remember; next-step options private unless mutual).
Prompts appear on **both** phones, synchronised, alternating who starts; the
non-starter's card is a listener card (one follow-up question). Phones face-down
between cards. Skip and "next card" always available; a flowing conversation is
never interrupted by force — cards are offers, not orders. If there is **no**
meaningful overlap: use a true difference; if there is not even that, use an
event-situational hook ("you're both at the 2 p.m. break of this event") — never
fabricate a shared interest.

**Step 5 (Continue & exchange).** Contact exchange must be **double opt-in and
private**: each side independently chooses "share my card"; a share only lands if
both chose it, otherwise nothing is shown and nothing is recorded as a rejection.
Declining is indistinguishable from the session simply ending. One-sided desire to
continue is handled by the closing card's design (either person can trigger it; the
trigger is unattributable — rule disclosed in advance). Early exit needs no in-app
mechanism beyond that. The digital card's genuine value is not the contact fields —
it is the **one remembered fact** attached to the person, which is what makes a
second conversation possible. Keep the memory private to its author, always.

---

## 5. Failure scenarios (skeptical review)

| # | Scenario | Root cause | Likelihood | Impact | Detection | Mitigation | Scope |
|---|---|---|---|---|---|---|---|
| 1 | Empty room / nobody joins | Organiser didn't push QR; join friction; no pre-registration | **High** | **High** | Room count <10 at event start | Organiser check-in integration; <30s guest join; seed with host + team; fallback code mode still demos | **Product** |
| 2 | Everyone stays with their existing group | Group attendance is the norm; app can't outbid friends | High | High | Opt-in rate vs attendance; observed clustering | Target solo attendees explicitly (they're the market); organiser announcement moment | Product |
| 3 | Visible use feels embarrassing ("I need an app to talk") | Stigma of assisted socialising | Medium | High | Interviews; users hiding phones / denying use | Normalise via organiser framing ("everyone gets prompts"); both-phones design removes asymmetry | Product |
| 4 | Skilled networkers find it useless and say so publicly | Product solves a problem they don't have | High | Medium | Feedback skew; influencer complaints | They're not the user; recruit testimonials from shy users, not loudest users | Feature |
| 5 | Prompts feel scripted/robotic | Ready-made sentences read aloud | Medium | High | "Naturalness" survey item; observed read-aloud | Direction-only cards, own words (settled design law) | Feature |
| 6 | Phone time expands instead of shrinking | Cards every ~3 min + list browsing | Medium | High | Observer-logged glance time in §12 study | Face-down rule; synchronised vibration; board auto-hides once paired | Feature |
| 7 | One popular user flooded with requests | Visibility concentrates on few profiles | Medium | Medium | Request distribution per user | Cap concurrent pending requests (e.g. 3); auto-pause after accept; no popularity display, ever | Feature |
| 8 | Repeated unwanted contact | Persistence after non-response | Low–Med | High | Reports; repeat-request logs | Unanswered requests expire silently (~15 min); one request per pair per event; block/report one tap; organiser can remove a user | Product (safety) |
| 9 | Too few active users at any moment | Availability is perishable; people toggle off and forget | High | High | Live "open now" count | 15-min auto-expiry with gentle re-open prompt; schedule-linked moments (announce at breaks) | Product |
| 10 | Users answer questions randomly to get through onboarding | 5 taps stand between user and room | High | Medium | Answer-time telemetry (<1s/question); nonsense patterns | Questions *are* the product's fuel — make each one visibly used later ("you both picked X" teaches honesty next time) | Feature |
| 11 | Suggestions/list feel irrelevant | 5 binary answers carry little signal | High | Medium | Request rate per list view | Sort by goal first; present as "open to chat," not "recommended"; never show a score | Feature |
| 12 | Connectivity dies in the venue | Conference Wi-Fi is notoriously bad | Medium | High | Error rates; session drop-offs | Entire session script downloadable at accept time; offline tolerance; reconnect restores state from token | Product |
| 13 | Used once, never again | Episodic, self-extinguishing need (A5) | High | Medium | Cross-event return metric | Accept per-event organiser model; remembered-fact memory as the re-open hook | Product (business) |
| 14 | Organisers refuse to adopt | They buy measurable meetings/leads, not vibes | Medium | High | Pilot conversion rate | Sell what they can report: opt-in count, conversations started, return-intent of newcomers | Product (business) |
| 15 | Reads as a dating app | Availability list + profiles + mutual consent is dating's skeleton | Medium | High | User interviews; press/judge questions | Event-scoped rooms that expire; no photos-first browsing; goals and group formats foregrounded; no swiping | Product |
| 16 | Mixed-hierarchy discomfort (junior "available" to senior, or vice versa) | Availability ignores status gradients | Medium | Medium | Formal-event feedback | Formal mode: availability framed as topic-based ("open to talk about X"); guessing games excluded (debate verdict) | Feature |
| 17 | A prompt surfaces something sensitive | Auto-extraction crosses a line (health, politics, identity) | Low | High | Report button usage; manual review | Structured fields only, verbatim; a reviewed question bank; nothing inferred; ask-me-about is self-authored | Feature |
| 18 | Two users' conversation is interrupted by a third's request notifications | Requests arrive mid-session | Medium | Low | Session telemetry | Accepting a session mutes new requests until it closes | Feature |

**The three that can kill the MVP outright:** #1 (empty room), #9 (stale
availability), #12 (venue connectivity). All three are distribution/engineering
problems, not design problems — which is why the demo must include a seeded room and
an offline-capable session, and why the pitch must name the organiser channel.

---

## 6. Final MVP scope (ruthless)

### Must Have
| Feature | Problem it solves | Demoable? | Difficulty | If removed |
|---|---|---|---|---|
| Event room via QR + short event code | Getting everyone into one scoped space | Yes | Low | No product |
| Guest join <30s (name only required) | Onboarding death (debate: fatal) | Yes | Low | Room stays empty (failure #1) |
| 5 preference taps + 1 goal question, all skippable | Fuel for one commonality + one difference | Yes | Low | Prompts become generic — the product's one claim dies |
| Availability toggle (open now, 15-min auto-expiry) | The permission problem — core value | Yes | Low | Back to cold approaches |
| Open-now list, sorted by shared goal then shared answers, no scores | Discovery without "matching" theatre | Yes | Low | No way to find the willing |
| Request → accept / silent expiry (no visible decline) | Consent without recorded rejection | Yes | Low–Med | Approaches become ambushes again |
| Short-code direct connect (fallback) | Empty-board and already-met cases | Yes | Low | Demo dies in a thin room |
| Meeting point assignment (numbered point + photo + one-line direction) | "Where do we actually meet" (GPS fails indoors) | Yes | Low | Accepted pairs wander and cool off |
| Four-card conversation arc, both phones, alternating starter + listener card | Minutes 2–10 — the actual bottleneck | Yes | Medium | One prompt, then silence; indistinguishable from a card deck |
| Closing card with indistinguishable early-exit + private next-step choice | The exit problem; no one is trapped | Yes | Low | Shy users won't start what they can't end |
| Double opt-in contact card + private remembered-fact note | Follow-up without rejection records | Yes | Low | Meetings evaporate; no second conversation |

### Should Have (if time)
- Ask-me-about field (max 2, self-authored) — deepens card 3; cut first if behind.
- "Next card" / flip-for-next stall rescue from unused true material.
- Organiser view: live counts only (joined / open now / sessions started). No content.
- Re-open prompt when availability lapses during a scheduled break.

### Future (post-hackathon)
- Group formats (Sort Everyone for 3–6) inside event rooms.
- Pre-event registration import so join is scan-only on site.
- Cross-event private memory ("people I've met") with the remembered facts.
- Organiser dashboard with return-intent reporting; per-event pricing.
- Conversational (non-binary) intake — only if evidence shows binary fuel is the
  binding constraint.

### Explicitly Excluded
- Accounts, passwords, email verification.
- Any similarity/compatibility score, percentage, ranking, or count shown to users.
- Continuous location, GPS meeting, background proximity/Bluetooth detection.
- AI-generated prompts or AI matching claims. All prompts are template + true data.
- In-app chat/messaging (the product's purpose is face-to-face; chat cannibalises it).
- Photos-first profile browsing, swiping, likes.
- Public profiles that outlive the event. Rooms and their data expire with the event.

---

## 7. Screen-by-screen specification (only the screens the MVP needs)

**S1 Join Event.** Objective: enter a room in <30s. Info: event name/code (from QR).
Components: event title, name field, Join button. Primary: Join. Secondary: "join
with code instead." Loading: spinner on code validation. Empty: n/a. Error: invalid
code → plain message + retry. Next: S2. Accessibility: large tap targets, code also
typeable (QR cameras fail), no colour-only signalling.

**S2 Quick Setup.** Objective: minimal fuel + consent. Info: display name (prefilled),
optional field/major (one line), 5 preference questions as big two-option taps + goal
question, each skippable. Primary: "I'm in." Secondary: skip-all. Loading: none
(local). Empty: all skipped is valid — user joins with goal only. Error: none
expected; name empty → inline hint. Next: S3. Accessibility: questions readable at
arm's length; neither/both escape on either-or items where relevant; full keyboard/
screen-reader operability of the tap targets.

**S3 Event Home / Open Now.** Objective: see who is open to chat, or set yourself
open. Info: own availability toggle + expiry countdown, list of open users (name,
goal line, one shared-answer chip max — never a count or score), pending requests.
Primary: toggle "I'm open to chat." Secondary: enter a code (fallback connect),
view incoming request. Loading: skeleton list. Empty: "Nobody's open right now —
you can be the first" + code option (this state *will* happen; design it kindly).
Error: connection lost banner with auto-retry; list is read-only offline. Next:
S4 (tap a person → request) or S5 (accept incoming). Accessibility: list order is
not a ranking — say so in a caption; expiry time in text, not just a ring.

**S4 Request Sent.** Objective: wait without anxiety. Info: who was asked, expiry
(~15 min, silent), "they'll get a gentle nudge; no reply just means not now."
Primary: none (waiting). Secondary: cancel request; ask someone else. Loading: n/a.
Empty: n/a. Error: request failed → retry inline. Next: S5 on accept; silent return
to S3 on expiry (no notification, no record shown). Accessibility: status conveyed
in words.

**S5 Meet.** Objective: get both people to the same physical point with the opener
already read. Info: meeting point number + photo + one-line direction, partner name
(+ pronunciation if provided), prep card (time box, one true commonality, who
starts). Primary: "I'm here." Secondary: "running late" (sends a neutral hold
message; point held a few minutes). Loading: waiting-for-partner state. Empty: n/a.
Error: partner cancels → kind message, straight back to S3 with availability
restored. Next: S6 when both are "here" (or either taps start). Accessibility:
directions in words, not map-only.

**S6 Conversation.** Objective: support talk while demanding ~9 seconds of phone
time total. Info: current card only (direction, one true fact), subtle elapsed
indicator, small "wrap up" entry on every card. Primary: none — talking is primary;
"next card" is the one control. Secondary: wrap up. Loading: n/a. States: card
skipped → next; material exhausted → honest closing suggestion ("you've used the
real material — a good place to wrap up"). Error: offline → cards already on device
(session script downloaded at S5), nothing breaks. Next: S7 at closing signal
(~8 min) or either person's wrap-up. Accessibility: vibration + visual flash both
signal a new card (noisy halls, hearing differences).

**S7 Close & Exchange.** Objective: end well and choose next steps privately. Info:
"say one thing you'll remember" prompt, three private next-step options (exchange
contact / meet again this event / that's all), contact share toggle. Primary:
Done. Secondary: keep talking (returns to S6, no penalty). Loading: n/a. Empty:
choosing nothing is a complete, valid ending. Error: n/a. Next: S8. Accessibility:
options are text buttons, large; nothing about the partner's choice is implied by
timing or wording.

**S8 My People (private).** Objective: remember who you met. Info: per person —
name, event, the one fact you wrote, whether contact was mutually exchanged.
Primary: none. Secondary: edit/delete a note; after the event, a follow-up reminder
based on your own note. Loading/empty: empty state invites a first session. Error:
n/a. Accessibility: fully private screen; nothing here is visible to organisers.

*Not built:* profile pages, settings, chat, feeds, leaderboards, organiser content
views. Their absence is a feature.

---

## 8. Technical architecture

**Stack (aligned with the existing build plan; do not re-litigate):** Next.js
(App Router) + TypeScript, Tailwind, Prisma. One change from the plan's local-dev
choice: for a multi-phone live demo, SQLite on a laptop works only on one network
and dies with the laptop; **use Supabase Postgres via Prisma for the demo deploy**
(free tier, real multi-device), keeping SQLite for local dev. Deploy on Vercel.
No separate backend service, no websockets — **3-second polling** on S3/S4 is
honest, sufficient, and debuggable by this team.

**Why a backend at all:** mutual consent and availability are shared state — two
phones must agree on "requested / accepted / open." A pure front-end demo can fake
one user's journey but cannot do the two-phone moment that is the entire pitch.
Minimum real backend = the tables below and ~6 API routes.

**Data model (all rows carry `eventId`; rooms and their data are deleted or
anonymised when the event ends):**
- `Event(id, code, name, meetingPoints[], endsAt)`
- `Participant(id, eventId, displayName, field?, goal, askMeAbout?, sessionTokenHash, createdAt)`
- `Answer(participantId, questionId, choice | skipped)`
- `Availability(participantId, openUntil, mutedUntil?)`
- `Request(id, fromId, toId, status: pending|accepted|expired|cancelled, expiresAt)` — *declined is not a stored status visible to anyone; non-response becomes `expired`.*
- `Session(id, requestId, meetingPoint, cardState, startedAt, closedAt, closeReason: timer|either|unknown)` — closeReason is stored as `either` by design, never who.
- `ContactExchange(sessionId, participantId, optedIn)` — a card is released only when both rows for a session are `optedIn`.
- `Note(participantId, aboutParticipantId, text)` — readable only by its author.

**Access rules:** every query is scoped by event + the caller's session token
(issued at join, stored in localStorage; no passwords). A participant can read:
the open-now list (name, goal, one shared chip), their own requests, their own
sessions/notes. Nobody — including organisers — can read another participant's
answers, notes, or request history. Organiser view reads aggregate counts only.

**Flows:** Join = validate code → create Participant + token → answers → home.
Request = insert row → target polls and sees it → accept creates Session + assigns
least-busy meeting point + pushes both to S5 with the full card script in the
payload (this is the offline insurance). Expiry is a query-time computation, not a
cron job. Card progression is client-side state synced opportunistically; if sync
fails, the conversation literally does not care.

**Testing strategy:** (1) two real phones on venue-like Wi-Fi, full journey, before
any polish; (2) refresh/close/reopen at every step (state must restore from token);
(3) payload inspection — formal/limited views must not contain unshared fields;
(4) the empty-room, single-user, and odd-user cases from §10 walked manually;
(5) airplane-mode mid-session: cards must keep working.

---

## 9. Matching and conversation logic (explainable, no AI)

**Is matching necessary? No.** What the MVP needs is (a) a sort order for the
open-now list and (b) a selector that picks conversation material for a pair. Both
are deterministic and auditable.

**List sort (never displayed as a score):** 1) same event goal; 2) count of shared
non-skipped answers (used only for ordering and for the one chip shown); 3) most
recently opened (fairness to newcomers). Ties: random. People who have already had
a session together sort last.

**Material selection for a pair:**
```text
function buildArc(a, b, event):
  shared   = answers where a.choice == b.choice and neither skipped
  differ   = answers where a.choice != b.choice and neither skipped
  opener   = lightest item in shared, else lightest item in differ,
             else event-situational hook ("both at this event's break")
  expand   = goal relation: same goal -> "you're both here to X";
             different goals -> state them as complementary, verbatim
  deepen   = partner's askMeAbout (if set), else a story-bearing item
             from shared/differ that has not been used
  spare    = remaining unused shared/differ items, then a hook-back card
             ("return to something they mentioned and ask one more question")
  close    = fixed closing card (remembered-thing + private next step)
  return [prep(opener), expand, deepen, spare..., close]
```
Rules enforced in code and in copy review: only consented, structured data; verbatim
presentation, no paraphrase, no inference ("he seems introverted" can never be
generated because no code path produces evaluations); if `shared` and `differ` are
both empty, the arc is [situational opener, expand(goals), close] — shorter, and
the app says so honestly rather than padding with generic questions.

---

## 10. Edge cases and safety handling

| Case | Handling |
|---|---|
| Two users request each other simultaneously | Second insert detects the existing pair request and converts it to an acceptance — a mutual request *is* consent. Pleasant, not an error. |
| Request expires | Silent. No notification, no history entry shown to the requester. Requester simply sees the person may still be listed as open. |
| Request ignored | Identical to expiry by design. There is no decline state anywhere in the UI. |
| Browser closed mid-interaction | Session token in localStorage; reopening restores the exact step (list, waiting, session, cards). |
| Page refresh | Same as above; card state persisted server-side per session. |
| Internet lost | Session script already on device at S5; conversation continues; sync resumes opportunistically. List/requests degrade to a clear offline banner. |
| Wrong event joined | Event name shown at join and persistently in the header; "leave event" is one tap and deletes the participant row. |
| Duplicate display names | Names are display-only; identity is the token. Lists disambiguate with the goal line, never with exposed IDs. |
| Incomplete profile | Valid by design: goal-only users can be listed and paired; material selection degrades per §9. |
| Event has one participant | S3 empty state is written for exactly this; code-connect and demo seeding keep the journey demonstrable. |
| Odd number of participants | Nobody is "left over" in a pairing queue because there is no queue — availability is continuous, not rounds. |
| Zero shared preferences | Difference card; failing that, situational hook; failing that, honest short arc (§9). Never fabricated overlap. |
| Cross-event data access attempt | All queries scoped by eventId + token; a token from event A returns nothing in event B. Tested in §8(3). |
| Unwanted repeated requests | One pending request per pair per event; after expiry, a cool-down before the same pair can re-request; block/report in one tap; organiser can remove a participant. |
| Organiser ends the event | Room closes: availability cleared, lists empty, participants see a thank-you + their own My People notes (their data, kept for them only). |
| Viewing another's private answers | Impossible by API design: answers are never returned for another participant — only the single derived chip/fact inside an accepted session. Verified by payload inspection. |

---

## 11. Hackathon development plan (24–36 h, mapped to the existing T-plan)

- **Phase 1 — Core logic on paper and in code (2 h).** Deliverable: `buildArc`
  (§9) as a pure function with unit tests on fixture pairs (full overlap, zero
  overlap, all-skipped). Acceptance: tests pass. Cut line: none — this *is* the
  product. (Maps to build-plan T1's data model.)
- **Phase 2 — Single-user journey (5 h).** Screens S1–S3, S5–S8 against seeded
  demo users. Acceptance: one phone can walk the whole journey against bots.
  Cut line: organiser view.
- **Phase 3 — Two-user reality (6 h).** Participants, availability, requests,
  accept/expire, meeting point, token restore. Acceptance: two physical phones
  complete request → meet on venue-like Wi-Fi. Cut line: re-open prompts.
- **Phase 4 — The arc live (5 h).** Synchronised cards, vibration, wrap-up,
  closing, double opt-in exchange, notes. Acceptance: a full 8-minute session
  runs with ≤ ~10 s total phone time; payload inspection clean. Cut line:
  ask-me-about (deepen falls back to unused material).
- **Phase 5 — Test and debug (4 h).** §10 table walked case by case on two
  devices; empty-room and offline drills. Acceptance: no step loses state on
  refresh or airplane mode.
- **Phase 6 — Deploy and demonstrate (3 h).** Vercel deploy, seeded demo event,
  scripted 3-minute demo with a fallback recorded run. Acceptance: a judge can
  scan the QR and be paired within 60 seconds.

If the schedule collapses, the order of sacrifice is: organiser view →
ask-me-about → list sort sophistication → **never** the consent flow, the arc,
or offline tolerance.

---

## 12. Validation experiment (12–24 participants)

**Design:** Recruit 16–24 volunteers at a real social event (club fair, orientation
mixer). Randomly assign pairs to **Control** (ordinary introduction: "go meet this
person, you have ~8 minutes") or **Treatment** (full app flow). Add, if numbers
allow, a third arm — **Host-only** (a facilitator gives the pair the same opener
verbally, no app) — because beating a host is the product's real bar (§0.7).

**Primary outcome:** "How easy was it to begin the conversation?" (1–7, asked
immediately after). **Secondary:** comfort (1–7); naturalness (1–7); meaningful
details learned (count, from a 60-second recall listing); willingness to talk to
this person again (yes/no); phone-glance time (observer-logged); whether the pair
voluntarily does a second interaction.

**Procedure:** consent script states the study compares introduction methods;
observers time-stamp start of speech, glances, and end; surveys are private and
unlinked to names shown in the app. **Biases to disclose:** volunteers are more
social than the target user (recruit some self-described shy participants
explicitly); novelty inflates treatment scores; pairs are not independent of the
event's mood; n is far too small for significance claims — report descriptives and
effect direction only.

**Preliminary positive evidence:** treatment beats control on ease-of-starting by
≥1 point median, with naturalness no worse and phone time under ~30 s total.
**Pivot signals:** host-only ≈ treatment (→ the value is facilitation, sell to
hosts/organisers or fold); treatment ≤ control on naturalness (→ the arc is
intrusive; strip to prep-card-only); shy subgroup shows no ease gain while
non-shy do (→ the product serves the already-social — the core claim is false;
stop and rethink).

---

## 13. Competitive differentiation — honestly

| Alternative | What it already solves | Why users may prefer it | What we add | Verdict |
|---|---|---|---|---|
| Traditional networking events | Co-location + a reason to talk | Zero learning curve; serendipity | Consent signal + structure for the people the format fails | Real for the shy minority; irrelevant for the majority |
| Speed networking | Rotation guarantees meetings; built-in exit | No app, no signup, organiser-run | Choice (theirs is forced pairing); conversation support after the bell | Their exit design is better than ours; our consent is better than their force |
| Icebreaker games (host-led) | Energy, laughter, group bonding | Human host reads the room | Works without a host; private, pair-level, consent-based | Different job: games warm a group; we start a dyad |
| LinkedIn | Identity + follow-up after meeting | Everyone's already on it; the card is richer | The meeting itself — LinkedIn starts *after* the hard part | Complementary, not competitive |
| Event platforms (Brella/Grip/Whova) | Who-to-meet at scale, scheduled 1:1s | Organiser-bought, integrated, proven | The conversation layer they stop before; small-event, no-download lightness | **The real differentiation — and they can copy it** |
| QR business cards (Popl etc.) | Instant contact exchange | Dead simple, works today | Everything before the exchange (consent, opener, arc) | We must be at least this fast at the exchange step or we lose |
| AI conversation generators | Unlimited prompts on demand | Free, instant, no coordination needed | Prompts grounded in *both* people's true, consented data, delivered as a shared structure | Generic AI is our strongest substitute; grounding + structure is the only answer |

**Bottom line:** differentiation is **meaningful but shallow**. The defensible core
is the combination *consent-before-approach + shared in-conversation structure +
private memory after*, aimed at small events the big platforms ignore. Nothing
stops Brella from adding a prompt card; what might stop them is that their buyers
(large-event organisers) purchase measurable meetings, and conversation quality is
unmeasurable in their dashboards (§5 #14). Our moat, if any, is being the product
small-event organisers and shy attendees actually love — a brand and distribution
position, not a technology.

---

## 14. Hackathon judge simulation

### Judge A — Technical Execution
- **Strongest:** (1) deliberately boring stack — one framework, one database,
  polling instead of realtime; (2) the core logic is a pure, unit-tested function;
  (3) offline tolerance designed in (script downloaded at accept).
- **Weakest:** (1) multi-user state is real — this is where hackathon demos die;
  (2) token-in-localStorage auth is demo-grade, not production-grade; (3) card
  synchronisation across two phones over venue Wi-Fi is unproven until Phase 5.
- **Hard questions:** What breaks if 200 people join at once? How do the two
  phones stay in sync? What exactly is stored about a user, and who can read it?
  Why not pure front-end? What did you cut, and what breaks first under load?
- **Convincing demo:** a judge scans, joins, gets paired with a second live phone,
  and the arc advances on both — unscripted.
- **Losing demo:** any moment where the presenter says "imagine this works with
  real users" about the consent flow — the one thing that must be real.

### Judge B — Product & User Experience
- **Strongest:** (1) the problem is specified at the level of a moment (the first
  sentence, the exit), not a market; (2) no visible rejection anywhere in the
  system; (3) the app is designed to be *left* — total phone time is a stated
  metric.
- **Weakest:** (1) cold start — the demo room is seeded, a real room may be empty;
  (2) the target user (shy) is the least likely to toggle "I'm open"; (3) five
  binary questions may feel childish to professional audiences.
- **Hard questions:** Why would a shy person declare availability publicly in a
  room? What happens at a 20-person event where 3 people opt in? Who is this
  *not* for? How is this not a dating app with extra steps? What did real users
  say — not your team?
- **Convincing demo:** one genuinely shy test user describing, in their own words,
  a conversation they would not otherwise have had (§12 data, even n=6).
- **Losing demo:** the team demoing to each other — people who have rehearsed the
  conversation the product claims to enable.

### Judge C — Innovation & Impact
- **Strongest:** (1) reframing the category from *matching* (solved, crowded) to
  *the conversation itself* (unsolved, unowned); (2) the exit is designed with the
  same care as the entrance — rare in social products; (3) honest metrics: the
  product can state what would falsify it (§12 pivot signals).
- **Weakest:** (1) moat is near zero (§13); (2) the market that pays (organisers)
  is not the user who benefits (attendees) — the classic two-sided trap;
  (3) impact depends on organiser distribution the team doesn't control.
- **Hard questions:** Why hasn't Brella shipped this? What's your organiser
  acquisition story for event #2? If it works, why won't usage extinguish itself
  (A5)? What is the business — per event, per organiser, per campus? What evidence
  would make *you* kill it?
- **Convincing demo:** the §12 experiment run live at the hackathon itself —
  attendees as subjects, results on the slide, including the numbers that hurt.
- **Losing demo:** TAM slides and loneliness statistics with no behavioural
  evidence from a single real room.

---

## Appendix — conflicts with earlier team decisions, and rulings

1. **5 questions (this prompt) vs 10-question fingerprint (card product).** Ruling:
   both, for different products. The conference/event flow uses 5 + goal (speed is
   survival). The 10-question fingerprint belongs to the card-exchange product
   where users arrive pre-registered. Do not merge them.
2. **"Invite → assigned table" (Leo's chain) vs Option B board (this prompt).**
   Ruling: they are the same flow at different scales. The board is how you find
   who is open; the invitation is the request; the table is the meeting point.
   This document's S3–S5 *is* the chain, implemented minimally.
3. **Prompt timing.** Earlier debate conclusion (registration pre-event) stands
   for organised conferences; the QR-join in this prompt is the hackathon/small-
   event variant where pre-registration doesn't exist. Keep both doors.
4. **Group games (Sort Everyone) and Duo** are untouched by this document; they
   are the small-group product line. This document covers the 1:1 event line.
   The two lines share the card/memory layer and the design laws.
