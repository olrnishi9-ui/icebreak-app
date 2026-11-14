# Critical Evaluation v2 + Engineering Review

*Produced 2026-11-14. Part A runs Leo's short evaluation prompt (founder / PM /
psychologist / judge). Part B is a critical check of my own earlier work — the
Master Evaluation document — against Leo's `Codex_engineers.docx`, which is the
construction instruction he wants followed. Where the two conflict, Part B rules
on it and concedes my errors explicitly.*

---

# Part A — Critical evaluation (short version)

## 1. Challenge the problem

**Is this a genuine problem or an invented one?** Genuine but mis-stated. The
problem is not "people can't find others with shared interests" — at any event,
shared context is abundant (everyone chose to be in that room). The verifiable
problem is narrower: **at the moment of approach, a person cannot tell whether the
other person is open to talking, and cannot see how the conversation could end.**
That is a permission-and-exit problem. Evidence it is real: stranger-talk research
(Epley & Schroeder 2014) shows people systematically overpredict how badly talking
to a stranger will go, and the liking-gap literature shows they underpredict how
much the other person enjoyed it. Evidence it is *not* the whole story: many
non-conversations are rational, not anxious — the expected value of random small
talk is genuinely low, and schedule density (10-minute breaks) makes initiation
pointless regardless of courage.

**Why would socially confident people use this?** Mostly, they wouldn't — and the
pitch should stop pretending otherwise. Their revealed preference is to work the
room directly; an app adds steps to a solved problem. The only honest hooks for
them: (a) finding the *specific* person (goal-directed search beats wandering);
(b) being findable without effort. If the product needs confident users to work,
it is already dead — it needs *enough shy and solo attendees plus an organiser who
mandates the room*, which is a distribution fact, not a product feature.

**What prevents people from simply talking without it?** Three distinct things,
only one of which an app can touch: (1) ambiguity of openness — the app *can*
fix this with an explicit opt-in signal; (2) no graceful exit — the app can fix
this with a time-boxed structure; (3) nothing worth saying after "hi" — the app
can *partially* fix this with grounded material, but cannot manufacture chemistry.
Anything beyond these three (status gaps, language confidence, exhaustion) is
outside the product's reach and should be admitted in the pitch before a judge
finds it.

**Are we confusing wanting friends with willingness to approach strangers?**
Yes — this is the single most likely conceptual error in the whole idea. The
loneliness statistics describe a *stock* problem (not enough close relationships);
approaching strangers is a *flow* behaviour with its own costs, and the two
correlate weakly. Most people resolve loneliness through existing weak ties
(colleagues, classmates, friends-of-friends), not through cold approaches to
strangers. The product therefore does **not** sell "friendship." It sells one
thing: **a lower-cost first conversation in a room the user already chose to be
in.** Teams that pitch the loneliness stock while building a flow tool get torn
apart by judges, correctly.

## 2. Challenge the solution

**Does the app reduce friction, or add steps?** Both — and the accounting matters.
Removed steps: guessing openness, inventing an opener, finding an exit. Added
steps: scan, register, answer questions, browse, request, wait, navigate to a
meeting point. The app only wins if the removed steps were the *binding*
constraint for that user. For a shy solo attendee they are; for everyone else the
app is pure overhead. Design consequence: the added steps must be compressed
brutally (join in under 30 seconds; questions skippable; no account) because
every added second is paid by exactly the users least able to pay it.

