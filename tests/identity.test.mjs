import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, authId } from "./helpers/connections.mjs";
test("MeetMates identity, personal QR and organiser-only event check-in (real SQL/RLS)", async (t) => {
  const f = await fixture();
  t.after(() => f.pg.close());
  const { db, pg, call, event, invite, members } = f;
  const p = (await call("GET", `profile?eventId=${event}`)).data;
  await t.test(
    "resume restores membership and new accounts get event tags without creating a guest",
    async () => {
      assert.equal(
        (await call("POST", "account/resume", { code: invite.joinCode })).data
          .displayName,
        "Person 1",
      );
      const next = await call(
        "POST",
        "account/resume",
        { code: invite.joinCode },
        "11",
      );
      assert.equal(next.data.step, "profile");
      assert.ok(next.data.interestTags.includes("AI"));
      assert.equal(
        (await db.query("SELECT * FROM users WHERE auth_id=$1", [authId(11)]))
          .length,
        0,
      );
    },
  );
  await t.test(
    "judges demo creates a real event and example meeting point without fake accounts",
    async () => {
      const before = (await db.query("SELECT count(*) AS n FROM users"))[0].n;
      const r = await call("POST", "events", { demo: true });
      assert.equal(r.status, 201);
      assert.equal(r.data.event.demo, true);
      assert.equal(r.data.event.name, "MeetMates — Judges Demo");
      assert.equal(
        (
          await db.query("SELECT * FROM event_participants WHERE event_id=$1", [
            r.data.event.id,
          ])
        ).length,
        0,
      );
      assert.equal(
        (await db.query("SELECT count(*) AS n FROM users"))[0].n,
        before,
      );
      assert.match(
        (await call("GET", `events/${r.data.event.id}/organiser`)).data
          .meetingPoints[0].direction,
        /Example illustration/,
      );
      assert.equal(
        (await call("POST", "account/resume", { code: r.data.joinCode }, "12"))
          .data.event.demo,
        true,
      );
    },
  );
  let saved;
  await t.test(
    "save is atomic; profile fields, tags/goals and unguessable persistent token round-trip",
    async () => {
      const body = {
        ...p,
        code: invite.joinCode,
        role: "Founder",
        organization: "Small Studio",
        industry: "Energy",
        field: "Battery research",
        introduction: "I build batteries.",
        networkingGoals: ["Find collaborators"],
        topics: [
          { type: "interest", topic: "AI", visible: true },
          { type: "help", topic: "Prototyping", visible: true },
        ],
      };
      const r = await call("POST", "account/profile", body);
      assert.equal(r.status, 200);
      saved = r.data;
      assert.match(saved.qrToken, /^[0-9a-f]{64}$/);
      assert.notEqual(saved.qrToken, members[0]);
      assert.equal(saved.role, body.role);
      assert.equal(saved.profileSaved, true);
      assert.deepEqual(saved.networkingGoals, body.networkingGoals);
      assert.equal(
        (await call("POST", "account/profile", body)).data.qrToken,
        saved.qrToken,
      );
      for (const bad of [
        { ...body, networkingGoals: ["Fake"] },
        {
          ...body,
          topics: [{ type: "interest", topic: "invented", visible: true }],
        },
        { ...body, photo: "javascript:alert(1)" },
        { ...body, displayName: "" },
      ])
        assert.equal((await call("POST", "account/profile", bad)).status, 400);
      assert.deepEqual(
        (await call("GET", `profile?eventId=${event}`)).data,
        saved,
      );
    },
  );
  await t.test(
    "unchecked participant absent; attendee cannot check in; organiser search and QR check-in are scoped and idempotent",
    async () => {
      await db.query(
        "UPDATE event_participants SET checked_in_at=null WHERE event_id=$1 AND user_id=$2",
        [event, members[0]],
      );
      assert.ok(
        !(await call("GET", `events/${event}/open`, undefined, "2")).data.some(
          (x) => x.participantId === members[0],
        ),
      );
      assert.equal(
        (
          await call(
            "POST",
            `events/${event}/check-in`,
            { token: saved.qrToken },
            "2",
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await call(
            "GET",
            `events/${event}/check-in?name=Person`,
            undefined,
            "2",
          )
        ).status,
        404,
      );
      const found = await call(
        "GET",
        `events/${event}/check-in?name=Person%201`,
      );
      assert.ok(found.data.some((x) => x.participantId === members[0]));
      const checked = await call("POST", `events/${event}/check-in`, {
        token: saved.qrToken,
      });
      assert.equal(checked.status, 200);
      assert.equal(
        (
          await call("POST", `events/${event}/check-in`, {
            participant: members[0],
          })
        ).data.checkedInAt,
        checked.data.checkedInAt,
      );
      assert.ok(
        (await call("GET", `events/${event}/open`, undefined, "2")).data.some(
          (x) => x.participantId === members[0],
        ),
      );
      const other = (await call("POST", "events", { name: "Different room" }))
        .data;
      assert.equal(
        (
          await call("POST", `events/${other.event.id}/check-in`, {
            token: saved.qrToken,
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await call(
            "POST",
            "qr/resolve",
            { eventId: event, token: saved.qrToken },
            "2",
          )
        ).status,
        404,
      );
    },
  );
  await t.test(
    "QR resolves a real started conversation without releasing contacts or bypassing consent",
    async () => {
      const req = await f.send();
      assert.equal(req.status, 200);
      const rid = (await f.state()).data.outgoing[0].id;
      await f.respond(rid, "accept");
      const sid = (await f.state()).data.session.id;
      assert.equal(
        (
          await call(
            "POST",
            "qr/resolve",
            { eventId: event, token: saved.qrToken },
            "2",
          )
        ).status,
        404,
      );
      await f.session(sid, "arrive", "1");
      await f.session(sid, "arrive", "2");
      const resolved = await call(
        "POST",
        "qr/resolve",
        { eventId: event, token: saved.qrToken },
        "2",
      );
      assert.equal(resolved.status, 200);
      assert.deepEqual(resolved.data, {
        sessionId: sid,
        displayName: "Person 1",
      });
      assert.equal(
        (
          await call(
            "POST",
            "qr/resolve",
            { eventId: event, token: saved.qrToken },
            "3",
          )
        ).status,
        404,
      );
    },
  );
  await t.test(
    "private QR/new fields are covered by RLS; neither attendee nor organiser browser can read another membership or forge check-in",
    async () => {
      async function as(who, fn) {
        await pg.exec("BEGIN; SET LOCAL ROLE authenticated");
        try {
          await pg.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [
            authId(who),
          ]);
          return await fn();
        } finally {
          await pg.exec("ROLLBACK");
        }
      }
      await as(1, async () => {
        assert.equal(
          (
            await db.query(
              "SELECT qr_token FROM event_participants WHERE user_id=$1",
              [members[0]],
            )
          )[0].qr_token,
          saved.qrToken,
        );
        assert.equal(
          (
            await db.query(
              "SELECT qr_token,role FROM event_participants WHERE user_id=$1",
              [members[1]],
            )
          ).length,
          0,
        );
      });
      await as(2, async () =>
        assert.equal(
          (
            await db.query(
              "SELECT qr_token,photo FROM event_participants WHERE user_id=$1",
              [members[0]],
            )
          ).length,
          0,
        ),
      );
      await assert.rejects(
        as(2, () =>
          db.query("UPDATE event_participants SET checked_in_at=now()"),
        ),
        /permission denied/,
      );
    },
  );
});

test("production Auth verifier admits confirmed email accounts and rejects anonymous/unconfirmed identities", async (t) => {
  const { verify } = await import("../lib/http.ts");
  const oldFetch = globalThis.fetch,
    oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  t.after(() => {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
  });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth-fixture.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-public";
  let user = {
    id: authId(1),
    email: "alex@example.invalid",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    is_anonymous: false,
  };
  globalThis.fetch = async () => Response.json(user);
  assert.equal(await verify("fixture"), authId(1));
  user = { ...user, is_anonymous: true };
  assert.equal(await verify("fixture"), null);
  user = { ...user, is_anonymous: false, email_confirmed_at: null };
  assert.equal(await verify("fixture"), null);
});
