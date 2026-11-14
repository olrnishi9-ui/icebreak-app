# Codex Task 1 — PR Review (PR #1, branch `work`, commit 8c31759)

*Reviewed by Muse, 2026-11-14. Method: cloned the PR branch, read every file,
ran the install, the test suite, the typecheck, and the build in this
environment. Every result below was executed, not inferred.*

## Verdict: MERGE

No code changes required. Three coordination notes for Task 2 are listed at the
end — none of them blocks this merge. Leo holds merge approval as always.

## What was delivered vs the Task 1 brief

| Brief requirement | Result |
|---|---|
| Next.js App Router + TypeScript + Tailwind scaffold in repo root | ✅ Next 16.4.6, React 19, Tailwind 4, strict TS |
| Prisma schema AND executable SQL migrations with RLS | ✅ Both; SQL is authoritative for RLS/checks/triggers, schema mirrors the tables |
| users (anonymous/guest, no password) | ✅ `is_guest` default true, optional `auth_id` → Supabase Auth; no password column anywhere |
| events (event_code, status, organizer_id) | ✅ Code format CHECK `^[A-Z0-9]{4,16}$` |
| event_participants (availability_status) | ✅ Enum + `available_until` (supports the ~15-min expiry) |
| questions, answers | ✅ Preference questions constrained to exactly 2 options; answers constrained to valid option indexes by CHECK + trigger; skips are explicit rows |
| user_interests (interest/discuss/help/learn/ask_me_about) | ✅ All five types + `share_consent` flag |
| connection_requests (decline never visible to sender) | ✅ See Law 2 below — the strongest part of this PR |
| recommendations (score_internal only) | ✅ See Law 1 below |
| interactions, feedback (ease / value / willingness_to_reconnect) | ✅ Feedback ranges CHECKed 1–5; trigger enforces the author was a party to the interaction |
| Contact details in a SEPARATE table, per-field visibility/consent | ✅ `user_contacts`: one row per field, `visibility` + `share_consent` + `consented_at`; DB CHECKs make non-private visibility impossible without consent, and consent impossible without a timestamp |
| Seed: 1 demo event, 6 participants, 5 preference + 1 goal question | ✅ Event `HELLO26`, six fictional guests, 5 binary preference questions + 1 four-option goal question, 36 answers incl. explicit skips; seed is idempotent and gated behind `ALLOW_DEMO_SEED=true` |
| Placeholder home page (name + Join Event + event-code input) | ✅ Renders only; `/join` is an honest placeholder that states nothing was saved |
| `.env.example`, no real secrets | ✅ Placeholders only; secret scan of the branch came back clean; `.gitignore` covers `.env*` with an `.env.example` exception |
| Original docs untouched | ✅ Diff vs merge-base: 20 files, all additions. Root README and both evaluation documents unmodified |

## AGENTS.md compliance, law by law

1. **No scores/rankings/counts to clients** — PASS. `recommendations` has RLS
   enabled and *no SELECT grant at all* for `anon`/`authenticated`; the test
   suite proves a participant's `SELECT score_internal` is permission-denied.
   No popularity/count field exists anywhere in the schema. No API routes exist
   yet, so nothing else can leak.
2. **Rejection never visible** — PASS, and designed properly. The shared
   `connection_requests` row only ever holds `pending`/`accepted`; a decline is
   written to a separate `connection_request_decisions` table readable **only by
   the recipient** (RLS policy `recipient_id = current_user`). The migration
   carries an explicit comment forbidding changing the shared row or its expiry
   on decline. The test asserts the sender's view of the request is byte-identical
   (deep-equal) before and after a decline, and that the sender sees zero
   decision rows.
3. **Grounded content only** — PASS (nothing to ground yet). No LLM code, no
   generated copy about people; seed interests are short fictional topics.
4. **LLM rules** — N/A for Task 1; no LLM/ML code added, as briefed.
5. **Progressive registration / no passwords** — PASS at the data layer (guest
   rows, no password column). UI join is Task 2.