**Would shared interests create better conversations?** Shared interests create
*easier starts*, not better conversations. The evidence (Montoya 2008) is about
perceived similarity predicting attraction; the evidence about conversation
quality points at follow-up questions (Huang 2017) and reciprocal disclosure
(Aron 1997) — behaviours, not overlaps. A shared interest that is generic ("we
both like AI") is exhausted in one exchange. So: shared interests are fuel for
minute one only, and the product must supply behaviour structure for minutes
2–10, or it is a question-card deck with a login screen.

**Does the phone make it less natural?** A phone used *unilaterally* does. A phone
used *symmetrically, briefly, and by prior agreement* reads as part of the
activity — the same reason looking at a shared game board isn't rude. The design
variables are: both people have it (symmetry), glances are synchronised and
~3 seconds, and between glances the phone is face-down. Violate any one and the
"less natural" criticism is correct.

**Why this instead of alternatives?** Against a good host: the host can't give
private, per-pair, consent-based structure. Against Brella/Grip: they stop at
scheduling the meeting; this starts where they stop. Against question cards:
cards know nothing true about the two people holding them. Against just talking:
see §1 — for the target user, "just talk" is the thing that isn't happening.
Each answer is real; each is also copyable. See the verdict on moat in §5.

## 3. The 5 biggest failure reasons

1. **Empty room (cold start).** If fewer than ~10–15 people join and stay open,
   there is nobody to discover and the product is a mirror. *Invalidates the
   product if unsolved.* Test/solve: organiser-integrated check-in join
   (QR on the badge/slide), seeded hosts, and measure opt-in rate at one real
   event before writing more code. Kill threshold: <25% opt-in with organiser
   push.
2. **The target user won't declare availability.** The shyest users — the entire
   reason for existing — may experience "I'm open to chat" as exposure. *Can
   invalidate the product.* Test: paper-prototype the toggle at a real mixer;
   count how many self-described shy attendees turn it on. Mitigation if weak:
   availability framed by topic ("open to talk about X") and time-boxed
   ("for the next 15 minutes"), which reads as an offer, not a confession.
3. **Conversations still die after the opener.** If minutes 2–10 have no
   structure, the product delivers a 40-second interaction and an awkward
   parting — worse than no interaction, because it confirms the shy user's
   fear. *Invalidates the differentiation.* Test: the A/B in the long document
   (opener-only vs full arc) with "ease of starting" and "details learned."
4. **It reads as a dating app.** Availability list + profiles + mutual consent is
   dating's skeleton; one screenshot can brand it permanently. *Invalidates
   adoption in professional/educational settings.* Mitigation is structural, not
   cosmetic: event-scoped expiring rooms, goal-first profiles, no photo-led
   browsing, no swiping, group formats visible in the product story.
5. **Nobody pays / organisers don't adopt.** Attendees won't pay for 5 minutes of
   courage; organisers buy measurable outcomes. If the organiser channel fails,
   there is no room, and without rooms there is no product. *Invalidates the
   business, not the demo.* Test: two organiser conversations with a one-page
   pilot offer (counts they can report: opt-ins, conversations started,
   newcomer return-intent). If both say no for structural reasons, pivot to
   being a feature sold into existing event platforms.

## 4. Improve the MVP

**Keep:** QR event join; mutual consent with no visible rejection; grounded
conversation material; optional double-opt-in contact exchange; organiser-created
events with QR + aggregate counts.

**Remove:** accounts/passwords; any public score, ranking or count; in-app chat;
photo-led discovery; free-text anything that is shown to another user before
consent; the single generated starter as the whole Step 4.

**Redesign:**
- *Registration* → progressive: name + goal to enter (<30 s); interests, fun fact,
  "ask me about," help/learn topics are optional and can be added later or
  skipped forever. The rich profile from the engineering spec is good fuel but
  fatal as a gate.
- *Discovery* → an "open now" list (voluntary, expiring in ~15 min), sorted by
  shared goal then shared answers, labelled honestly. A short code connects two
  people who already met.
- *The starter* → a shared four-card arc (prep → expand → deepen → close) on both
  phones, alternating who starts, listener card for the other, phones face-down
  between cards.
- *Rejection* → there is no decline event visible to anyone: requests expire
  silently; a "not interested" on a *recommendation* is private and only reorders
  that user's own list.
- *Waiting participants* → waiting is a designed state, not a void: the request
  screen says what happens and when it silently ends; a user whose request
  expires keeps availability and loses nothing visible.
- *Conversations that continue* → the arc is an offer, not a cage: "keep talking"
  is always available, cards never force-cut, and the closing card can be
  postponed indefinitely by both simply ignoring it.

**Simplest version that delivers genuine value:** one event room, guest join,
goal + 5 skippable taps, open-now list, request/accept/silent-expire, a meeting
point, four grounded cards, double-opt-in card exchange. Everything else is
decoration until the §3 experiments say otherwise.

## 5. Final verdict

- **Worth building for a hackathon? Yes** — because the riskiest assumptions are
  testable live at the hackathon itself, the build is small, and the demo (two
  real phones, real consent, real cards) is intrinsically convincing in a way
  slides are not.
- **Strongest competitive advantage:** not the matching, not the AI — the
  *conversation layer*: consent before approach + shared structure during + a
  private remembered-fact memory after, aimed at small events the big platforms
  ignore. It is an execution advantage, not a moat; say so before a judge does.
- **Single most important assumption to test:** *Will self-described shy
  attendees, at a real event, voluntarily turn on "I'm open to chat" and accept a
  structured first conversation — at a rate that keeps a room alive?* Everything
  else (prompts, models, design) is downstream of that one behaviour.
- **What I would build differently:** I would not start with recommendations at
  all. I would start with the consent signal and the conversation arc, add
  discovery as a plain list, and let recommendation — deterministic first, ML
  only when real feedback data exists — earn its way in. (Part B applies this to
  the engineering spec.)

### Improved MVP — complete user flow

1. Organiser creates an event in the app → gets a QR code + short code + numbered
   meeting points; prints/screens the QR at check-in.
2. Attendee scans → lands in the event room as a guest. Enters display name and
   picks an event goal (find teammates / meet people in my field / explore /
   socialise). Under 30 seconds. Optional profile items (interests, fun fact,
   topics I can help with / want to learn, "ask me about") can be added now or
   later; none are required.
3. Attendee answers 5 short preference questions, each skippable.
4. When ready, attendee toggles **"Open to chat"** (auto-expires in ~15 minutes;
   can be topic-framed). The home screen lists others currently open: name, goal
   line, at most one true shared-answer chip. No scores, no counts, no photos
   first.
5. Attendee taps a person → sends a request (carries the shared reason + a
   duration choice, 5 or 10 min). The other side sees Accept / Later. No response
   = silent expiry; nothing is recorded or shown as a rejection. (Two people who
   already met can connect instantly with a short code instead.)
6. On accept, both phones show the same assigned meeting point (number, photo,
   one-line direction) and a **prep card**: the time box, one true commonality,
   who starts. Both tap "I'm here."
7. Conversation runs on the four-card arc: prep (walk over) → expand (~2:30,
   goals — stated as complementary where different; other phone shows a listener
   card: ask one follow-up) → deepen (~5:30, ask-me-about or an unused true
   difference) → close (~8:00). Phones face-down between cards; both vibrate
   together; every card is skippable; "next card" rescues a stall from unused
   true material only; if material runs out, the app suggests closing honestly.
8. Either person can trigger the same closing card at any time (indistinguishable
   from the timer — the rule is disclosed up front). Closing: each says one
   specific thing they'll remember; each privately picks a next step (exchange
   contact / meet again this event / that's all). A choice is visible to the
   other only if both picked it.
9. Contact cards are exchanged only on double opt-in. Each person can privately
   save one remembered fact about the other (My People list, visible to no one
   else).
10. After the session, an optional one-tap feedback (ease / value / would talk
    again) is stored privately — this is the future training data for any
    recommendation model, collected with consent from day one.
11. Organiser sees aggregate counts only (joined / opened / sessions started)
    and can end the event, which expires the room and all its data.

---

# Part B — Critical check of my own work against `Codex_engineers.docx`

Leo's instruction: the engineering master prompt is how he wants the whole thing
constructed; follow it carefully, and critically check my own work. So here is my
earlier Master Evaluation audited against it — agreements, conflicts with rulings,
and the places where **my document was wrong or incomplete**, conceded plainly.

## B1. Where the engineering spec and my evaluation agree (no action needed)

- **Stack:** Next.js + TypeScript + Tailwind; Supabase PostgreSQL (my doc's one
  architecture change — Supabase over local SQLite for the multi-phone demo — is
  exactly the spec's §4; the original build plan's SQLite stays for local dev).
- **No public scores/rankings/counts** (spec §2D and my design law, word for word).
- **Mutual consent before connection; private decline; no repeated unwanted
  requests** (spec §2E, §6.7 step 3/10; my silent-expiry design is the stricter
  form of the same rule — see B2.4).
- **Grounded generation only:** the spec's LLM rules (no fabricated interests,
  evidence fields, safety status, deterministic fallback) match my "verbatim,
  structured, consented data only" law — provided the constraints in B2.2 hold.
