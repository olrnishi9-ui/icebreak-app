import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("additive migration preserves already-seeded Task 1 data and backfills event names/goals", async (t) => {
  const pg = new PGlite();
  t.after(() => pg.close());
  await pg.exec(
    `CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
  );
  await pg.exec(
    await readFile(
      new URL(
        "../prisma/migrations/202611140001_foundation/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const seed = await readFile(
    new URL("../prisma/seed.sql", import.meta.url),
    "utf8",
  );
  const oldSeed = seed.replace(
    /INSERT INTO event_participants\(event_id,user_id,display_name,goal\) VALUES \('([^']+)','([^']+)','[^']+','[^']+'\)/g,
    "INSERT INTO event_participants(event_id,user_id) VALUES ('$1','$2')",
  );
  await pg.exec(oldSeed);
  const before = (
    await pg.query("SELECT * FROM answers ORDER BY user_id,question_id")
  ).rows;
  await pg.exec(
    await readFile(
      new URL(
        "../prisma/migrations/202611140002_entry_flow/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.deepEqual(
    (await pg.query("SELECT * FROM answers ORDER BY user_id,question_id")).rows,
    before,
  );
  const participants = (
    await pg.query(
      "SELECT display_name,goal,field_visible,fun_fact_visible,available_until FROM event_participants ORDER BY user_id",
    )
  ).rows;
  assert.deepEqual(
    participants.map((p) => p.display_name),
    ["Ari", "Bo", "Casey", "Dev", "Ellis", "Fran"],
  );
  assert.deepEqual(
    participants.map((p) => p.goal),
    [
      "Explore something new",
      "Just socialize",
      "Find teammates",
      "Meet people in my field",
      "Explore something new",
      "Just socialize",
    ],
  );
  assert.ok(
    participants.every(
      (p) => !p.field_visible && !p.fun_fact_visible && !p.available_until,
    ),
  );
  await pg.exec(seed);
  assert.equal(
    (await pg.query("SELECT * FROM event_participants")).rows.length,
    6,
  );
});
