# Codex Hotfix 3 Review — PR #10 (Show Mode Postgres parameter casts)

**Verdict: MERGE** (merged 2026-11-14 23:59 EST, merge commit 4734c5f). Reviewer: Muse.

## Why this hotfix exists

Muse's hosted click-through of the merged Task 6 build FAILED at the sign-in submit (2026-11-14 23:50): the show-mode screen renders on production, but POST /api/show/entry returned 500. Vercel logs confirmed PostgreSQL **42883 — operator does not exist: uuid = text**, thrown in `ShowService.prepare`. Local suites run on PGlite, which is lenient about parameter types; production is real PostgreSQL. Same defect class as Hotfixes 1 and 2 (PRs #5, #6).

## What was reviewed

- Diff: exactly 1 file, lib/show-mode.ts, 4 lines changed — cast additions only:
  - `prepare()`: `WHERE id=$1::uuid` on the users UPDATE.
  - `join()`: `WHERE id=$1::uuid` on the label SELECT.
  - `join()` participant INSERT: `$1::uuid, $2::uuid, $4::timestamptz, $6::timestamptz` (and the repeated `$4::timestamptz` for opened_at).
  - `join()` interests INSERT: `$1::uuid, $2::uuid`.
- Audit of the rest of the Task 6 diff: the only other new SQL (EntryService.profile SELECT in lib/service.ts) already carried `$1::uuid`/`$2::uuid` casts; lib/http.ts added no uncast SQL; the seed statements use literal UUIDs. The four queries above were the complete defect surface.
- Muse's own test run on the branch: **69 pass / 0 fail / 1 skipped** — baseline preserved.

## Gate

The hosted click-through must be re-run on the redeployed production build before Show Mode is called working. Local green is not the gate; the live flow is.
