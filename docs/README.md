# Icebreak development setup

The root README and both evaluation documents are preserved verbatim. This README contains the application setup section.

## Install and run

Use Node.js 20.9 or later (Node 24 LTS recommended).

```sh
npm ci
cp .env.example .env
# Replace database placeholders with a development Supabase project's URLs.
npm run db:generate
npm run db:migrate
ALLOW_DEMO_SEED=true npm run db:seed
npm run dev
```

Open http://localhost:3000. Enter any event code to navigate to the joining placeholder; no authentication, database query, or membership creation is wired to the page. The fictional demo event code is `HELLO26`.

`DATABASE_URL` is the server-only Prisma connection (Supabase transaction pooler with `pgbouncer=true` where appropriate). `DIRECT_URL` must use a direct or session-mode connection for migrations and seeding. On IPv4-only networks use Supabase's session pooler instead of its IPv6 direct hostname. Never expose either database URL through `NEXT_PUBLIC_*`. The public Supabase URL/anon key are reserved for subsequent guest-auth work and are not required to render this scaffold. No service-role key is needed here.

Enable anonymous sign-ins in Supabase Auth when implementing joining. Anonymous Auth users get signed JWTs and the `authenticated` database role; the unauthenticated `anon` role must not be used as a shared guest identity. A future authorized backend creates `users.auth_id` from the verified JWT subject, without a password. Demo users deliberately have null Auth bindings and cannot sign in.

## Migrations and seed

`npm run db:migrate` applies the checked-in SQL migration using Prisma. SQL is authoritative for RLS, checks, triggers and the cross-schema `auth.users` foreign key; Prisma represents application tables and their relations. Do not use `prisma db push` or regenerate this migration from only the Prisma schema: those operations do not preserve the security layer. Apply migrations as the Supabase database administrator. Supabase supplies `auth.users`, `auth.uid()`, `anon`, and `authenticated`; generic PostgreSQL needs that infrastructure first.

Alternatively apply `prisma/migrations/202611140001_foundation/migration.sql` with `psql "$DIRECT_URL" -v ON_ERROR_STOP=1 --single-transaction -f prisma/migrations/202611140001_foundation/migration.sql` to a fresh Supabase database. Choose one migration mechanism; manual execution is not recorded in Prisma migration history.

The demo-only seed is transactional and repeatable, preserves existing rows, and requires `ALLOW_DEMO_SEED=true`. It creates one event, six participants, thirty interest entries spanning all five types, five two-option preference questions and one four-option event-goal question, plus example answers. Skip is represented by `skipped=true` and a null option index, rather than a third preference option. All questions support skipping. No contact data, feedback, or internal scores are seeded. Profiles and availability default to private/unavailable.

## Data boundaries

- Each contact field is a separate `user_contacts` row, with its own visibility, consent and consent timestamp. Even a consented field stays owner-only under current RLS. A subsequent contact-exchange endpoint must verify mutual consent before sharing a selected field.
- All twelve tables have enabled and forced RLS. Browser roles have no write privileges. Authenticated guests can read their own profile, membership, answers, interests, contacts and feedback, their event/questions, and requests/interactions they belong to. There is no discovery/profile-sharing API in Task 1. Organizers receive no access to other participants' private material.
- All writes are deferred to authorized server endpoints. A server database connection may bypass RLS; keep Prisma server-only and verify JWT identity, event membership and consent before every later endpoint. Do not serialize raw Prisma objects into responses.
- `recommendations.score_internal` is server-only: neither browser role has table access and there is no client policy, view, API, rank, or public score.
- `connection_requests.status` has only `pending` and `accepted`. A decline is stored solely in `connection_request_decisions`, readable only by the recipient. On decline, the shared request row, original expiration, and timestamps must remain identical. Sender display will derive expiry from the original deadline, never from the private decision. There is no decline timestamp or declined status on the shared row. Future request writes must prevent retries that probe private decisions; none are enabled yet.
- Event-participant composite foreign keys prevent cross-event answers, requests, recommendations and interactions. Answer checks enforce valid options/skips. Feedback is constrained to interaction members, ease/value use 1–5, and reconnect willingness is boolean.
- Do not add sensitive tables to Supabase Realtime publications, expose GraphQL/admin connections, or grant client mutation rights without reviewing these boundaries. Event retention/cleanup and consented sharing remain future work.

## Checks

```sh
npm test
npm run db:generate
npm run typecheck
npm run build
npm start
```

The test suite executes the actual migration and seed twice in PGlite (embedded PostgreSQL), with Supabase Auth infrastructure mocked and real non-superuser database roles. It verifies RLS reads, client write denial, private decline invariance, internal score denial, seed contents and constraints. It requires neither Supabase credentials nor Docker. It is not an integration test of hosted Supabase Auth, Realtime or the Prisma seed transport.

For a browser smoke check, confirm the home page has a labeled event-code input, keyboard-visible focus, a Join Event button and a `/join?code=...` destination explaining that no event was joined. Check at mobile width as well. See `docs/VALIDATION.md` for executed results and limitations.
