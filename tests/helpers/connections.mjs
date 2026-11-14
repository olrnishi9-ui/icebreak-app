import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { handler } from "../../lib/http.ts";
import { EntryService } from "../../lib/service.ts";
export const authId = (n) =>
  `31000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export async function fixture() {
  const pg = new PGlite();
  await pg.exec(
    `CREATE ROLE anon;CREATE ROLE authenticated;ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth,public TO authenticated,anon;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;`,
  );
  for (const d of (
    await readdir(new URL("../../prisma/migrations/", import.meta.url))
  )
    .filter((d) => /^\d/.test(d))
    .sort())
    await pg.exec(
      await readFile(
        new URL(`../../prisma/migrations/${d}/migration.sql`, import.meta.url),
        "utf8",
      ),
    );
  const adapter = (tx) => ({
    query: async (sql, params = []) => (await tx.query(sql, params)).rows,
    transaction: (fn) => fn(adapter(tx)),
  });
  const db = {
    ...adapter(pg),
    transaction: (fn) => pg.transaction((tx) => fn(adapter(tx))),
  };
  let now = Date.now();
  const run = handler(
    db,
    async (token) =>
      /^\d+$/.test(token) && +token <= 12 ? authId(+token) : null,
    () => now,
  );
  const call = async (method, path, body, who = "1") => {
    const r = await run(
      new Request(`http://localhost/api/${path}`, {
        method,
        headers: who ? { Authorization: `Bearer ${who}` } : {},
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      path.split("?")[0].split("/"),
    );
    return { status: r.status, data: await r.json() };
  };
  for (let n = 1; n <= 12; n++)
    await db.query("INSERT INTO auth.users VALUES($1)", [authId(n)]);
  const invite = (await call("POST", "events", { name: "Task 3 room" })).data;
  const event = invite.event.id;
  const members = [];
  for (let n = 1; n <= 10; n++) {
    await call(
      "POST",
      "events/join",
      {
        code: invite.joinCode,
        displayName: `Person ${n}`,
        goal: n === 3 ? "Just socialize" : "Find teammates",
      },
      String(n),
    );
    await call(
      "PUT",
      `events/${event}/availability`,
      { open: true },
      String(n),
    );
    members.push(
      (await db.query("SELECT id FROM users WHERE auth_id=$1", [authId(n)]))[0]
        .id,
    );
  }
  const qs = await new EntryService(db).questions(event);
  for (const n of [1, 2])
    await call(
      "POST",
      "questionnaire",
      {
        eventId: event,
        complete: false,
        answers: [{ questionId: qs[0].id, choice: 0, skipped: false }],
      },
      String(n),
    );
  const points = [
    {
      label: "Point 1",
      photoUrl: "https://example.org/point1.jpg",
      direction: "Beside the entrance.",
    },
    {
      label: "Point 2",
      photoUrl: "https://example.org/point2.jpg",
      direction: "By the blue sign.",
    },
  ];
  await call("PUT", `events/${event}/meeting-points`, {
    meetingPoints: points,
  });
  const state = (who = "1") =>
    call("GET", `connections?eventId=${event}`, undefined, who);
  const send = (who = "1", target = members[1], duration = 5) =>
    call(
      "POST",
      "connections",
      { eventId: event, participant: target, duration },
      who,
    );
  const respond = (id, action, who = "2") =>
    call("PATCH", `connections/${id}`, { eventId: event, action }, who);
  const session = (id, action, who = "1") =>
    call("POST", `sessions/${id}/${action}`, { eventId: event }, who);
  async function reset() {
    await db.query("DELETE FROM connection_requests WHERE event_id=$1", [
      event,
    ]);
    await db.query("DELETE FROM blocks WHERE event_id=$1", [event]);
    await db.query("DELETE FROM reports WHERE event_id=$1", [event]);
    await db.query(
      `UPDATE event_participants SET availability_status='open',available_until=$2,opened_at=$3 WHERE event_id=$1`,
      [
        event,
        new Date(now + 7200000).toISOString(),
        new Date(now).toISOString(),
      ],
    );
  }
  async function asUser(n, fn) {
    await pg.exec("BEGIN;SET LOCAL ROLE authenticated;");
    try {
      await pg.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [
        authId(n),
      ]);
      return await fn();
    } finally {
      await pg.exec("ROLLBACK");
    }
  }
  return {
    pg,
    db,
    call,
    event,
    members,
    qs,
    points,
    state,
    send,
    respond,
    session,
    reset,
    asUser,
    get now() {
      return now;
    },
    set now(v) {
      now = v;
    },
  };
}