6. **Event-scoped data + RLS proven by test** — PASS. All 12 public tables have
   RLS enabled *and* forced; browser roles get SELECT-only, own-rows-only
   policies; there are **no browser mutation grants at all** (writes are reserved
   for future authorised server endpoints). The PGlite test suite executes the
   real migration + seed (twice) and proves: own-rows-only visibility for
   answers/contacts/interests/feedback, cross-event answer rejection, forgery
   attempts (membership, identity, acceptance, consent) all permission-denied,
   and `anon` denied outright.
7. **No in-app chat** — PASS. No messaging tables or UI.

Engineering rules: inputs are constrained at the DB layer (checks/triggers);
secrets via env only; **testing honesty — exemplary**: `docs/VALIDATION.md`
reports Codex's own failures (sandbox build blocked at Prisma's engine
download, HTTP 403; hosted Supabase not integration-tested; browser smoke not
executed) instead of papering over them, and its claims reproduced exactly in
my environment (see below).

## Build & test results (executed here, 2026-11-14)

- `npm install` — **fails in this VM** at the `@prisma/engines` postinstall:
  `Error: aborted … code: 'ECONNRESET'` while downloading Prisma's native
  engine binaries (binaries.prisma.sh unreachable from this sandbox — Codex's
  sandbox got HTTP 403 from the same host). Retried three times; fell back to
  `npm install --ignore-scripts`, which installed cleanly.
- `npm test` — **PASS, 7/7** (1 parent + 6 subtests, PGlite running the actual
  migration and seed): seed shape, per-participant RLS visibility,
  recommendations unreadable, decline invisibility, forgery rejection,
  constraint/cross-event rejection.
- `npx prisma generate` (stock) — fails, same ECONNRESET engine download.
- Engine-free generation (the workaround documented in Codex's VALIDATION.md:
  `prisma generate --no-engine` with dummy engine paths) — succeeds.
- `npm run typecheck` — **PASS** after generation (before generation it fails
  only on `prisma/seed.ts`: ungenerated client, an environment artefact, not a
  code error).
- `npx next build` — **PASS** after generation: compiled successfully, `/`,
  `/join`, `/_not-found` statically generated. Before generation it compiles
  and fails only at the same seed.ts type step.
- `npm run build` (stock, = `prisma generate && next build`) — cannot complete
  in this environment because its first step needs the blocked download.

**Conclusion on the build:** every component of the build passes once the
Prisma client is generated; the single failing step is a network block on
Prisma's binary CDN that reproduced in two independent sandboxes (403 for
Codex, connection-reset here). On a normal network (Leo's machine, Vercel) the
stock commands should run as written — but that exact claim is verified only
component-wise, not end-to-end, and this review does not pretend otherwise.

## Coordination notes for Task 2 (not merge blockers)

1. **Session model conflict — decide before Task 2 dispatch.** Task 1 keys all
   RLS to Supabase Auth (`auth.uid()` → `users.auth_id`) and its setup README
   prescribes **Supabase Anonymous Auth** for guests (signed JWTs, `authenticated`
   role), explicitly warning against a shared `anon` identity. The Task 2 brief
   draft instead designs custom token-hash sessions. Reviewer's recommendation:
   **adopt Supabase anonymous auth and amend the Task 2 brief** — the RLS and
   its proofs already assume it, it is the platform-native path, and the brief
   was written before Task 1 existed. Parent/Leo decision.
2. **Branch staleness.** `work` was branched from main before AGENTS.md and the
   research briefs were uploaded, so Codex worked from the task brief alone —
   which its VALIDATION.md discloses honestly ("No AGENTS.md was present").
   Merging this PR into main is safe (pure additions, no overlaps). Task 2
   should branch from the updated main so AGENTS.md is in Codex's tree.
3. **Trivial:** seed participants are named Ari/Bo/Casey/Dev/Ellis/Fran rather
   than the build plan's Maya/Ken/June/Ryo/Ana. The Task 1 brief only required
   six fictional participants; rename in a later seed polish only if the demo
   script wants the old names.

## Fix list

None required for merge. The three notes above are Task 2 dispatch inputs.
