import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { handler } from "../lib/http.ts";
import { EntryService } from "../lib/service.ts";
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("Task 2 routes + PostgreSQL integration (Auth verifier substituted, actual RLS)", async (t) => {
  const pg = new PGlite();
  t.after(() => pg.close());
  await pg.exec(
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth,public TO anon,authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;`,
  );
  for (const dir of (
    await readdir(new URL("../prisma/migrations/", import.meta.url))
  )
    .filter((d) => /^\d/.test(d))
    .sort())
    await pg.exec(
      await readFile(
        new URL(`../prisma/migrations/${dir}/migration.sql`, import.meta.url),
        "utf8",
      ),
    );
  await pg.exec(
    await readFile(new URL("../prisma/seed.sql", import.meta.url), "utf8"),
  );
  for (let n = 1; n <= 3; n++)
    await pg.query("INSERT INTO auth.users VALUES ($1)", [id(n)]);
  const db = {
    query: async (sql, values = []) => (await pg.query(sql, values)).rows,
    transaction: (fn) =>
      pg.transaction((tx) =>
        fn({
          query: async (sql, values = []) => (await tx.query(sql, values)).rows,
          transaction: (fn) => fn(db),
        }),
      ),
  };
  const run = handler(db, async (token) =>
    ["1", "2", "3"].includes(token) ? id(Number(token)) : null,
  );
  async function call(method, path, body, session = "1") {
    const response = await run(
      new Request(`http://localhost/api/${path}`, {
        method,
        headers: { ...(session ? { Authorization: `Bearer ${session}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      path.split("?")[0].split("/"),
    );
    return { status: response.status, data: await response.json() };
  }
  let invite, event, qs, A, B;
  await t.test(
    "create unique event codes, question bank and decode QR to exact join URL",
    async () => {
      const r = await call("POST", "events", { name: "A friendly room" });
      assert.equal(r.status, 201);
      invite = r.data;
      event = invite.event.id;
      assert.notEqual(
        (await call("POST", "events", { name: "Another room" })).data.joinCode,
        invite.joinCode,
      );
      assert.deepEqual(
        Object.keys(
          (await call("GET", `events/${invite.joinCode}`)).data,
        ).sort(),
        ["active", "id", "name", "status"],
      );
      qs = (await call("GET", `events/${invite.joinCode}/questions`)).data;
      assert.equal(qs.length, 6);
      assert.equal(qs.filter((q) => q.kind === "preference").length, 5);
      // Use the same QR encoder/options as the organiser view, rasterize its modules,
      // then independently decode the pixels rather than inspect the URL string.
      const qr = QRCode.create(invite.joinUrl, { errorCorrectionLevel: "M" }),
        scale = 8,
        size = (qr.modules.size + 8) * scale;
      const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
      for (let y = 0; y < qr.modules.size; y++)
        for (let x = 0; x < qr.modules.size; x++)
          if (qr.modules.get(y, x))
            for (let dy = 0; dy < scale; dy++)
              for (let dx = 0; dx < scale; dx++) {
                const k =
                  (((y + 4) * scale + dy) * size + (x + 4) * scale + dx) * 4;
                pixels[k] = pixels[k + 1] = pixels[k + 2] = 0;
              }
      assert.equal(jsQR(pixels, size, size)?.data, invite.joinUrl);
      assert.equal(
        (await call("GET", `events/${event}/organiser`, undefined, "2")).status,
        404,
      );
    },
  );
  await t.test(
    "invalid input/code creates no participant; name + goal join binds users.auth_id; repeat join restores",
    async () => {
      const join = {
        code: invite.joinCode,
        displayName: "Alex",
        goal: qs[5].options[0],
      };
      for (const body of [
        { ...join, code: "WRONG" },
        { ...join, displayName: "" },
        { ...join, goal: "" },
        { ...join, goal: "invalid" },
      ])
        assert.ok((await call("POST", "events/join", body)).status >= 400);
      assert.equal(
        (
          await db.query("SELECT * FROM event_participants WHERE event_id=$1", [
            event,
          ])
        ).length,
        0,
      );
      let r = await call("POST", "events/join", join);
      assert.equal(r.status, 200);
      assert.equal(r.data.step, "setup");
      assert.equal(r.data.displayName, "Alex");
      A = (await db.query("SELECT id FROM users WHERE auth_id=$1", [id(1)]))[0]
        .id;
      assert.equal(
        (
          await db.query(
            "SELECT user_id FROM event_participants WHERE event_id=$1",
            [event],
          )
        )[0].user_id,
        A,
      );
      r = await call(
        "POST",
        "events/join",
        { ...join, displayName: "Bea" },
        "2",
      );
      assert.equal(r.status, 200);
      B = (await db.query("SELECT id FROM users WHERE auth_id=$1", [id(2)]))[0]
        .id;
      assert.equal(
        (
          await call("POST", "events/join", {
            ...join,
            displayName: "Overwrite?",
          })
        ).data.displayName,
        "Alex",
      );
    },
  );
  await t.test(
    "profile optional fields and visibility round-trip; invalid mutations do not partially write",
    async () => {
      assert.equal(
        (
          await call("PUT", "profile", {
            eventId: event,
            displayName: "Alex",
            goal: qs[5].options[0],
          })
        ).status,
        200,
      );
      const p = (await call("GET", `profile?eventId=${event}`)).data;
      const body = {
        ...p,
        eventId: event,
        field: "Physics",
        funFact: "I keep bees",
        fieldVisible: true,
        funFactVisible: false,
        topics: ["interest", "discuss", "help", "learn", "ask_me_about"].map(
          (type) => ({
            type,
            topic: `private ${type}`,
            visible: type === "help",
          }),
        ),
      };
      assert.equal((await call("PUT", "profile", body)).status, 200);
      const restored = (await call("GET", `profile?eventId=${event}`)).data;
      for (const key of ["field", "funFact", "fieldVisible", "funFactVisible"])
        assert.equal(restored[key], body[key]);
      assert.deepEqual(
        [...restored.topics].sort((a, b) => a.type.localeCompare(b.type)),
        body.topics.sort((a, b) => a.type.localeCompare(b.type)),
      );
      const ownB = (
        await call("GET", `profile?eventId=${event}`, undefined, "2")
      ).data;
      assert.equal(ownB.funFact, "");
      assert.deepEqual(ownB.topics, []);
      for (const bad of [
        { ...body, displayName: "" },
        { ...body, goal: "" },
        { ...body, topics: [{ type: "unknown", topic: "x", visible: false }] },
        {
          ...body,
          topics: Array(3).fill({
            type: "ask_me_about",
            topic: "x",
            visible: true,
          }),
        },
      ])
        assert.equal((await call("PUT", "profile", bad)).status, 400);
      assert.deepEqual(
        (await call("GET", `profile?eventId=${event}`)).data,
        restored,
      );
    },
  );
  await t.test(
    "questionnaire explicit skips, all skipped, in-place resubmission; clean atomic validation errors",
    async () => {
      const answers = qs.map((q, i) => ({
        questionId: q.id,
        choice: i % 2 ? null : 0,
        skipped: !!(i % 2),
      }));
      let r = await call("POST", "questionnaire", { eventId: event, answers });
      assert.equal(r.status, 200);
      assert.equal(r.data.step, "home");
      assert.deepEqual(
        r.data.answers.sort((a, b) => a.questionId.localeCompare(b.questionId)),
        [...answers].sort((a, b) => a.questionId.localeCompare(b.questionId)),
      );
      const before = structuredClone(r.data.answers);
      for (const bad of [
        [...answers.slice(0, 5), { ...answers[5], questionId: id(999) }],
        [{ ...answers[0], choice: 99 }, ...answers.slice(1)],
        [{ ...answers[0], skipped: true, choice: 0 }, ...answers.slice(1)],
      ])
        assert.equal(
          (
            await call("POST", "questionnaire", {
              eventId: event,
              answers: bad,
            })
          ).status,
          400,
        );
      assert.deepEqual(
        (await call("GET", `profile?eventId=${event}`)).data.answers.sort(
          (a, b) => a.questionId.localeCompare(b.questionId),
        ),
        before,
      );
      const skipped = qs.map((q) => ({
        questionId: q.id,
        choice: null,
        skipped: true,
      }));
      assert.equal(
        (
          await call("POST", "questionnaire", {
            eventId: event,
            answers: skipped,
          })
        ).status,
        200,
      );
      r = await call("POST", "questionnaire", { eventId: event, answers });
      assert.equal(r.data.answers.length, 6);
      await call("POST", "questionnaire", { eventId: event, answers }, "2");
      assert.equal(
        (await call("GET", `profile?eventId=${event}`)).data.goal,
        qs[5].options[0],
      );
    },
  );
  await t.test(
    "two independent identities: open appears, off disappears, reopen extends, server expiry without A action, no self",
    async () => {
      assert.deepEqual(
        (await call("GET", `events/${event}/open`, undefined, "2")).data,
        [],
      );
      const start = Date.now();
      let r = await call("PUT", `events/${event}/availability`, { open: true });
      assert.equal(r.status, 200);
      assert.ok(Date.parse(r.data.openUntil) >= start + 899000);
      assert.equal(
        (await call("GET", `events/${event}/open`, undefined, "2")).data[0]
          .displayName,
        "Alex",
      );
      assert.deepEqual((await call("GET", `events/${event}/open`)).data, []);
      await call("PUT", `events/${event}/availability`, { open: false });
      assert.deepEqual(
        (await call("GET", `events/${event}/open`, undefined, "2")).data,
        [],
      );
      const first = await call("PUT", `events/${event}/availability`, {
        open: true,
      });
      const later = new EntryService(db, () => Date.now() + 5000);
      assert.ok(
        Date.parse(
          (await later.availability(id(1), event, { open: true })).openUntil,
        ) > Date.parse(first.data.openUntil),
      );
      // Advance the server's clock 16 minutes; production TTL remains 15 minutes.
      const expired = new EntryService(db, () => Date.now() + 16 * 60 * 1000);
      assert.deepEqual(await expired.open(id(2), event), []);
      assert.equal(
        (await call("PUT", `events/${event}/availability`, { open: "true" }))
          .status,
        400,
      );
    },
  );
  await t.test(
    "payload ONLY routing participantId, name, goal line and <=1 verbatim shared chip; UI has no open count",
    async () => {
      const payload = (
        await call("GET", `events/${event}/open`, undefined, "2")
      ).data;
      assert.deepEqual(payload, [
        {
          participantId: A,
          displayName: "Alex",
          goalLine: qs[5].options[0],
          chip: qs[0].options[0],
        },
      ]);
      for (const item of payload) {
        assert.ok(
          Object.keys(item).every((k) =>
            ["participantId", "displayName", "goalLine", "chip"].includes(k),
          ),
        );
        assert.ok(
          Object.keys(item).every(
            (k) => !/score|rank|count|percent|compatib/i.test(k),
          ),
        );
      }
      const ui = await readFile(
        new URL("../app/event/[id]/page.tsx", import.meta.url),
        "utf8",
      );
      assert.doesNotMatch(
        ui,
        /\{\s*list\.length\s*\}|\b\d+\s+(people|users)\s+open/,
      );
      assert.match(ui, /3000/);
      assert.match(ui, /Connection lost/);
      assert.match(ui, /Nobody’s open right now/);
      assert.match(ui, /list order is not a ranking/);
    },
  );
  await t.test(
    "every touched table: own row readable, other profile/answers/fuel/contact denied through real RLS",
    async () => {
      await db.query(
        "INSERT INTO user_contacts(user_id,field,value) VALUES($1,'email','secret@example.invalid')",
        [A],
      );
      async function asUser(auth, fn) {
        await pg.exec("BEGIN;SET LOCAL ROLE authenticated;");
        try {
          await pg.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [
            auth,
          ]);
          return await fn();
        } finally {
          await pg.exec("ROLLBACK");
        }
      }
      await asUser(id(1), async () => {
        for (const [table, where] of [
          ["users", "id"],
          ["event_participants", "user_id"],
          ["answers", "user_id"],
          ["user_interests", "user_id"],
          ["user_contacts", "user_id"],
        ]) {
          assert.ok(
            (await db.query(`SELECT * FROM ${table} WHERE ${where}=$1`, [A]))
              .length > 0,
            `${table}: own readable`,
          );
          assert.equal(
            (await db.query(`SELECT * FROM ${table} WHERE ${where}=$1`, [B]))
              .length,
            0,
            `${table}: other hidden`,
          );
        }
      });
      await asUser(id(2), async () => {
        for (const table of [
          "event_participants",
          "answers",
          "user_interests",
          "user_contacts",
        ])
          assert.equal(
            (await db.query(`SELECT * FROM ${table} WHERE user_id=$1`, [A]))
              .length,
            0,
          );
      });
    },
  );
  await t.test(
    "cross-event profile/open/availability/questionnaire and unauthenticated access blocked",
    async () => {
      const other = (await call("POST", "events", { name: "Other" }, "3")).data;
      await call(
        "POST",
        "events/join",
        { code: other.joinCode, displayName: "Other", goal: "Just socialize" },
        "3",
      );
      for (const [method, path, body] of [
        ["GET", `profile?eventId=${other.event.id}`],
        ["GET", `events/${other.event.id}/open`],
        ["PUT", `events/${other.event.id}/availability`, { open: true }],
        ["POST", "questionnaire", { eventId: other.event.id, answers: [] }],
        ["PUT", "profile", { eventId: other.event.id }],
      ])
        assert.equal((await call(method, path, body)).status, 404);
      for (const [method, path, body] of [
        ["GET", `profile?eventId=${event}`],
        ["POST", "questionnaire", { eventId: event, answers: [] }],
        ["PUT", `events/${event}/availability`, { open: true }],
        ["GET", `events/${event}/open`],
      ])
        assert.equal((await call(method, path, body, null)).status, 401);
    },
  );
  await t.test(
    "seed demo path and API goal-first ordering with three arranged participants",
    async () => {
      const demo = "00000000-0000-4000-8000-000000000100";
      await call("POST", "events/join", {
        code: "HELLO26",
        displayName: "Demo visitor",
        goal: "Find teammates",
      });
      await pg.exec(
        await readFile(
          new URL("../prisma/demo-open.sql", import.meta.url),
          "utf8",
        ),
      );
      assert.equal((await call("GET", `events/${demo}/open`)).data.length, 6);
      const dq = await new EntryService(db).questions(demo);
      await call("POST", "questionnaire", {
        eventId: demo,
        answers: dq.map((q, i) => ({
          questionId: q.id,
          choice: i < 2 ? 0 : null,
          skipped: i >= 2,
        })),
      });
      await db.query(
        `UPDATE event_participants SET availability_status='unavailable',available_until=null WHERE event_id=$1 AND user_id<>$2`,
        [demo, A],
      );
      for (const [n, goal, shared] of [
        [1, "Find teammates", 0],
        [2, "Just socialize", 2],
        [3, "Find teammates", 1],
      ]) {
        const uid = `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
        await db.query(
          `UPDATE event_participants SET goal=$3,availability_status='open',available_until=$4,opened_at=$5 WHERE event_id=$1 AND user_id=$2`,
          [
            demo,
            uid,
            goal,
            new Date(Date.now() + 900000).toISOString(),
            new Date().toISOString(),
          ],
        );
        await db.query("DELETE FROM answers WHERE event_id=$1 AND user_id=$2", [
          demo,
          uid,
        ]);
        for (let i = 0; i < shared; i++)
          await db.query(
            "INSERT INTO answers(event_id,user_id,question_id,option_index,skipped) VALUES($1,$2,$3,0,false)",
            [demo, uid, dq[i].id],
          );
      }
      assert.deepEqual(
        (await call("GET", `events/${demo}/open`)).data.map(
          (p) => p.displayName,
        ),
        ["Casey", "Ari", "Bo"],
      );
    },
  );
  await t.test(
    "fresh service/session state restores full saved profile/answers/availability; leave cascades",
    async () => {
      const fresh = new EntryService(db);
      const restored = await fresh.profile(id(1), event);
      assert.equal(restored.funFact, "I keep bees");
      assert.equal(restored.answers.length, 6);
      assert.ok(restored.openUntil);
      assert.equal(restored.step, "home");
      assert.equal(
        (await call("DELETE", `events/${event}/membership`)).status,
        200,
      );
      for (const table of ["event_participants", "answers", "user_interests"])
        assert.equal(
          (
            await db.query(
              `SELECT * FROM ${table} WHERE event_id=$1 AND user_id=$2`,
              [event, A],
            )
          ).length,
          0,
        );
      assert.equal((await call("GET", `profile?eventId=${event}`)).status, 404);
    },
  );
});
