# AGENTS.md — instructions for Codex working in this repository

You are the engineer on this project. A supervisor (Muse) dispatches one task at a
time, reviews your pull requests, runs tests locally, and sends fix rounds. The
product owner (Leo) approves merges. Work in small, reviewable pull requests —
never rewrite the whole repo in one change.

## Read first (the product spec lives in this repo)

- `Master-Evaluation-MVP-Design.md` — full evaluation, MVP scope, screen specs,
  edge cases, development phases.
- `Critical-Evaluation-v2-and-Engineering-Review.md` — the rulings that amend the
  engineering master prompt (Part B). Where the two documents disagree, Part B wins.
- Leo's engineering master prompt (`Codex_engineers.docx`, held by the supervisor)
  governs construction phases and testing honesty. Its own escape clauses
  (§6.4–§6.6) are binding: no real labels → deterministic baseline ships; synthetic
  data is pipeline-testing only.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS. Prisma + Supabase PostgreSQL with
Row Level Security. Vercel is the deployment target. Polling (3s) instead of
websockets unless a task brief says otherwise. Keep dependencies minimal.

## Product design laws (hard constraints — violating one fails review)

1. **Never display** compatibility scores, percentages, rankings, vote/match counts,
   or popularity metrics anywhere in UI or API responses to clients.
   `recommendations.score_internal` must never leave the server.
2. **Rejection is never visible.** A declined or ignored connection request must be
   indistinguishable from an expired one for the requester — same UI, same timing,
   no status they can read. There is no "declined" state exposed to senders.
3. **Grounded content only.** Conversation cards/prompts may use only structured,
   consented data, presented verbatim. Never fabricate a shared interest, never
   paraphrase a user's profile into an inference ("seems introverted" is banned —
   no code path may generate evaluations of a person).
4. **LLM use (later phases only):** server-side only; structured JSON output with
   `evidence_fields` and `safety_status`; a validator rejects output not supported
   by its cited evidence; a deterministic template fallback must work with the API
   switched off. The LLM never decides visibility, consent, or conversation flow —
   the four-card arc structure (prep → expand → deepen → close, alternating starter,
   listener card) is deterministic.
5. **Progressive registration.** Joining requires display name + event goal only
   (target <30 seconds). All other profile fields (interests, fun fact, help/learn
   topics, ask-me-about) are optional and addable later. Users are anonymous/guest
   rows — no passwords in the MVP.
6. **Event-scoped, expiring data.** Every query is scoped by event + the caller's
   session token. A participant can never read another participant's private
   answers, contact details, internal scores, or feedback — enforce with RLS and
   prove it with a test. Contact details live in a separate table with per-field
   visibility/consent flags and are released only on double opt-in.
7. **Face-to-face first.** No in-app chat/messaging. The app structures a real
   conversation and then gets out of the way (phones face-down between cards).

## Machine-learning rules

- Deterministic recommendation baseline first (goal match → shared answers →
  seek/offer complementarity), implemented as an explainable, unit-tested pure
  function. It is the shipping ranker.
- The PyTorch MLP + experiment runner are built as a pipeline: features per the
  engineering prompt §6.2, full trial logging, the 1,000-trial configuration
  retained — but the full search is **gated on real, consented feedback data**
  (the `feedback` table). Until then, run only a bounded synthetic benchmark
  (~40 trials) and label every output "pipeline verification — synthetic data."
  Never present synthetic metrics as model quality or real-world accuracy.
- Popularity/request counts must never be ranking features.

## Engineering rules

- Validate all API inputs; document the final API contract in the README.
- Secrets only via environment variables (`.env.example` documents them); never
  commit secrets, never store API keys in the database.
- **Testing honesty (owner's rule):** run the tests/build you claim; report actual
  results including failures and unresolved bugs. Never write "tests pass" for
  tests that were not executed.
- Every task report must state: files changed, key decisions, what was run and its
  real result, what failed or is unfinished.
- Do not delete or modify the two evaluation documents or this file unless a task
  brief explicitly says so.
