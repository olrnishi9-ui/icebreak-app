import {
  REQUEST_TTL_MIN,
  RE_REQUEST_COOLDOWN_MIN,
  MAX_REQUESTS_PER_HOUR,
} from "../lib/connection-policy.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, authId } from "./helpers/connections.mjs";
import { ConnectionService } from "../lib/connection-service.ts";
import { assignMeetingPoint, connectionScreen } from "../lib/connections.ts";

test("meeting assignment is pure: emptiest wins, configured ties, no points", () => {
  const points = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const before = structuredClone(points);
  assert.equal(assignMeetingPoint(points, new Map()), points[0]);
  assert.equal(
    assignMeetingPoint(
      points,
      new Map([
        ["a", 2],
        ["b", 1],
        ["c", 1],
      ]),
    ),
    points[1],
  );
  assert.equal(assignMeetingPoint([], new Map()), null);
  assert.deepEqual(points, before);
});

test("Task 3 HTTP + PostgreSQL integration, real migrations and RLS; Auth verifier is substituted", async (t) => {
  const f = await fixture();
  t.after(() => f.pg.close());
  const { db, call, event, members, state, send, respond, session, reset } = f;
  const base = f.now;
  const pending = async (who = "1") => (await state(who)).data.outgoing[0];
  await t.test(
    "send, exact grounded reason, duration validation, goal fallback, cap-neutral duplicates and data-layer unique unordered pair",
    async () => {
      await reset();
      for (const duration of [0, 6, "5", null])
        assert.equal((await send("1", members[1], duration)).status, 400);
      const r = await send();
      assert.equal(r.status, 200);
      assert.equal(r.data.outgoing.length, 1);
      const a = await pending();
      assert.equal(a.sharedReason, "Coffee");
      assert.equal(Date.parse(a.expiresAt) - f.now, REQUEST_TTL_MIN * 60000);
      const inbox = (await state("2")).data.incoming;
      assert.equal(inbox[0].displayName, "Person 1");
      assert.equal(inbox[0].goalLine, "Find teammates");
      assert.equal(inbox[0].duration, 5);
      assert.equal((await send()).status, 409);
      assert.equal(
        (
          await db.query(
            "SELECT * FROM connection_requests WHERE event_id=$1",
            [event],
          )
        ).length,
        1,
      );
      await assert.rejects(
        db.query(
          `INSERT INTO connection_requests(event_id,sender_id,recipient_id,created_at,expires_at) VALUES($1,$2,$3,$4,$5)`,
          [
            event,
            members[1],
            members[0],
            new Date(f.now).toISOString(),
            new Date(f.now + 900000).toISOString(),
          ],
        ),
        /Pair already pending/,
      );
      await reset();
      assert.equal(
        (await send("1", members[2], 10)).data.outgoing[0].sharedReason,
        "Find teammates · Just socialize",
      );
      await reset();
      assert.equal(
        (await send("1", members[3])).data.outgoing[0].sharedReason,
        "You're both here to Find teammates",
      );
    },
  );
  await t.test(
    "REQUIRED indistinguishability: Later / never seen / opened, identical complete sender responses and screen selectors before, at, after expiry; board unchanged",
    async () => {
      for (const kind of ["board", "code"]) {
        const scenarios = [];
        for (const mode of ["later", "unseen", "opened"]) {
          f.now = base;
          await reset();
          // Identical seeded identity/request/time, so exact payload equality is meaningful.
          const rid = "41000000-0000-4000-8000-000000000001";
          await db.query(
            `INSERT INTO connection_requests(id,event_id,sender_id,recipient_id,duration,shared_reason,created_at,expires_at,kind) VALUES($1,$2,$3,$4,5,'Coffee',$5,$6,$7)`,
            [
              rid,
              event,
              members[0],
              members[1],
              new Date(base).toISOString(),
              new Date(base + 900000).toISOString(),
              kind,
            ],
          );
          if (mode === "later")
            assert.equal((await respond(rid, "later")).status, 200);
          if (mode === "opened") await state("2");
          const timeline = [];
          for (const offset of [0, 450000, 899999, 900000, 900001, 1800000]) {
            f.now = base + offset;
            const response = await state();
            assert.doesNotMatch(
              JSON.stringify(response),
              /declined|dismissed|rejected|decision|recipient_id/,
            );
            timeline.push({
              response,
              screen: connectionScreen(response.data),
            });
            assert.equal(
              response.data.outgoing.length,
              offset < 900000 ? 1 : 0,
            );
            assert.equal(
              connectionScreen(response.data),
              offset < 900000 ? "waiting" : "board",
            );
            const board = await call("GET", `events/${event}/open`);
            assert.ok(board.data.some((p) => p.participantId === members[1]));
            timeline.at(-1).board = board.data.sort((a, b) =>
              a.participantId.localeCompare(b.participantId),
            );
            assert.equal((await send()).status, 409); // cooldown/duplicate indistinguishable too
          }
          scenarios.push(timeline);
        }
        assert.deepEqual(scenarios[0], scenarios[1]);
        assert.deepEqual(scenarios[1], scenarios[2]);
      }
      f.now = base;
    },
  );
  await t.test(
    "accept honors the exact millisecond expiry boundary for database Date objects",
    async () => {
      f.now = base;
      await reset();
      await send();
      const r = await pending();
      f.now = base + 899999;
      assert.equal((await respond(r.id, "accept")).status, 200);
      f.now = base;
      await reset();
      await send();
      const second = await pending();
      f.now = base + 900000;
      assert.equal((await respond(second.id, "accept")).status, 409);
      f.now = base;
    },
  );
  await t.test(
    "REQUIRED two authenticated clients: request -> accept -> identical point snapshot -> both arrived -> started; fresh services restore every step",
    async () => {
      await reset();
      await send("1", members[1], 10);
      const r = await pending();
      assert.equal(
        (await new ConnectionService(db, () => f.now).state(authId(1), event))
          .outgoing[0].id,
        r.id,
      );
      assert.equal((await respond(r.id, "accept")).status, 200);
      const a = (await state()).data.session,
        b = (await state("2")).data.session;
      assert.deepEqual(a.meetingPoint, b.meetingPoint);
      assert.equal(a.meetingPoint.label, "Point 1");
      assert.equal(a.duration, 10);
      assert.equal(b.duration, 10);
      assert.equal(
        (
          await call("PUT", `events/${event}/meeting-points`, {
            meetingPoints: f.points,
          })
        ).status,
        409,
      );
      assert.deepEqual(
        (await state()).data.session.meetingPoint,
        a.meetingPoint,
      );
      assert.equal(
        (await call("DELETE", `events/${event}/membership`)).status,
        409,
      );

      assert.equal(
        (await new ConnectionService(db, () => f.now).state(authId(2), event))
          .session.id,
        a.id,
      );
      assert.equal(
        (await session(a.id, "arrive")).data.session.state,
        "meeting",
      );
      assert.equal((await state()).data.session.arrived, true);
      assert.equal((await state("2")).data.session.partnerArrived, true);
      assert.equal(
        (await new ConnectionService(db, () => f.now).state(authId(1), event))
          .session.arrived,
        true,
      );
      const started = (await session(a.id, "arrive", "2")).data.session;
      assert.equal(started.state, "started");
      assert.ok(started.startedAt);
      assert.equal((await state()).data.session.startedAt, started.startedAt);
      f.now += 1000;
      assert.equal(
        (await session(a.id, "arrive")).data.session.startedAt,
        started.startedAt,
      );
      f.now = base;
      const others = (await call("GET", `events/${event}/open`, undefined, "3"))
        .data;
      assert.ok(
        !others.some((p) => [members[0], members[1]].includes(p.participantId)),
      );
      assert.equal(
        (await call("PUT", `events/${event}/availability`, { open: true }))
          .status,
        409,
      );
      assert.deepEqual(await send("3", members[0]), {
        status: 409,
        data: { error: "Not available right now." },
      });
      assert.equal((await session(a.id, "arrive", "3")).status, 404);
      assert.equal((await session(a.id, "cancel")).status, 409);
    },
  );
  await t.test(
    "mutual sends resolve once; occupied point goes to next point, pre-start cancel releases it and restores availability; late and start anyway",
    async () => {
      await reset();
      const first = await send();
      const rid = first.data.outgoing[0].id;
      const reverse = await send("2", members[0]);
      assert.equal(reverse.status, 200);
      assert.ok(reverse.data.session);
      assert.equal(
        (await db.query("SELECT * FROM sessions WHERE event_id=$1", [event]))
          .length,
        1,
      );
      assert.equal(
        (
          await db.query(
            "SELECT * FROM connection_requests WHERE event_id=$1",
            [event],
          )
        )[0].id,
        rid,
      );
      await send("3", members[3]);
      const r = (await state("3")).data.outgoing[0];
      await respond(r.id, "accept", "4");
      const second = (await state("3")).data.session;
      assert.equal(second.meetingPoint.label, "Point 2");
      await session(reverse.data.session.id, "cancel", "2");
      assert.equal(
        (await state()).data.notice.message,
        "Plans changed. You’re open to chat again.",
      );
      assert.equal((await state()).data.session, null);
      const open = (await call("GET", `events/${event}/open`, undefined, "5"))
        .data;
      assert.ok(open.some((p) => p.participantId === members[0]));
      await send("5", members[5]);
      const rr = (await state("5")).data.outgoing[0];
      await respond(rr.id, "accept", "6");
      const third = (await state("5")).data.session;
      assert.equal(third.meetingPoint.label, "Point 1");
      assert.equal((await session(third.id, "start", "5")).status, 400);
      await session(third.id, "late", "6");
      assert.equal((await state("5")).data.session.partnerOnTheirWay, true);
      await session(third.id, "arrive", "5");
      assert.equal(
        (await session(third.id, "start", "5")).data.session.state,
        "started",
      );
    },
  );
  await t.test(
    "concurrent opposite sends create one accepted request/session; racing accepts never double-book a participant",
    async () => {
      await reset();
      const opposite = await Promise.all([send(), send("2", members[0])]);
      assert.ok(opposite.every((r) => r.status === 200));
      assert.equal(
        (
          await db.query(
            "SELECT * FROM connection_requests WHERE event_id=$1",
            [event],
          )
        ).length,
        1,
      );
      assert.equal(
        (await db.query("SELECT * FROM sessions WHERE event_id=$1", [event]))
          .length,
        1,
      );
      await reset();
      await send();
      await send("3", members[1]);
      const inbox = (await state("2")).data.incoming;
      const race = await Promise.all(inbox.map((r) => respond(r.id, "accept")));
      assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
      assert.equal(
        (await db.query("SELECT * FROM sessions WHERE event_id=$1", [event]))
          .length,
        1,
      );
    },
  );
  await t.test(
    "code fallback requires owner Start, works when closed, no point/arrival; wrong or other-event code creates no row; code Later stays pending",
    async () => {
      await reset();
      await call("PUT", `events/${event}/availability`, { open: false }, "2");
      const code = (await state("2")).data.shortCode;
      const c = await call("POST", "connections/code", {
        eventId: event,
        code,
        duration: 10,
      });
      assert.equal(c.status, 200);
      assert.equal((await state("2")).data.incoming[0].kind, "code");
      assert.equal(c.data.session, null);
      await respond(c.data.outgoing[0].id, "accept");
      const a = (await state()).data.session,
        b = (await state("2")).data.session;
      assert.equal(a.state, "started");
      assert.equal(a.meetingPoint, null);
      assert.deepEqual(a.meetingPoint, b.meetingPoint);
      assert.equal(a.duration, 10);
      await reset();
      assert.equal(
        (
          await call("POST", "connections/code", {
            eventId: event,
            code: "NOTACODE",
          })
        ).status,
        404,
      );
      const invite = (
        await call("POST", "events", { name: "Other room" }, "11")
      ).data;
      await call(
        "POST",
        "events/join",
        { code: invite.joinCode, displayName: "Other", goal: "Just socialize" },
        "11",
      );
      const otherCode = (
        await call(
          "GET",
          `connections?eventId=${invite.event.id}`,
          undefined,
          "11",
        )
      ).data.shortCode;
      assert.equal(
        (
          await call("POST", "connections/code", {
            eventId: event,
            code: otherCode,
          })
        ).status,
        404,
      );
      assert.equal(
        (
          await db.query(
            "SELECT * FROM connection_requests WHERE event_id=$1",
            [event],
          )
        ).length,
        0,
      );
      const req = await call("POST", "connections/code", {
        eventId: event,
        code,
      });
      await respond(req.data.outgoing[0].id, "later");
      assert.deepEqual(await state(), req);
      assert.equal((await state("2")).data.incoming.length, 0);
    },
  );
  await t.test(
    "same neutral response: pending cap, closed, busy/muted, block both ways, cooldown, duplicate, sender rate limit; expiry frees cap; reports are private and do not change state",
    async () => {
      await reset();
      const neutral = await send("1", members[0]);
      assert.equal(neutral.status, 409);
      await call("PUT", `events/${event}/availability`, { open: false }, "2");
      assert.deepEqual(await send(), neutral);
      await reset();
      for (const who of ["3", "4", "5"])
        assert.equal((await send(who, members[1])).status, 200);
      assert.deepEqual(await send(), neutral);
      const inbox = (await state("2")).data.incoming;
      await respond(inbox[0].id, "later");
      assert.deepEqual(await send(), neutral);
      f.now += 900000;
      assert.equal((await send()).status, 200);
      f.now = base;
      await reset();
      await send();
      assert.deepEqual(await send(), neutral);
      f.now += 900000;
      assert.deepEqual(await send(), neutral);
      f.now += RE_REQUEST_COOLDOWN_MIN * 60000;
      assert.equal((await send()).status, 200);
      f.now = base;
      await reset();
      const original = (await state("2")).data;
      assert.equal(
        (
          await call("POST", "reports", {
            eventId: event,
            participant: members[1],
            category: "unwanted-contact",
          })
        ).status,
        200,
      );
      assert.deepEqual((await state("2")).data, original);
      assert.equal(
        (await db.query("SELECT * FROM reports WHERE event_id=$1", [event]))
          .length,
        1,
      );
      assert.equal(
        (
          await call("POST", "blocks", {
            eventId: event,
            participant: members[1],
          })
        ).status,
        200,
      );
      assert.deepEqual(await send(), neutral);
      assert.deepEqual(await send("2", members[0]), neutral);
      for (const [who, owner] of [
        ["1", "2"],
        ["2", "1"],
      ])
        assert.deepEqual(
          await call(
            "POST",
            "connections/code",
            { eventId: event, code: (await state(owner)).data.shortCode },
            who,
          ),
          neutral,
        );
      assert.deepEqual((await state("2")).data, original);
      await reset();
      // Historical sends to exercise the rolling rate cap without altering pair cooldown.
      for (let i = 0; i < MAX_REQUESTS_PER_HOUR; i++)
        await db.query(
          `INSERT INTO connection_requests(event_id,sender_id,recipient_id,created_at,expires_at,withdrawn) VALUES($1,$2,$3,$4,$5,true)`,
          [
            event,
            members[0],
            members[2],
            new Date(base - 3500000 + i).toISOString(),
            new Date(base - 2600000 + i).toISOString(),
          ],
        );
      assert.deepEqual(await send(), neutral);
      f.now = base + 200000;
      assert.equal((await send()).status, 200);
      f.now = base;
    },
  );
  await t.test(
    "inbox safety actions resolve only the caller’s own request; report changes no connection state; block dismisses privately",
    async () => {
      await reset();
      await send();
      const r = await pending();
      const before = await state();
      assert.equal(
        (
          await call(
            "POST",
            "reports",
            { eventId: event, requestId: r.id },
            "3",
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await call(
            "POST",
            "reports",
            { eventId: event, requestId: r.id },
            "2",
          )
        ).status,
        200,
      );
      assert.deepEqual(await state(), before);
      assert.equal((await state("2")).data.incoming.length, 1);
      assert.equal(
        (await call("POST", "blocks", { eventId: event, requestId: r.id }, "2"))
          .status,
        200,
      );
      assert.equal((await state("2")).data.incoming.length, 0);
      assert.deepEqual(await state(), before);
      assert.equal((await send()).status, 409);
    },
  );
  await t.test(
    "payload allowlists; raw request/decisions denied, safe DB projection, sessions only two members, no third-party requests, blocks/reports denied; no history on expiry",
    async () => {
      await reset();
      await send();
      const r = await pending();
      for (const item of [r, (await state("2")).data.incoming[0]]) {
        assert.deepEqual(
          Object.keys(item).sort(),
          [
            "id",
            "displayName",
            "goalLine",
            "sharedReason",
            "duration",
            "kind",
            "status",
            "expiresAt",
          ].sort(),
        );
        assert.ok(
          Object.keys(item).every(
            (k) =>
              !/score|rank|count|percent|compatib|answer|contact|decision|hash/i.test(
                k,
              ),
          ),
        );
      }
      await f.asUser(1, async () => {
        await assert.rejects(
          db.query("SELECT * FROM connection_requests"),
          /permission denied/,
        );
      });
      await f.asUser(1, async () =>
        assert.equal(
          (await db.query("SELECT * FROM own_connections($1)", [event])).length,
          1,
        ),
      );
      await f.asUser(3, async () =>
        assert.equal(
          (await db.query("SELECT * FROM own_connections($1)", [event])).length,
          0,
        ),
      );
      await respond(r.id, "later");
      await f.asUser(1, async () => {
        const projected = await db.query("SELECT * FROM own_connections($1)", [
          event,
        ]);
        // Database now differs from injected API clock; assert projection privacy, not TTL.
        assert.doesNotMatch(
          JSON.stringify(projected),
          /declined|decision|dismissed/,
        );
      });
      await reset();
      await send();
      await respond((await pending()).id, "accept");
      for (const n of [1, 2, 3])
        await f.asUser(n, async () =>
          assert.equal(
            // Task 4 hides close_reason at column privilege level.
            (
              await db.query(
                "SELECT id,arc_script,arc_position FROM sessions WHERE event_id=$1",
                [event],
              )
            ).length,
            n === 3 ? 0 : 1,
          ),
        );
      for (const table of ["blocks", "reports", "connection_request_decisions"])
        await f.asUser(
          2,
          async () =>
            await assert.rejects(
              db.query(`SELECT * FROM ${table}`),
              /permission denied/,
            ),
        );
    },
  );
  await t.test(
    "all routes reject unauthenticated callers; cross-event IDs and wrong-party actions denied; event ended; config validation/ownership",
    async () => {
      await reset();
      await send();
      const rid = (await pending()).id;
      assert.equal((await respond(rid, "accept", "1")).status, 404);
      assert.equal((await respond(rid, "cancel", "2")).status, 404);
      const invite = (await call("POST", "events", { name: "Separate" }, "12"))
        .data;
      await call(
        "POST",
        "events/join",
        {
          code: invite.joinCode,
          displayName: "Twelve",
          goal: "Just socialize",
        },
        "12",
      );
      for (const [method, path, body] of [
        ["GET", `connections?eventId=${event}`],
        [
          "POST",
          "connections",
          { eventId: event, participant: members[1], duration: 5 },
        ],
        ["PATCH", `connections/${rid}`, { eventId: event, action: "accept" }],
        ["POST", "connections/code", { eventId: event, code: "NOTACODE" }],
        ...["arrive", "start", "cancel", "late"].map((a) => [
          "POST",
          `sessions/${rid}/${a}`,
          { eventId: event },
        ]),
        ...["blocks", "reports"].map((a) => [
          "POST",
          a,
          { eventId: event, participant: members[1] },
        ]),
      ]) {
        assert.equal((await call(method, path, body, null)).status, 401, path);
        assert.equal((await call(method, path, body, "12")).status, 404, path);
      }
      assert.equal(
        (
          await call(
            "PUT",
            `events/${event}/meeting-points`,
            { meetingPoints: f.points },
            null,
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await call(
            "PUT",
            `events/${event}/meeting-points`,
            { meetingPoints: f.points },
            "2",
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await call("PUT", `events/${event}/meeting-points`, {
            meetingPoints: [
              { ...f.points[0], photoUrl: "javascript:alert(1)" },
            ],
          })
        ).status,
        400,
      );
      await db.query("UPDATE events SET status='ended' WHERE id=$1", [event]);
      assert.equal((await state()).status, 410);
    },
  );
});