- **Feedback schema** (spec §4 `feedback`: conversation_ease, perceived_value,
  willingness_to_reconnect) is precisely the label set my §12 experiment needs.
  The product and the experiment share one instrument. Good.
- **Organiser interface** (create event, QR, aggregate non-identifying stats, end
  event) — my doc had this as "Should Have"; the spec makes it a required page.
  Ruling: accept the spec — it is ~1 CRUD screen and it is the distribution
  channel, so it earns Must-Have status. **My scoping was wrong to demote it.**

## B2. Conflicts, with rulings

### B2.1 Recommendation engine: spec wants suggestions + explanations; I demoted them
The spec's flow (§1 steps 4–6) makes algorithmic recommendation the centre of
discovery, with an LLM explaining each suggestion. My evaluation chose the
availability board as primary and demoted suggestions to an invisible sort order.
**Ruling: hybrid, sequenced.** The board stays primary for the hackathon MVP
(the cold-start and trust arguments stand — a suggestion engine with zero data
recommends noise and teaches distrust). But the spec's *pipeline shape* is
adopted from day one (eligible set → pairwise features → deterministic ranking →
grounded explanation), run invisibly as the board's sort order, so that when
feedback data exists the same pipeline can surface as visible recommendations
without re-architecture. What I will not do is present Phase-1 deterministic
sorting to users as "AI recommendations." That is a honesty line, not a
technical one.

