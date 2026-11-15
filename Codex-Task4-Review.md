# Codex Task 4 Review — PR #4 "Task 4: deterministic conversation arc, private closing and contact exchange"

- **PR:** https://github.com/olrnishi9-ui/icebreak-app/pull/4 — branch `codex/task4-conversation-arc`, commit `562b31d`, 20 files, +2,110/−14 vs main (`5e022df`). Diff verified to match the PR description exactly.
- **Spec:** `docs/Codex-Task4-Brief.md` (18 acceptance criteria) + `AGENTS.md` (binding; on main before dispatch this time, unlike Task 1).
- **Review depth:** targeted, per the speed playbook — full diff read, tests **executed** (not quoted), the two signature tests read line by line, and an independent payload inspection written and run by the reviewer.
- **Reviewer runs on:** warm clone `~/workspace/icebreak-app-review-task2/` at `562b31d`, working tree clean after review.

## Verdict: MERGE

All 18 acceptance criteria pass at the level this environment can test. My executed counts match Codex's claim exactly, both signature tests are genuine, my own payload inspection is clean, and no defect was found. (If the PR is still marked as a draft, marking it "Ready for review" is the only mechanical step before merge — no code change.)

## What I executed (not quoted)

| Check | Codex claim | My result |
|---|---|---|
| `npm test` | 41 passed, 1 skipped (hosted), 0 failed | **42 tests: 41 pass, 0 fail, 1 skipped** (hosted Supabase test) — identical |
| `npm run typecheck` | passed | **pass** (exit 0) |
| Production build | standalone `next build` passed; stock build blocked on Prisma 403 | **pass, component-wise**: engine-free `prisma generate --no-engine` (exit 0), then `next build` with `NEXT_PUBLIC_SUPABASE_URL=https://task2-test.supabase.co` (exit 0); routes `/`, `/api/[...path]`, `/event/[id]`, `/join`, `/join/[code]`, `/organiser`, `/organiser/[id]` all compiled |
| `npm run test:arc:browser` | passed (~48 s) | **pass** (49.7 s) against the production build |
| `npm run test:connections:browser` (Task 3 regression) | passed | **pass** (39.9 s) |
| `npm run test:browser` (Task 2 smoke regression) | passed | **pass** (19.3 s) |

The stock end-to-end `npm run build` remains unverified only because `binaries.prisma.sh` is unreachable from this machine (HTTP 403) — the same documented environmental block as Tasks 1–3, not a defect in this PR. The hosted Supabase test remains skipped for the same standing reason as Tasks 1–3: `tests/hosted.test.mjs` must still be run against the configured dev project before the demo.

## Signature test 1 — closing indistinguishability: GENUINE

Read line by line in both suites; this is the real thing, at two levels:

- **Payload level** (`tests/arc.test.mjs`): one session is closed by a wrap-up tap at +90 s; both participants' complete arc projections are captured. The session is then reopened via keep-talking, played through all real material, the clock is set to started+240 s (80% of the 5-minute box), and the timed close is accepted. `assert.deepEqual(early, natural)` compares **both participants' full payloads across the two scenarios**. The stored data-layer reason is asserted `either` in scenario (a) and `timer` in scenario (b) — the reasons differ in the database and nowhere else.
- **Rendered level** (`tests/arc.browser.mjs`): the same two scenarios in two real browser contexts; both pages' `.conversation` text is captured after the early wrap-up and again after the timed close, and `assert.deepEqual` compares the rendered closing/S7 UI byte for byte.
- **Why it holds by construction** (code-read): the closing projection normalises position (last card), `skipped: []`, `elapsed: 0`, and card states; no closing actor is stored anywhere — the migration stores only `close_reason ∈ {timer, either}`, and then **revokes blanket SELECT on `sessions` from `authenticated` and re-grants a column list that excludes `close_reason`** (and `resume_position`). The suite proves a participant's `SELECT close_reason FROM sessions` is rejected at the privilege level.

## Signature test 2 — two-session full-flow end-to-end: GENUINE

