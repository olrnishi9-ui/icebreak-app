# Codex Hotfix Brief — UUID parameter casts + API error logging

## Confirmed root cause (verified 2026-11-14, production)

Production (Vercel + hosted Supabase) returns 500 on POST /api/events,
POST /api/events/join, GET /api/events/:code/questions — while
GET /api/events/:code returns 200. Verified in the Supabase SQL Editor:

```
SELECT count(*) FROM questions WHERE event_id = '...'::text;
→ ERROR 42883: operator does not exist: uuid = text
```

The data layer (lib/database.ts) uses Prisma `$queryRawUnsafe`, which binds
JavaScript string parameters as **text**. Any raw query that compares a uuid
column to an uncast parameter (`WHERE event_id=$1`) therefore fails on real
PostgreSQL. The local suites never caught this because they run the services
against a PGlite-backed test adapter whose parameter binding is lenient — the
Prisma path itself was never exercised against real Postgres until production.
The one production query that works, `EntryService.event()`, survives only
because it casts the column (`id::text=$1`).

## Fix 1 — systematic UUID/enum casts (the actual bug)

Audit **every** raw SQL string passed to `db.query` / `$queryRawUnsafe` in
`lib/` (service.ts, connection-service.ts, arc-service.ts, and any other file
that builds SQL). For each parameter:

- Compared against, joined on, or filtered by a **uuid column** → cast the
  parameter: `$n::uuid`.
- Inserted into a uuid column → also cast explicitly (`$n::uuid`) for
  uniformity; do not rely on assignment-cast behaviour.
- Enum parameters → cast to the enum type (the existing pattern in
  `EntryService.create`, `$2::"QuestionKind"`, is the model).
- Parameters compared to text columns, or compared against an expression that
  is already text (e.g. `id::text=$1`), stay uncast.
- Do NOT change which rows any query returns, any column list, or any business
  logic. This is a typing fix only.

The PR must include an **audit table**: every query site changed (file +
function), the parameter, and the cast applied — plus a list of sites reviewed
and deliberately left uncast, with the reason.

## Fix 2 — log the real error (diagnosability)

In `lib/http.ts`, the catch-all currently logs only the string
`"Entry API operation failed"` and discards the exception. Change it to log
the caught error itself (message and stack) via `console.error`, while the
client response stays byte-identical: status 500 with
`{"error":"Could not complete this action. Please try again."}`.
Check for the same swallow-and-log-string pattern in any other handler file
and fix it the same way if present.

## Constraints

- AGENTS.md binds in full (design laws, testing honesty, no scope creep).
- No API contract changes, no payload changes, no schema/migration changes.
- All existing tests must pass with the same counts as the Task 4 baseline
  (41 pass / 1 skipped hosted). If a test asserts the old log behaviour, update
  it and say so.
- State honestly in the PR what local tests can and cannot prove: the PGlite
  suites cannot reproduce this bug; the verification gate is the hosted test
  against the deployed app after merge, which the supervisor will run.

## Deliverables

- New branch from current main, one PR, title:
  "Hotfix: cast uuid parameters in raw SQL and log real API errors".
- PR body: the audit table, files changed, tests actually run with results,
  and the honest verification note above.