### B2.2 LLM-generated starters vs my "no AI prompts" exclusion
My Master Evaluation put "AI-generated prompts" in Explicitly Excluded. The spec
§5 requires LLM integration for profile interpretation, explanations, and
starters. **Concession: my exclusion was too broad.** What the design law
actually prohibits is *ungrounded* generation — invented commonalities,
paraphrased profiles, evaluative inferences. The spec's own guardrails
(structured JSON with `evidence_fields` + `safety_status`, validation that
output is grounded in input, deterministic fallback on failure) satisfy the law
if — and only if — three constraints are enforced in the Codex briefs:
(1) the LLM may only reference fields both users approved for sharing;
(2) every generated sentence must cite its evidence fields, and a validator
rejects any output whose cited fields don't support it;
(3) the four-card arc's *structure* stays deterministic (which card, when, who
starts) — the LLM may phrase a card, it may never decide the flow, and the
template fallback must be good enough to demo with the API switched off.
With those, the exclusion is amended to: **no ungrounded generation.**

### B2.3 The neural network and the 1,000-trial requirement — the spec's weakest point, examined honestly
The spec §6 asks for a trainable PyTorch MLP estimating
P(mutually positive interaction), and §6.5 asks for **at least 1,000 recorded
hyperparameter trials**. Credit where due: the spec *also* contains its own
correction — §6.4 states that without real consented labels, supervised learning
cannot be validated, a deterministic baseline must be implemented, synthetic data
is for pipeline testing only, and its accuracy must never be presented as
real-world quality; §6.6 says if the NN doesn't beat the baseline on held-out
real data, deploy the baseline. Those clauses are correct and I adopt them
verbatim as the governing rules.

Applying them honestly to our situation: **we have zero real labeled
interactions.** Therefore:
- What can be built now: the pairwise feature pipeline (§6.2 features are good —
  especially seek/offer complementarity, which my binary-question fuel could not
  express; see B3), the deterministic baseline, the MLP code with forward/
  backward tests, the experiment runner with full trial logging, and a
  **bounded synthetic benchmark** proving the pipeline trains, logs, and
  evaluates end-to-end.
- What must NOT happen: running 1,000 hyperparameter trials against synthetic
  labels and reporting a winner. On synthetic data, the "best" configuration is
  the one that best fits the synthetic generator's assumptions — the search would
  be optimising a fiction, at real compute cost, during a hackathon. The spec
  itself anticipates this: "If 1,000 trials would be wasteful given the available
  data or compute resources, provide a clear technical justification, execute an
  appropriate smaller benchmark, and retain a configurable 1,000-trial runner."
  **This paragraph is that justification.** The runner ships with the 1,000-trial
  configuration intact; the full search is gated on the first real feedback
  dataset (which the product itself collects from day one via the `feedback`
  table). Recommended bounded benchmark: ~40 trials across the spec's grid
  corners, fixed seeds, event-level holdout on synthetic data, reported as
  *pipeline verification*, never as model quality.
- Sequencing consequence for the Codex phases: spec Phase 7 (NN) and Phase 8
  (experiments) come **after** the working product (Phases 3–6) and must never
  block the demo. If time collapses, the NN reduces to: features + baseline +
  training script + runner + benchmark log. A judge who asks "did the neural
  net beat the baseline?" gets the honest answer the spec demands: "On real
  data, unknown — no labels exist yet; here is the pipeline and the gate."