- **Service level** (`tests/arc.test.mjs`): two independent pairs run join → questionnaire → open → request → accept → identical meeting point and identical arc script on both sides → both arrive → `started` → timed offer at 25% with no force-advance → **simultaneous advance taps from both clients advance exactly one card** → expand roles (requester starter / accepter listener) and deepen roles reversed → restore-by-reread deep-equality → wrap-up → closing for both → mutual next-step outcome only after both Done → feedback writes exactly one row even after a duplicate submit. A separate code-connect test covers the short arc, frozen script, skip persistence, racing wrap-up+advance producing exactly one close, and invalid-input rejections (bad choice, feedback value 6, 501-char note → all 400, no rows written).
- **Browser level** (`tests/arc.browser.mjs`): two pairs in four real browser contexts against the production UI — invite/accept/prep card on both phones, arrivals, wrap-up, keep-talking resume, reload on the deepen card restoring the exact card **and** the listener line, feedback UI, return to a still-paused availability switch, My People — and for the second pair, **every remaining card traversed with all API traffic blocked**, rendering from the downloaded script (criterion 18's offline check, genuinely implemented via the client's local reducer + queued actions).

## My own payload inspection (independent script, 19 captured payloads)

I drove the full flow through the real HTTP handler with trap data seeded: a `private`-visibility contact (`SECRET-DO-NOT-LEAK`), an unconsented ask-me-about topic (`UNCONSENTED-SECRET`), a private note (`NOTE-TEXT-DO-NOT-LEAK`), and a mutual contact. **All 16 checks passed:**

- No key matching score/rank/count/percent/compatib*/closeReason/trigger/feedback-field patterns in any payload; the string `close_reason`/`closeReason` appears in zero payloads.
- The private contact value and the unconsented topic appear in **zero** payloads; the note text appears only in its author's own payloads.
- Contact values are absent from every pre-release payload; after both-Done + both-exchange + both-opt-in, each side receives **exactly** the other's `mutual_connection` fields (the `private` field never moves).
- Before the partner taps Done: outcome `null`, contacts `[]`. An outsider participant's arc read is 404 and their My People list is empty. No raw question IDs appear anywhere.
- The live script payload itself confirms grounding: expand carries the seek/offer topic verbatim (`"Help and learn"`, `TypeScript`); ask-me-about strings appear verbatim.
- `ArcView` top-level keys are exactly the allow-list: `cardsState, contacts, elapsed, note, offered, outcome, own, phase, position, role, script, side, skipped`.

## Code checks

