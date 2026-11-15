# Codex Task 6 (FINAL) — Show Mode — PR #9 Review

**Reviewer:** Muse (supervisor) · **Date:** 2026-11-14 ~23:50 EST
**PR:** #9 "Task 6: Show Mode (hackathon demo entry)" — branch `task6-show-mode`, head e352c9b
**Verdict: MERGE** (zero defects found)

## What was built

- Attendee sign-in is now Show Mode: enter any email label → Supabase Anonymous Auth session → `POST /api/show/entry` stores the label (`users.demo_email_label`, unverified, own-row RLS) → lands on Choose Event (`/join`). No inbox step, no code step.
- `ShowService.join` accepts DEMO26 only; the shared demo data (event, 5 preference + 1 goal questions, Table 1 / Table 2, AI Builders Corner + Research Exchange stations, Alex Morgan / Maya Chen personas checked in and open) is seeded idempotently inside the entry transaction from `prisma/show-seed.sql` statements — no manual seed step on the hosted database.
- Visitor participant is created checked in with a QR token, preset profile (name from the label prefix, role Attendee, goal "Explore something new", interests help=Ideas / learn=People) and the standard ~15-minute availability window.
- The sign-in page copy is honest: "Enter an email label to try MeetMates in show mode" and "Show mode · this email is an unverified profile label. No email will be sent."

## Reviewer verification (run, not quoted)

- Own `npm test` in the warm review clone on the PR branch: **69 pass / 0 fail / 1 skipped** — exactly Codex's reported result (baseline 61 + 8 new).
- Migration `202611150007_show_mode` read line by line: a single additive column (`demo_email_label varchar(254) NOT NULL DEFAULT ''`). No other schema change.
- Seed SQL read in full: fixed demo UUIDs under the `de002600-…` prefix, `ON CONFLICT DO NOTHING` / targeted upserts throughout, personas are `users` rows with `is_guest=true` — no Auth users created. Persona availability refreshes to now+24h on each entry.
- `lib/show-mode.ts` read: `prepare` rejects any body key other than `email`; `join` hard-requires the DEMO26 code; no acceptance is ever faked for personas (requests to them stay pending, per the brief).
- Banned-field scan of the full diff: the only score/rank/count/percent match is a test asserting such keys are ABSENT from payloads. No scores, counts, or rankings introduced.
- Auth boundary: the suite's verifier tests confirm anonymous show sessions are event-scoped with organiser operations blocked, and the email-only verifier for organiser APIs is unchanged.

## Recorded deviation (owner-ordered)

AGENTS.md design law 5 specifies email-code accounts. Show Mode is a deliberate, owner-ordered exception for the HackPrinceton demo (owner decision 2026-11-14 23:28 EST, after the hosted email-template block made code sign-in unusable): the typed email is an unverified display label only, the UI says so, and no real account can be accessed or impersonated through it. The magic-link variant of Task 6 was stopped before any PR, per the same owner decision.

## Hosted rollout (after this merge)

1. Apply migration `202611150007_show_mode` to the hosted Supabase project (SQL Editor).
2. Vercel deploys main automatically.
3. Hosted click-through by the supervisor on the live URL: sign in with a label → Choose Event → DEMO26 → Event Home → Discover persona why-line. This also exercises the seed transaction against real Postgres.