### B2.4 Decline: spec has explicit Decline/Not Interested; I banned visible rejection
Compatible, with one hard line. Declining a *recommendation* (spec §2D) is a
private list-management action — fine, keep it; it should also feed the pair
cool-down. Declining a *connection request* (spec §2E "privately decline") is
fine **only if the requester cannot distinguish decline from expiry** — same
screen, same timing, no status change visible to them. The `connection_requests`
schema needs no `declined` value readable by the sender; store the outcome,
expose "no longer pending." Ruling adopted into the data rules.

### B2.5 Registration weight: spec §2B has ~10 profile fields; I demanded <30 s join
The spec's registration (intention, fun fact, interests, discuss-topics,
help-topics, learn-topics, availability, privacy controls) as a single gate
would reproduce the exact onboarding death the debate rated fatal. **Ruling:
the fields stay, the gate goes.** Name + goal = entry; everything else is
progressive and optional, prompted contextually later ("add a topic you can help
with to get better introductions"). The schema keeps all spec fields; the UX
sequence is what changes. Privacy/sharing controls (spec §2B) move to a
per-field visibility model consistent with the card product's share modes.

### B2.6 Accounts: spec has a `users` table and sessions; I said no accounts
No real conflict. "Users" in the spec is a data entity, not a login requirement.
Implementation: anonymous user rows created at join, session token per spec §3
("User registration and sessions"), Supabase Auth optional later for cross-event
identity. No passwords in the MVP. The spec never actually demands passwords —
checked.

## B3. What my Master Evaluation got wrong or missed (self-check log)

1. **Fuel poverty.** I treated the 5 binary questions as the only conversation
   fuel and concluded overlap is nearly information-free. The spec's profile
   fields (help-topics vs learn-topics) create *complementarity* — a stronger
   and more story-bearing signal than similarity, and the correct material for
   the expand card. My buildArc pseudocode is amended: expand prefers a
   seek/offer pair when one exists. Conceded and fixed.
2. **Organiser demotion.** I scoped the organiser interface as Should-Have; it
   is the distribution channel and belongs in Must-Have (B1). Conceded.
3. **Overbroad AI exclusion.** "No AI-generated prompts" would have banned the
   spec's grounded, validated generation along with the ungrounded kind (B2.2).
   Amended to "no ungrounded generation." Conceded.
4. **Feedback as afterthought.** My doc designed the §12 experiment as an
   external study; the spec builds feedback into the product schema from the
   start, which is strictly better — the experiment and the training-label
   pipeline are the same instrument. Adopted (flow step 10 in Part A §5).
5. **What I stand by (checked, not conceded):** Option B primary over
   recommendation-led discovery for v1 (B2.1 gives the engine its path in);
   four-card arc over a single starter — the spec's §2F icebreaker page (common
   ground + one question + optional alternative) is the *prep card* of the arc,
   not the whole experience; no visible rejection (B2.4); join in <30 s
   (B2.5); scores never shown (both documents agree).

## B4. Construction sequence (spec §10 phases, with the rulings applied)

- **Phase 1 (this document):** feasibility reviewed; smallest functional scope =
  Part A §4's simplest version + organiser event creation (B1).
- **Phase 2:** architecture + schema per spec §3–§4, with B2.4/B2.5 amendments
  (decline invisibility, per-field visibility, anonymous users).
- **Phases 3–4:** frontend/backend + database/RLS, progressive registration.
- **Phase 5:** deterministic recommendation pipeline (spec §6.7 flow, baseline
  ranker, board sort order).
- **Phase 6:** LLM integration under the B2.2 constraints, template fallback
  first-class.
- **Phase 7:** NN pipeline — features, MLP, training script, experiment runner
  (1,000-trial config retained), bounded synthetic benchmark (~40 trials) with
  pipeline-verification reporting only (B2.3).
- **Phase 8:** model selection = baseline, by the spec's own rule, until real
  labels exist.
- **Phases 9–10:** testing per spec §8 (including "never claim a test passed
  unless it was executed") and deployment per §9 (Vercel + Supabase; ML service
  only if inference ever needs it — at MVP the baseline runs in the Next.js
  backend and no Python service is justified; the spec permits this judgement).

**Execution status:** construction is executed by **Codex** (Leo's standing
instruction), supervised by Muse — specs, one task at a time, PR review, local
test runs, fix rounds, every result uploaded to GitHub and verified. Codex
cannot start until Leo enables MFA on his ChatGPT account (the standing
blocker); Phase 1 is complete with this document, and Phase 2 task briefs can be
dispatched the moment the connection exists.
