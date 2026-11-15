import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fixture, authId } from "./helpers/connections.mjs";
import { handler } from "../lib/http.ts";
import { showEventId, showSeedStatements } from "../lib/show-seed.ts";

test("Show Mode authenticated entry, idempotent shared data, private labels and real two-session loop", async (t) => {
  const f = await fixture();
  t.after(() => f.pg.close());
  const run = handler(
    f.db,
    async (token) =>
      token === "a"
        ? { id: authId(11), anonymous: true }
        : token === "b"
          ? { id: authId(12), anonymous: true }
          : token === "owner"
            ? authId(1)
            : null,
    () => f.now,
  );
  async function call(method, path, body, who = "a") {
    const r = await run(
      new Request(`http://localhost/api/${path}`, {
        method,
        headers: who ? { authorization: `Bearer ${who}` } : {},
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      path.split("?")[0].split("/"),
    );
    return { status: r.status, data: await r.json() };
  }
  const event = showEventId;
  const get = (route, who = "a") =>
    call("GET", `${route}?eventId=${event}`, undefined, who);
  let a, b;
  await t.test(
    "entry requires a valid Anonymous Auth session; rejects invalid labels and cannot create organiser capabilities",
    async () => {
      assert.equal(
        (await call("POST", "show/entry", { email: "a@test.invalid" }, ""))
          .status,
        401,
      );
      assert.equal(
        (await call("POST", "show/entry", { email: "a@test.invalid" }, "owner"))
          .status,
        403,
      );
      assert.equal(
        (await call("POST", "show/entry", { email: "x".repeat(255) })).status,
        400,
      );
      assert.equal(
        (
          await call("POST", "show/entry", {
            email: "a@test.invalid",
            verified: true,
          })
        ).status,
        400,
      );
    },
  );
  await t.test(
    "prepare and ensure are idempotent: one DEMO26, exact points/stations/personas and no persona Auth users",
    async () => {
      for (let i = 0; i < 2; i++) {
        assert.deepEqual(
          await call("POST", "show/entry", { email: "alice@show.invalid" }),
          { status: 200, data: { next: "/join" } },
        );
        assert.equal((await call("GET", "show/event")).data.code, "DEMO26");
      }
      const [e] = await f.db.query(
        "SELECT * FROM events WHERE event_code='DEMO26'",
      );
      assert.equal(e.name, "MeetMates Demo");
      assert.equal(e.is_demo, true);
      assert.equal(
        (await f.db.query("SELECT * FROM questions WHERE event_id=$1", [event]))
          .length,
        6,
      );
      assert.deepEqual(
        await f.db.query(
          "SELECT label,direction FROM meeting_points WHERE event_id=$1 ORDER BY position",
          [event],
        ),
        [
          { label: "Table 1", direction: "By the coffee bar" },
          { label: "Table 2", direction: "By the tall windows" },
        ],
      );
      assert.deepEqual(
        await f.db.query(
          "SELECT name,description,tags,location_note FROM stations WHERE event_id=$1 ORDER BY name",
          [event],
        ),
        [
          {
            name: "AI Builders Corner",
            description: "Demos and discussion on applied AI",
            tags: ["AI", "Design"],
            location_note: "North wall",
          },
          {
            name: "Research Exchange",
            description: "Share methods and find collaborators",
            tags: ["Research", "Design"],
            location_note: "East wall",
          },
        ],
      );
      const personas = await f.db.query(
        "SELECT p.*,u.auth_id FROM event_participants p JOIN users u ON u.id=p.user_id WHERE event_id=$1 ORDER BY display_name",
        [event],
      );
      assert.deepEqual(
        personas.map((p) => [
          p.display_name,
          p.role,
          p.organization,
          p.auth_id,
        ]),
        [
          ["Alex Morgan", "Product designer", "Common Ground (demo)", null],
          ["Maya Chen", "User researcher", "Field Notes (demo)", null],
        ],
      );
      assert.ok(
        personas.every(
          (p) =>
            p.checked_in_at &&
            p.availability_status === "open" &&
            new Date(p.available_until).getTime() > f.now,
        ),
      );
      assert.equal(
        (await f.db.query("SELECT * FROM auth.users")).length,
        12,
        "no Auth users seeded",
      );
      const sql = await readFile(
        new URL("../prisma/show-seed.sql", import.meta.url),
        "utf8",
      );
      for (const statement of showSeedStatements)
        assert.ok(
          sql.includes(statement),
          "full published seed SQL matches runtime",
        );
    },
  );
  await t.test(
    "choose joins checked-in with saved preset, personal QR, private unverified label; retries preserve edits and availability",
    async () => {
      assert.equal(
        (await call("POST", "show/join", { code: "WRONG" })).status,
        400,
      );
      a = (await call("POST", "show/join", { code: "DEMO26" })).data;
      assert.equal(a.displayName, "alice");
      assert.equal(a.role, "Attendee");
      assert.equal(a.profileSaved, true);
      assert.equal(a.step, "home");
      assert.ok(a.checkedInAt);
      assert.ok(a.openUntil);
      assert.match(a.qrToken, /^[0-9a-f]{64}$/);
      assert.equal(a.demoEmailLabel, "alice@show.invalid");
      assert.deepEqual(a.topics, [
        { type: "help", topic: "Ideas", visible: true },
        { type: "learn", topic: "People", visible: true },
      ]);
      const edited = {
        ...a,
        eventId: event,
        displayName: "Alice Edited",
        role: "Designer",
        topics: [
          { type: "help", topic: "Product design", visible: true },
          { type: "learn", topic: "Customer research", visible: true },
        ],
      };
      assert.equal((await call("PUT", "profile", edited)).status, 200);
      await call("PUT", `events/${event}/availability`, { open: false });
      const retry = (await call("POST", "show/join", { code: "DEMO26" })).data;
      assert.equal(retry.displayName, "Alice Edited");
      assert.equal(retry.role, "Designer");
      assert.equal(retry.qrToken, a.qrToken);
      assert.equal(retry.openUntil, null);
      await call("PUT", `events/${event}/availability`, { open: true });
      await call("POST", "show/entry", { email: "" }, "b");
      b = (await call("POST", "show/join", { code: "DEMO26" }, "b")).data;
      assert.equal(b.displayName, "Demo Guest");
    },
  );
  await t.test(
    "personas have grounded why-lines and requests remain pending without fake acceptance",
    async () => {
      const people = (await get("discover")).data;
      const alex = people.find((p) => p.displayName === "Alex Morgan");
      assert.match(
        alex.why,
        /You’re looking for “Customer research”; they offer “Product design”|You offer “Product design”; they’re looking for “Product design”|Shared goal: “Explore something new”/,
      );
      assert.ok(!JSON.stringify(people).includes("alice@show.invalid"));
      for (const p of people)
        assert.ok(
          !Object.keys(p).some((k) => /score|rank|count|percent/i.test(k)),
        );
      let r = await call("POST", "connections", {
        eventId: event,
        participant: alex.participantId,
      });
      assert.equal(r.status, 200);
      const pending = r.data.outgoing.find((p) => p.status === "pending");
      assert.ok(pending);
      f.now += 1000;
      assert.equal(
        (await get("connections")).data.outgoing.find(
          (p) => p.id === pending.id,
        ).status,
        "pending",
      );
      assert.equal(
        (await f.db.query("SELECT * FROM sessions WHERE event_id=$1", [event]))
          .length,
        0,
      );
      await call("PATCH", `connections/${pending.id}`, {
        eventId: event,
        action: "cancel",
      });
    },
  );
  await t.test(
    "two anonymous identities use real request, acceptance, point, arc, mutual extension and private feedback",
    async () => {
      const [au] = await f.db.query("SELECT id FROM users WHERE auth_id=$1", [
        authId(11),
      ]);
      const [bu] = await f.db.query("SELECT id FROM users WHERE auth_id=$1", [
        authId(12),
      ]);
      let r = await call("POST", "connections", {
        eventId: event,
        participant: bu.id,
      });
      assert.equal(r.status, 200);
      const request = (await get("connections", "b")).data.incoming.find(
        (p) => p.status === "pending",
      );
      assert.ok(request);
      r = await call(
        "PATCH",
        `connections/${request.id}`,
        { eventId: event, action: "accept" },
        "b",
      );
      assert.equal(r.status, 200);
      const session = r.data.session;
      assert.ok(["Table 1", "Table 2"].includes(session.meetingPoint.label));
      for (const who of ["a", "b"])
        assert.equal(
          (
            await call(
              "POST",
              `sessions/${session.id}/arrive`,
              { eventId: event },
              who,
            )
          ).status,
          200,
        );
      const arc = (action, who = "a", extra = {}) =>
        call(
          "POST",
          `sessions/${session.id}/arc`,
          { eventId: event, action, ...extra },
          who,
        );
      const view = () =>
        call("GET", `sessions/${session.id}/arc?eventId=${event}`);
      assert.equal((await view()).data.phase, "conversation");
      f.now += 245000;
      await arc("extend", "a", { duration: 5 });
      assert.equal((await get("connections")).data.session.duration, 5);
      await arc("extend", "b", { duration: 5 });
      assert.equal((await get("connections")).data.session.duration, 10);
      await arc("advance", "a", { position: 0 });
      assert.ok((await view()).data.position > 0);
      await arc("wrap-up");
      for (const who of ["a", "b"])
        await arc("done", who, { choice: "nothing", optedIn: false });
      const feedback = {
        eventId: event,
        sessionId: session.id,
        conversation_ease: 4,
        perceived_value: 4,
        willingness_to_reconnect: true,
        reasons: ["learning"],
        private_note: "Private show feedback",
      };
      const saved = await call("POST", "feedback", feedback);
      assert.equal(saved.status, 200);
      assert.equal(
        (await f.db.query("SELECT * FROM feedback WHERE user_id=$1", [au.id]))
          .length,
        1,
      );
      assert.equal(
        (await get("profile")).data.openUntil,
        null,
        "conversation end does not auto-restore availability",
      );
    },
  );
  await t.test(
    "anonymous access is event-scoped, organiser operations blocked, labels own-row-only under real RLS",
    async () => {
      assert.equal(
        (await call("POST", "events", { name: "Forbidden" })).status,
        403,
      );
      assert.equal(
        (await call("GET", `events/${event}/organiser`)).status,
        403,
      );
      assert.equal(
        (await call("POST", "stations", { eventId: event })).status,
        403,
      );
      assert.equal(
        (await call("GET", `stations?eventId=${event}&manage=true`)).status,
        403,
      );
      assert.equal(
        (await call("GET", `profile?eventId=${f.event}`)).status,
        403,
      );
      assert.equal(
        (await call("POST", "account/profile", { code: "DEMO26" })).status,
        403,
      );
      await f.asUser(11, async () => {
        const rows = await f.db.query("SELECT demo_email_label FROM users");
        assert.deepEqual(rows, [{ demo_email_label: "alice@show.invalid" }]);
        assert.equal((await f.db.query("SELECT * FROM feedback")).length, 0);
        assert.equal(
          (await f.db.query("SELECT * FROM user_contacts")).length,
          0,
        );
      });
    },
  );
});

test("production verifier admits anonymous sessions for Show Mode while email-only verifier stays unchanged", async (t) => {
  const { verify, verifySession } = await import("../lib/http.ts");
  const originalFetch = globalThis.fetch,
    oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
  });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://show-auth.invalid";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "fixture-public";
  globalThis.fetch = async () =>
    Response.json({ id: authId(11), is_anonymous: true });
  assert.deepEqual(await verifySession("token"), {
    id: authId(11),
    anonymous: true,
  });
  assert.equal(await verify("token"), null);
  globalThis.fetch = async () =>
    Response.json({ id: authId(11), is_anonymous: false });
  assert.equal(await verifySession("token"), null);
  globalThis.fetch = async () =>
    Response.json({ msg: "Invalid JWT" }, { status: 401 });
  assert.equal(await verifySession("token"), null);
});
