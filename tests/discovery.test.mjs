import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/connections.mjs";
import { discover, evidence } from "../lib/discovery.ts";
const person = (id, extra = {}) => ({
  participantId: id,
  displayName: id,
  role: "",
  organization: "",
  industry: "",
  introduction: "",
  photo: "",
  expertise: "",
  goalLine: "Learn",
  goals: [],
  tags: [],
  offers: [],
  seeks: [],
  saved: false,
  available: true,
  checkedInAt: "2026-11-14T12:00:00Z",
  openedAt: null,
  answers: [],
  met: false,
  ...extra,
});
test("Discover deterministic ordering: unmet, goal, complementary value, shared answers; exact evidence and fixed projection", () => {
  const a = person("a", {
      seeks: ["Research"],
      answers: [{ questionId: "q", choice: 0, skipped: false }],
    }),
    b = person("b", { offers: ["Research"] }),
    c = person("c", { answers: a.answers }),
    d = person("d", { goalLine: "Other", offers: ["Research"] }),
    e = person("e", { met: true });
  const input = [e, d, c, b];
  const before = structuredClone(input);
  assert.deepEqual(
    discover(a, input, "for-you").map((p) => p.participantId),
    ["b", "c", "d", "e"],
  );
  assert.deepEqual(input, before);
  assert.equal(
    evidence(a, b).why,
    "You’re looking for “Research”; they offer “Research”.",
  );
  assert.deepEqual(evidence(a, b).topics, ["Research", "Learn"]);
  for (const p of discover(a, input, "for-you"))
    assert.ok(
      !Object.keys(p).some((k) =>
        /score|rank|count|percent|answer|checked|opened|met$/i.test(k),
      ),
    );
  assert.deepEqual(
    discover(a, [person("x", { available: false })], "for-you"),
    [],
  );
  assert.equal(
    discover(
      a,
      [person("x", { available: false, organization: "Acme" })],
      "all",
      "acme",
    ).length,
    1,
  );
  assert.equal(discover(a, [person("x", { saved: true })], "saved").length, 1);
});
test("Part B HTTP, migrated Postgres and role-switched RLS", async (t) => {
  const f = await fixture();
  t.after(() => f.pg.close());
  const { call, event, db, members } = f;
  const get = (route, who = "1") =>
    call(
      "GET",
      `${route}${route.includes("?") ? "&" : "?"}eventId=${event}`,
      undefined,
      who,
    );
  await db.query(
    "UPDATE event_participants SET role='Researcher',organization='Acme',networking_goals=ARRAY['Find collaborators'],profile_saved=true,setup_complete=true,checked_in_at=$2 WHERE event_id=$1",
    [event, new Date(f.now - 60000).toISOString()],
  );
  await db.query(
    "INSERT INTO user_interests(event_id,user_id,interest_type,topic,share_consent) VALUES($1,$2,'learn','AI',true),($1,$3,'help','AI',true),($1,$3,'interest','PRIVATE',false)",
    [event, members[0], members[1]],
  );
  await t.test(
    "checked-in board, directory name/org search, consent-only allowlist, unavailable directory, unchecked and blocks excluded",
    async () => {
      const list = (await get("discover?tab=for-you")).data;
      assert.equal(list.length, 9);
      assert.equal(list[0].participantId, members[1]);
      assert.match(list[0].why, /“AI”/);
      assert.ok(!JSON.stringify(list).includes("PRIVATE"));
      await call("PUT", `events/${event}/availability`, { open: false }, "2");
      assert.ok(
        !(await get("discover?tab=for-you")).data.some(
          (p) => p.participantId === members[1],
        ),
      );
      assert.ok(
        (await get("discover?tab=all&search=acme")).data.some(
          (p) => p.participantId === members[1] && !p.available,
        ),
      );
      assert.equal(
        (await get("discover?tab=all&search=Person%202")).data.length,
        1,
      );
      await db.query(
        "UPDATE event_participants SET checked_in_at=null WHERE event_id=$1 AND user_id=$2",
        [event, members[2]],
      );
      assert.ok(
        !(await get("discover?tab=all")).data.some(
          (p) => p.participantId === members[2],
        ),
      );
      await call("POST", "blocks", { eventId: event, participant: members[3] });
      assert.ok(
        !(await get("discover?tab=all")).data.some(
          (p) => p.participantId === members[3],
        ),
      );
      await f.reset();
    },
  );
  await t.test(
    "save and unsave are idempotent, event-scoped and survive a fresh request",
    async () => {
      const path = `saved/${members[1]}`;
      assert.equal((await call("PUT", path, { eventId: event })).status, 200);
      await call("PUT", path, { eventId: event });
      assert.equal((await get("discover?tab=saved")).data.length, 1);
      assert.equal((await get("discover?tab=saved", "2")).data.length, 0);
      assert.equal((await db.query("SELECT * FROM saved_people")).length, 1);
      assert.equal(
        (await call("PUT", `saved/${members[0]}`, { eventId: event })).status,
        404,
      );
      await call("DELETE", `${path}?eventId=${event}`);
      assert.deepEqual((await get("discover?tab=saved")).data, []);
    },
  );
  let station;
  await t.test(
    "organiser station CRUD, exact tag reasons, shortlist maximum ten and private dismissal",
    async () => {
      assert.equal(
        (
          await call(
            "POST",
            "stations",
            { eventId: event, name: "AI corner", tags: ["AI"] },
            "2",
          )
        ).status,
        404,
      );
      for (let i = 0; i < 12; i++)
        assert.equal(
          (
            await call("POST", "stations", {
              eventId: event,
              name: `AI corner ${i}`,
              description: "Talk about your work.",
              tags: ["AI"],
              locationNote: "By the window",
            })
          ).status,
          201,
        );
      const all = (await get("stations?manage=true")).data;
      station = all[0];
      assert.equal(all.length, 12);
      const list = (await get("stations")).data;
      assert.equal(list.length, 10);
      assert.equal(
        list[0].reason,
        "From your profile: “AI” · station tag: “AI”.",
      );
      await call("POST", `stations/${station.id}/dismiss`, { eventId: event });
      assert.ok(!(await get("stations")).data.some((s) => s.id === station.id));
      assert.ok(
        (await get("stations", "2")).data.some((s) => s.id === station.id),
      );
      await call("PUT", `stations/${station.id}`, {
        eventId: event,
        name: "New name",
        tags: ["AI"],
      });
      assert.equal(
        (await get("stations?manage=true")).data.find(
          (s) => s.id === station.id,
        ).name,
        "New name",
      );
      assert.equal(
        (
          await call("POST", "stations", {
            eventId: event,
            name: "Bad",
            tags: [],
          })
        ).status,
        400,
      );
    },
  );
  await t.test(
    "newly checked-in, available, grounded notifications, one at a time with persisted per-person dismissals",
    async () => {
      assert.equal((await get("notifications")).data, null);
      await db.query(
        "UPDATE event_participants SET checked_in_at=$3 WHERE event_id=$1 AND user_id IN($2,$4)",
        [event, members[1], new Date(f.now).toISOString(), members[4]],
      );
      const n = (await get("notifications")).data;
      assert.equal(n.participantId, members[1]);
      assert.ok(!Array.isArray(n));
      await call("DELETE", `notifications/${n.participantId}?eventId=${event}`);
      assert.equal((await get("notifications")).data.participantId, members[4]);
      await call("PUT", `events/${event}/availability`, { open: false }, "5");
      assert.equal((await get("notifications")).data, null);
    },
  );
  let sid;
  await t.test(
    "default five minutes, upfront ten rejected, full matched profile only for two members, sent history and withdrawal",
    async () => {
      await f.reset();
      assert.equal((await f.send("1", members[1], 10)).status, 400);
      await call("POST", "connections", {
        eventId: event,
        participant: members[1],
      });
      const r = (await f.state()).data.outgoing.at(-1);
      assert.equal(r.duration, 5);
      await f.respond(r.id, "accept");
      sid = (await f.state()).data.session.id;
      const matched = await get(`sessions/${sid}/profile`);
      assert.equal(matched.status, 200);
      assert.equal(matched.data.person.organization, "Acme");
      assert.equal(matched.data.meetingPoint.label, "Point 1");
      assert.equal((await get(`sessions/${sid}/profile`, "3")).status, 404);
      await f.session(sid, "arrive");
      await f.session(sid, "arrive", "2");
      assert.equal((await f.state()).data.outgoing[0].status, "accepted");
    },
  );
  const arc = (action, who = "1") =>
    call("POST", `sessions/${sid}/arc`, { eventId: event, action }, who);
  const view = (who = "1") => get(`sessions/${sid}/arc`, who);
  await t.test(
    "extension window server-enforced; Later and ignore have identical complete projections, timing and storage",
    async () => {
      assert.equal((await arc("extend")).status, 409);
      f.now += 240000;
      assert.equal((await arc("extend")).status, 200);
      const before = (await view()).data;
      assert.equal(before.extension.proposal, "yours");
      assert.equal((await view("2")).data.extension.proposal, "partner");
      assert.equal((await arc("extension-later", "2")).status, 200);
      assert.deepEqual((await view()).data, before);
      assert.equal((await f.state()).data.session.duration, 5);
      f.now += 60000;
      const ended = (await view()).data;
      assert.equal(ended.phase, "conversation");
      assert.equal(ended.extension.proposal, null);
      assert.equal((await arc("extend", "2")).status, 409);
    },
  );
  await t.test(
    "both must agree, repeat/replayed consent cannot extend twice, 20 minute cap and timer never cuts",
    async () => {
      // Return the injected clock to the same proposal window; production clock never goes backwards.
      f.now -= 30000;
      await arc("extend", "2");
      assert.equal((await view()).data.duration, 10);
      await arc("extend", "2");
      assert.equal((await view()).data.duration, 10);
      f.now += 300000;
      await arc("extend", "2");
      await arc("extend");
      assert.equal((await view()).data.duration, 15);
      f.now += 300000;
      await arc("extend");
      await arc("extend", "2");
      assert.equal((await view()).data.duration, 20);
      f.now += 600000;
      assert.equal((await arc("extend")).status, 409);
      assert.equal((await view()).data.phase, "conversation");
      assert.equal(
        (await db.query("SELECT closed_at FROM sessions WHERE id=$1", [sid]))[0]
          .closed_at,
        null,
      );
    },
  );
  await t.test(
    "closing keeps availability paused, feedback reasons/note are validated and write-only, training labels preserved",
    async () => {
      await arc("wrap-up");
      assert.equal((await f.state()).data.outgoing[0].status,"expired");
      await call("POST", `sessions/${sid}/arc`, {
        eventId: event,
        action: "done",
        choice: "nothing",
        optedIn: false,
      });
      assert.equal(
        (
          await call("POST", "feedback", {
            eventId: event,
            sessionId: sid,
            reasons: ["reputation"],
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call("POST", "feedback", {
            eventId: event,
            sessionId: sid,
            perceived_value: 5,
            willingness_to_reconnect: true,
            conversation_ease: 4,
            reasons: ["collaboration", "advice"],
            private_note: "Only for the training pipeline.",
          })
        ).status,
        200,
      );
      const [row] = await db.query(
        "SELECT * FROM feedback WHERE interaction_id=$1",
        [sid],
      );
      assert.deepEqual(row.reasons, ["collaboration", "advice"]);
      assert.equal(row.private_note, "Only for the training pipeline.");
      assert.equal(row.perceived_value, 5);
      assert.ok(
        !(await get("people", "2")).data.some((p) =>
          JSON.stringify(p).includes("training pipeline"),
        ),
      );
      const paused = await db.query(
        "SELECT availability_status FROM event_participants WHERE event_id=$1 AND user_id IN($2,$3)",
        [event, members[0], members[1]],
      );
      assert.ok(paused.every((p) => p.availability_status === "unavailable"));
    },
  );
  await t.test(
    "every new table has forced RLS; role-switched own data, outsider denial, browser mutations revoked and extension votes secret",
    async () => {
      await call("PUT", `saved/${members[1]}`, { eventId: event });
      await f.asUser(1, async () => {
        assert.equal((await db.query("SELECT * FROM saved_people")).length, 1);
        assert.equal(
          (await db.query("SELECT * FROM station_dismissals")).length,
          1,
        );
        assert.equal(
          (await db.query("SELECT * FROM discovery_dismissals")).length,
          1,
        );
        assert.equal((await db.query("SELECT * FROM feedback")).length, 0);
      });
      await f.asUser(2, async () => {
        for (const table of [
          "saved_people",
          "station_dismissals",
          "discovery_dismissals",
          "feedback",
        ])
          assert.equal((await db.query(`SELECT * FROM ${table}`)).length, 0);
      });
      await f.asUser(11, async () => {
        assert.equal((await db.query("SELECT * FROM stations")).length, 0);
      });
      await assert.rejects(
        f.asUser(1, () => db.query("SELECT * FROM session_extensions")),
        /permission denied/,
      );
      for (const table of [
        "saved_people",
        "stations",
        "station_dismissals",
        "discovery_dismissals",
        "session_extensions",
      ]) {
        const [r] = await db.query(
          "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname=$1",
          [table],
        );
        assert.ok(r.relrowsecurity && r.relforcerowsecurity);
        await assert.rejects(
          f.asUser(1, () => db.query(`DELETE FROM ${table}`)),
          /permission denied/,
        );
      }
    },
  );
  await t.test(
    "API auth, event scope and recursive payload banned-field inspection",
    async () => {
      for (const route of [
        "discover?tab=all",
        "stations",
        "notifications",
        `sessions/${sid}/profile`,
      ])
        assert.equal((await get(route, null)).status, 401);
      const other = (await call("POST", "events", { name: "Other" }, "11")).data
        .event.id;
      for (const route of ["discover?tab=all", "stations", "notifications"])
        assert.equal(
          (
            await call(
              "GET",
              `${route}${route.includes("?") ? "&" : "?"}eventId=${other}`,
            )
          ).status,
          404,
        );
      const inspect = (v) => {
        if (v && typeof v === "object")
          for (const [k, b] of Object.entries(v)) {
            assert.ok(
              !/score|percent|ranking|count|compatib|decision|private_note|reasons|answers|qrToken/i.test(
                k,
              ),
              k,
            );
            inspect(b);
          }
      };
      for (const route of [
        "discover?tab=all",
        "stations",
        "notifications",
        `sessions/${sid}/profile`,
        "connections",
      ])
        inspect((await get(route)).data);
      assert.equal(
        (
          await call(
            "PUT",
            `stations/${station.id}`,
            { eventId: other, name: "Hijack", tags: ["AI"] },
            "11",
          )
        ).status,
        404,
      );
      await call("DELETE", `stations/${station.id}?eventId=${event}`);
      assert.ok(
        !(await get("stations?manage=true")).data.some(
          (s) => s.id === station.id,
        ),
      );
    },
  );
});