- **buildArc** (`lib/arc.ts`) is a pure function — no clock, randomness, or I/O; determinism asserted in its unit test (two runs deep-equal). Material is shared/differ answers in the documented lightest order (question position, then id); the opener is consumed once and never repeats; every emitted string is a verbatim field or fixed framing copy (asserted against an allow-list in the test, including exclusion of a non-consented topic). **Expand prefers a seek/offer (help∩learn) pair over the goal relation** — the v2 amendment, implemented and tested. Short arc is exactly `[prep(situational), expand(goals), close]` with the honest notice, deep-equal asserted. One-sided ask-me-about falls back to unused verbatim material for the other view (unit-tested).
- **Pacing**: offers are computed from `startedAt` + chosen duration at 25% / 55% / 80% keyed to the next card kind; an offer only sets a flag (plus vibration/visual signal client-side) and never advances — proven at the 74,999 ms / 75,000 ms boundary in the code-connect test.
- **Who starts**: session `user_a_id` is the requester (board flow) or the code enterer (code flow inserts the request with the enterer as sender) — expand starter = side a, deepen reversed, identically in both payloads and in the prep card's framing (accepter's prep carries the "you do not need to prepare an opener" line). Prep card renders in the S5 slot Task 3 reserved, and on the started screen for code-connect sessions.
- **Closing**: one code path and one projection for timed, exhaustion, and person-triggered closes; close is idempotent and race-safe under the event transaction lock + positional compare-and-set (simultaneous wrap-up/advance → exactly one close, one interactions row).
- **Exchange**: release requires both Done **and** both chose `exchange` **and** both opted in; per-field, owner-side `visibility='mutual_connection' AND share_consent` only. One-sided or differing choices produce the identical `outcome: null` end state for both — there is no payload state for "partner chose differently."
- **Feedback**: rates the conversation format in copy and field semantics (`conversation_ease`, `perceived_value`, `willingness_to_reconnect`), requires closed + own Done, first submission wins, values validated (1–5 / boolean). Write-only in fact, not just in claim: the migration **drops the feedback SELECT policy**, and the suite proves even the author reads zero feedback rows at the data layer; the partner's full response object is deep-equal before and after a submission (existence does not leak).
- **Notes**: author-only at API and RLS level (`session_notes` own-row SELECT policy, no browser write grants); edit/delete verified; skipping leaves a valid note-less S8 entry.
- **Post-close state**: both participants set `unavailable` (availability **not** auto-restored — verified in DB and in the browser, where the toggle reads off after finishing), un-muted for new requests, meeting point released (session closed; Task 3 assignment counts only live sessions), pair history recorded in `interactions` and the open-now sort now places previously-met people **last** (asserted in the suite).
- **No LLM**: zero LLM/AI calls anywhere in the diff (grep-verified); no "match"/"recommended for you" copy in the new UI; no in-app chat. AGENTS.md laws 1–7 all hold.
- **Task 3 not broken**: full `npm test` (which includes the Task 3 integration suite) and both earlier browser suites pass. The one Task 3 test change is an RLS assertion narrowed from `SELECT *` to the permitted column list, with an explanatory comment — required because Task 4 deliberately makes `SELECT *` fail once the private reason column exists; the assertion's intent (participants read their session, outsiders read none) is preserved and still enforced.
- **Withdrawn red-team material**: absent. The only "queue" in the diff is the client's offline action queue; there is no pair-me/queue mode or any other element of the withdrawn adjudication.
- **Hygiene**: new migration is additive only (no edits to applied migrations); `Master-Evaluation-MVP-Design.md`, `Critical-Evaluation-v2-and-Engineering-Review.md`, and `AGENTS.md` untouched; README documents the final API contract for every new route, the `POST /api/icebreaker` → deterministic arc adaptation, and `POST /api/feedback`.

## Scope honesty

- **S8 My People: present and minimal**, as briefed — partner name, event name, own note (view/edit/delete), mutual-exchange flag and released fields; no counts or metrics anywhere.
- Delivered as specified: prep card in the S5 slot, S6 (with phones-down state, offered state, exhaustion state), S7 (choosing-nothing is a complete ending), S3 re-open prompt (availability stays off; the section heading now reads "open again when ready" and re-opening is an explicit tap).
- Correctly absent (brief's Scope out): organiser aggregates, end/archive-event flow, LLM, NN — the feedback collected here is the label pipeline's input, nothing more.

## Non-blocking notes

1. **Stale README line**: the Task 3-era section still lists `/api/icebreaker` and `/api/feedback` as "not implemented." The Task 4 section supersedes it with the explicit adaptation notes, so the contract is unambiguous — a one-line tidy for a later docs pass, not a merge blocker.
2. **Event-end outcome reveal**: the brief's S7 text mentions outcomes are revealed "when both have tapped Done, **or when the event ends**, whichever comes first." No event-end reveal path is implemented — a partner who never taps Done leaves the outcome unrevealed. No acceptance criterion tests this, and the failure mode is privacy-safe (nothing leaks); flagging for a future task if the team wants it.
3. **Spare-card offers**: the offer flag for a following spare card uses threshold 0 (offered immediately). Consistent with "next card is always available"; the brief's timed offers (expand/deepen/close at 25/55/80) are exact.
4. **Standing hosted gate (unchanged from Tasks 1–3)**: hosted Supabase behaviour (real Anonymous Auth, hosted RLS, two real devices) remains unverified. `tests/hosted.test.mjs` must run against the configured dev project before the demo.

## Bottom line

Task 4 completes the codebase for the full 11-step flow (Tasks 1–4). The implementation is unusually disciplined about the two properties this product lives or dies on — the closing trigger is unattributable by construction (not merely hidden in the UI), and contact/feedback/notes privacy is enforced at the database privilege level, not just in API responses. **MERGE.**
