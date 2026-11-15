# Codex Hotfix 2 Brief — Timestamp casts + prepared-statement collisions

## What the production logs now prove (2026-11-14, deployment dpl_EuTZ49iSZgfxBW2UcVvnK43RU4kz)

The Hotfix 1 logging repair worked: the new build logs real errors. Two
different failures remain on POST /api/events, both from
`prisma.$queryRawUnsafe()` (client 6.19.3):

**Error A — 42804 (8:31 PM EST):**
`ERROR: column "ends_at" is of type timestamp with time zone but expression
is of type text ... HINT: You will need to rewrite or cast the expression.`

**Error B — 42P05 (8:32 PM EST):**
`ERROR: prepared statement "s0" already exists`
thrown at `P.user` — the first query of the create transaction.

The uuid casts from Hotfix 1 were correct and are NOT the remaining problem.
Do not touch them.

## Fix A — cast every timestamp parameter (code change, this task)

The same typing gap as Hotfix 1, for a different column type: Prisma binds
JavaScript string parameters as text, and real PostgreSQL refuses a text
parameter into a timestamptz column in a prepared statement.

Audit **every** raw SQL string in `lib/` (service.ts, connection-service.ts,
arc-service.ts, and any other file that builds SQL). For each parameter that
feeds a **timestamptz column**, cast it: `$n::timestamptz`. Known sites
include (verify each against the schema — do not trust this list alone):

- `events.ends_at` in `EntryService.create` (`$4` in the INSERT)
- `event_participants.available_until` / `opened_at` in setAvailability
  (and the re-open UPDATE in connection-service)
- `connection_requests.expires_at` / `created_at` in the INSERT
- `sessions.started_at` / `ended_at` / `closed_at` wherever a parameter
  supplies them (`UPDATE sessions SET closed_at=$3`, `started_at=COALESCE
  (started_at,$3)`, the interactions INSERT `$5,$6`)
- `session_choices` / `feedback` / `interactions` timestamps if any are
  parameter-supplied

Also re-audit for **any other uncast typed column** the Hotfix 1 pass may
have missed (the same class of error for any non-text column type). Text,
boolean, integer, jsonb (already cast) and enum (already cast) parameters
stay as they are.

The PR must include an **audit table**: every query site changed (file +
function + column), the parameter, and the cast applied — plus sites
reviewed and deliberately left uncast, with the reason.

## Fix B — prepared-statement collisions (config change, NOT this task)

Error B is the documented Prisma + PgBouncer transaction-mode symptom:
Prisma prepares named statements ("s0", "s1"...) on a pooled connection and
the name collides when the connection is reused. The supervisor is fixing
this separately in Vercel by appending `?pgbouncer=true` to `DATABASE_URL`
(Production + Preview). **Do not change the connection string, the Prisma
client setup, or the transaction code in this task.** Your change is the
timestamp casts only. If, while auditing, you find the codebase itself
forces prepared statements on (e.g. a driver-adapter option), flag it in
the PR instead of changing it.

## Constraints

- AGENTS.md binds in full. No API contract, payload, schema, or business-logic
  changes. No migration changes.
- All existing tests must pass with the same counts as the Task 4 baseline
  (41 pass / 1 skipped hosted). State honestly in the PR that the PGlite
  suites cannot reproduce either production error; the verification gate is
  the hosted test against the deployed app after merge.
- One branch from current main, one PR, title:
  "Hotfix 2: cast timestamptz parameters in raw SQL".

## Deliverables

- PR with the audit table, files changed, tests actually run with results,
  and the honest verification note above.
