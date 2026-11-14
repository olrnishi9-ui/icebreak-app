import test from "node:test";
import assert from "node:assert/strict";
import { buildArc, ARC_COPY } from "../lib/arc.ts";
import { localArcAction } from "../lib/arc-client.ts";
import { fixture } from "./helpers/connections.mjs";
const questions = [0, 1, 2].map((n) => ({
  id: String(n),
  position: n,
  kind: "preference",
  prompt: "Choose",
  options: [`A${n}`, `B${n}`],
}));
const person = (choice = 0) => ({
  goal: "Find teammates",
  answers: questions.map((q) => ({ questionId: q.id, choice, skipped: false })),
  interests: [],
});
const topic = (interest_type, topic, share_consent = true) => ({
  interest_type,
  topic,
  share_consent,
});
test("buildArc: ordered verbatim shared/difference/situational, seek/offer preference, ask-me-about and no reuse", () => {
  const a = person(),
    b = person();
  let arc = buildArc(a, b, { name: "Room", questions });
  assert.deepEqual(arc.cards[0].facts, ["A0"]);
  assert.deepEqual(arc.cards.find((c) => c.kind === "deepen").facts, ["A1"]);
  assert.deepEqual(arc, buildArc(a, b, { name: "Room", questions }));
  arc = buildArc(a, person(1), { name: "Room", questions });
  assert.equal(arc.cards[0].framing, "Different answers");
  assert.deepEqual(arc.cards[0].facts, ["A0", "B0"]);
  const short = buildArc(
    { ...a, answers: [] },
    { ...b, answers: [] },
    { name: "Room", questions },
  );
  assert.deepEqual(short, {
    cards: [
      { kind: "prep", framing: "Both at this event", facts: ["Room"] },
      { kind: "expand", framing: "A shared goal", facts: ["Find teammates"] },
      { kind: "close", framing: ARC_COPY.close, facts: [] },
    ],
    notice: ARC_COPY.short,
    disclosure: ARC_COPY.disclosure,
  });
  a.interests = [
    topic("help", "TypeScript"),
    topic("ask_me_about", "My first garden"),
    topic("ask_me_about", "PRIVATE", false),
  ];
  b.interests = [
    topic("learn", "TypeScript"),
    topic("ask_me_about", "Building a boat"),
  ];
  arc = buildArc(a, b, { name: "Room", questions });
  assert.deepEqual(arc.cards[1].facts, ["TypeScript"]);
  assert.deepEqual(arc.cards[2].aboutB, ["Building a boat"]);
  assert.deepEqual(arc.cards[2].aboutA, ["My first garden"]);
  assert.ok(!JSON.stringify(arc).includes("PRIVATE"));
  const allowed = new Set([
    "Room",
    "Find teammates",
    "TypeScript",
    "My first garden",
    "Building a boat",
    ...questions.flatMap((q) => q.options),
    ...Object.values(ARC_COPY),
    "A shared answer",
    "Help and learn",
    "Ask me about",
  ]);
  for (const c of arc.cards)
    for (const text of [
      c.framing,
      ...c.facts,
      ...(c.aboutA ?? []),
      ...(c.aboutB ?? []),
    ])
      assert.ok(allowed.has(text), text);
});
async function start(f, a = "1", b = "2") {
  const n = Number(b) - 1;
  // Complete questionnaire for both authenticated clients before opening and inviting.
  for (const who of [a, b]) {
    assert.equal(
      (
        await f.call(
          "POST",
          "questionnaire",
          {
            eventId: f.event,
            answers: f.qs.map((q, i) => ({
              questionId: q.id,
              choice: i < 3 ? 0 : null,
              skipped: i >= 3,
            })),
          },
          who,
        )
      ).status,
      200,
    );
    await f.call("PUT", `events/${f.event}/availability`, { open: true }, who);
  }
  const sent = await f.send(a, f.members[n]);
  assert.equal(sent.status, 200);
  const incoming = (await f.state(b)).data.incoming.find(
    (r) => r.id === sent.data.outgoing.at(-1).id,
  );
  assert.ok(incoming);
  const accept = await f.respond(incoming.id, "accept", b);
  assert.equal(accept.status, 200);
  const id = accept.data.session.id;
  let av = (await f.state(a)).data.session,
    bv = (await f.state(b)).data.session;
  assert.deepEqual(av.arc.script, bv.arc.script);
  assert.equal(av.state, "meeting");
  assert.deepEqual(av.meetingPoint, bv.meetingPoint);
  assert.equal(av.arc.side, "a");
  assert.equal(bv.arc.side, "b");
  await f.session(id, "arrive", a);
  await f.session(id, "arrive", b);
  for (const who of [a, b])
    assert.equal((await f.state(who)).data.session.state, "started");
  return id;
}
const read = (f, id, who = "1") =>
  f.call("GET", `sessions/${id}/arc?eventId=${f.event}`, undefined, who);
const act = (f, id, action, position, who = "1", extra = {}) =>
  f.call(
    "POST",
    `sessions/${id}/arc`,
    { eventId: f.event, action, position, ...extra },
    who,
  );
const done = (f, id, who, choice = null, optedIn = false) =>
  act(f, id, "done", undefined, who, { choice, optedIn });
function safe(v) {
  for (const [key, value] of Object.entries(v ?? {})) {
    assert.ok(
      !/score|rank|count|percent|compatib|close.?reason|trigger|auth|token|credential|feedback/i.test(
        key,
      ),
      key,
    );
    if (value && typeof value === "object") safe(value);
  }
}
test("two authenticated sessions full end-to-end, roles, timed offers, race, restore, offline script, close, exchange, feedback", async () => {
  const f = await fixture();
  try {
    for (const [a, b] of [
      ["1", "2"],
      ["3", "4"],
    ]) {
      const id = await start(f, a, b);
      let v = (await read(f, id, a)).data;
      const script = structuredClone(v.script);
      f.now += 75000;
      assert.equal((await read(f, id, a)).data.offered, true);
      assert.equal((await read(f, id, b)).data.position, 0);
      await Promise.all([
        act(f, id, "advance", 0, a),
        act(f, id, "advance", 0, b),
      ]);
      v = (await read(f, id, a)).data;
      assert.equal(v.position, 1);
      assert.equal(v.role, "starter");
      assert.equal((await read(f, id, b)).data.role, "listener");
      await act(f, id, "advance", 1, a);
      v = (await read(f, id, a)).data;
      assert.equal(v.script.cards[v.position].kind, "deepen");
      assert.equal(v.role, "listener");
      assert.equal((await read(f, id, b)).data.role, "starter");
      // Independent reads model closing/reopening clients: exact stored card and role.
      assert.deepEqual((await read(f, id, a)).data, v);
      // Offline traversal invokes the exact reducer used by the screen, with no API calls.
      let local = structuredClone(v);
      while (local.phase !== "closing") {
        local = localArcAction(local, "advance");
        assert.deepEqual(local.script, script);
      }
      await act(f, id, "wrap-up", v.position, a);
      for (const who of [a, b]) {
        const end = (await read(f, id, who)).data;
        assert.equal(end.phase, "closing");
        safe(end);
      }
      await done(f, id, a, "again");
      assert.equal((await read(f, id, b)).data.outcome, null);
      await done(f, id, b, "again");
      assert.equal((await read(f, id, a)).data.outcome, "again");
      const submit = await f.call(
        "POST",
        "feedback",
        {
          eventId: f.event,
          sessionId: id,
          conversation_ease: 4,
          perceived_value: 5,
          willingness_to_reconnect: true,
        },
        a,
      );
      assert.equal(submit.status, 200);
      await f.call(
        "POST",
        "feedback",
        { eventId: f.event, sessionId: id, conversation_ease: 4 },
        a,
      );
      assert.equal(
        (
          await f.db.query("SELECT * FROM feedback WHERE interaction_id=$1", [
            id,
          ])
        ).length,
        1,
      );
      safe((await read(f, id, b)).data);
    }
  } finally {
    await f.pg.close();
  }
});
test("closing indistinguishability: early wrap-up and accepted scheduled close have identical payloads and UI state", async () => {
  const f = await fixture();
  try {
    const id = await start(f);
    const initial = (
      await f.db.query("SELECT * FROM sessions WHERE id=$1", [id])
    )[0];
    f.now += 90000;
    await act(f, id, "wrap-up", 0);
    const early = await Promise.all(
      ["1", "2"].map(async (who) => (await read(f, id, who)).data),
    );
    assert.equal(
      (
        await f.db.query("SELECT close_reason FROM sessions WHERE id=$1", [id])
      )[0].close_reason,
      "either",
    );
    await act(f, id, "keep-talking");
    let v = (await read(f, id)).data;
    while (v.script.cards[v.position + 1].kind !== "close") {
      await act(f, id, "advance", v.position);
      v = (await read(f, id)).data;
    }
    f.now = new Date(initial.started_at).getTime() + 240000;
    await act(f, id, "advance", v.position);
    const natural = await Promise.all(
      ["1", "2"].map(async (who) => (await read(f, id, who)).data),
    );
    assert.deepEqual(early, natural);
    assert.equal(
      (
        await f.db.query("SELECT close_reason FROM sessions WHERE id=$1", [id])
      )[0].close_reason,
      "timer",
    );
    early.forEach(safe);
    // Both renders use the same phase + script's fixed closing card, no trigger data.
    assert.equal(
      early[0].script.cards[early[0].position].framing,
      ARC_COPY.close,
    );
  } finally {
    await f.pg.close();
  }
});
test("exchange double opt-in, private notes, feedback, RLS, outsider/cross-event/auth, close side effects", async () => {
  const f = await fixture();
  try {
    const id = await start(f);
    for (const [user, field, value, visibility] of [
      [f.members[0], "email", "visible@example.org", "mutual_connection"],
      [f.members[0], "phone", "SECRET", "private"],
      [f.members[1], "website", "https://example.org", "mutual_connection"],
    ])
      await f.db.query(
        "INSERT INTO user_contacts(user_id,field,value,visibility,share_consent,consented_at) VALUES($1,$2,$3,$4,true,now())",
        [user, field, value, visibility],
      );
    await act(f, id, "wrap-up", 0);
    await done(f, id, "1", "exchange", true);
    await done(f, id, "2", "exchange", false);
    for (const who of ["1", "2"]) {
      const v = (await read(f, id, who)).data;
      assert.equal(v.outcome, null);
      assert.deepEqual(v.contacts, []);
    }
    // Trusted reset to exercise the second consent fixture on the same session.
    await f.db.query("DELETE FROM session_choices WHERE session_id=$1", [id]);
    await done(f, id, "1", "exchange", true);
    assert.deepEqual((await read(f, id)).data.contacts, []);
    await done(f, id, "2", "exchange", true);
    assert.deepEqual((await read(f, id, "2")).data.contacts, [
      { field: "email", value: "visible@example.org" },
    ]);
    assert.deepEqual((await read(f, id)).data.contacts, [
      { field: "website", value: "https://example.org" },
    ]);
    for (const value of ["A remembered fact", "An edited fact", ""]) {
      assert.equal(
        (
          await f.call("PUT", `sessions/${id}/note`, {
            eventId: f.event,
            text: value,
          })
        ).status,
        200,
      );
      const people = (await f.call("GET", `people?eventId=${f.event}`)).data;
      assert.equal(people[0].note, value);
      assert.ok(
        !JSON.stringify((await read(f, id, "2")).data).includes(
          value || "NONEXISTENT",
        ),
      );
    }
    await f.call("PUT", `sessions/${id}/note`, {
      eventId: f.event,
      text: "PRIVATE NOTE",
    });
    const before = await read(f, id, "2");
    await f.call("POST", "feedback", {
      eventId: f.event,
      sessionId: id,
      conversation_ease: 3,
    });
    assert.deepEqual(await read(f, id, "2"), before);
    await f.asUser(1, async () =>
      assert.equal((await f.pg.query("SELECT * FROM feedback")).rows.length, 0),
    );
    await f.asUser(2, async () => {
      assert.equal(
        (await f.pg.query("SELECT * FROM session_notes")).rows.length,
        0,
      );
      assert.equal((await f.pg.query("SELECT * FROM feedback")).rows.length, 0);
      assert.ok(
        !(await f.pg.query("SELECT value FROM user_contacts")).rows.some(
          (c) => c.value === "visible@example.org",
        ),
      );
      assert.equal(
        (await f.pg.query("SELECT id,arc_script,arc_position FROM sessions"))
          .rows.length,
        1,
      );
    });
    await f.asUser(3, async () =>
      assert.equal(
        (await f.pg.query("SELECT id,arc_script FROM sessions")).rows.length,
        0,
      ),
    );
    await assert.rejects(() =>
      f.asUser(1, () => f.pg.query("SELECT close_reason FROM sessions")),
    );
    assert.equal((await read(f, id, "3")).status, 404);
    const other = (
      await f.call("POST", "events", { name: "Other event" }, "11")
    ).data;
    for (const route of [
      `sessions/${id}/arc`,
      `sessions/${id}/note`,
      "people",
      "feedback",
    ]) {
      const method =
        route.endsWith("/arc") || route === "people"
          ? "GET"
          : route === "feedback"
            ? "POST"
            : "PUT";
      assert.equal(
        (
          await f.call(
            method,
            `${route}?eventId=${f.event}`,
            method === "GET"
              ? undefined
              : { eventId: f.event, sessionId: id, text: "x" },
            null,
          )
        ).status,
        401,
      );
      const wrong = await f.call(
        method,
        `${route}?eventId=${other.event.id}`,
        method === "GET"
          ? undefined
          : { eventId: other.event.id, sessionId: id, text: "x" },
      );
      assert.equal(wrong.status, 404);
    }
    const paused = await f.db.query(
      "SELECT availability_status FROM event_participants WHERE event_id=$1 AND user_id IN($2,$3)",
      [f.event, ...f.members.slice(0, 2)],
    );
    assert.ok(paused.every((p) => p.availability_status === "unavailable"));
    assert.equal(
      (
        await f.db.query(
          "SELECT id FROM sessions WHERE id=$1 AND closed_at IS NULL",
          [id],
        )
      ).length,
      0,
    );
    for (const who of ["1", "2"])
      assert.equal(
        (
          await f.call(
            "PUT",
            `events/${f.event}/availability`,
            { open: true },
            who,
          )
        ).status,
        200,
      );
    const open = (await f.call("GET", `events/${f.event}/open`)).data;
    assert.equal(open.at(-1).participantId, f.members[1]);
  } finally {
    await f.pg.close();
  }
});

test("code-enterer starts, frozen script, skip persistence, shortened proportional offers, minimal exhaustion and invalid inputs", async () => {
  const f = await fixture();
  try {
    // All skipped on both sides produces the exact honest short arc, even with optional topics.
    await f.db.query("DELETE FROM answers WHERE event_id=$1", [f.event]);
    const code = (await f.state("2")).data.shortCode;
    assert.equal(
      (
        await f.call(
          "POST",
          "connections/code",
          { eventId: f.event, code },
          "1",
        )
      ).status,
      200,
    );
    await f.respond((await f.state()).data.outgoing.at(-1).id, "accept");
    const session = (await f.state()).data.session,
      id = session.id;
    assert.equal(session.state, "started");
    assert.equal(session.arc.side, "a");
    assert.deepEqual(
      session.arc.script.cards.map((c) => c.kind),
      ["prep", "expand", "close"],
    );
    const script = session.arc.script;
    await f.db.query(
      "UPDATE event_participants SET goal='Explore something new' WHERE event_id=$1 AND user_id=$2",
      [f.event, f.members[1]],
    );
    assert.deepEqual((await read(f, id)).data.script, script);
    // Stored duration stays an approved 5/10. The injected test clock advances across offer boundaries.
    f.now += 74999;
    assert.equal((await read(f, id)).data.offered, false);
    f.now++;
    assert.equal((await read(f, id)).data.offered, true);
    assert.equal((await read(f, id)).data.position, 0);
    assert.equal((await act(f, id, "skip", "bad")).status, 400);
    await act(f, id, "skip", 0);
    let v = (await read(f, id, "2")).data;
    assert.deepEqual(v.skipped, [0]);
    assert.equal(v.cardsState[0], "skipped");
    assert.equal(v.role, "listener");
    assert.equal(v.offered, false);
    f.now += 165000;
    v = (await read(f, id)).data;
    assert.equal(v.offered, true);
    assert.equal(v.position, 1);
    assert.deepEqual(v.script, script);
    await Promise.all([
      act(f, id, "wrap-up", 1),
      act(f, id, "advance", 1, "2"),
    ]);
    assert.equal(
      (await f.db.query("SELECT * FROM interactions WHERE id=$1", [id])).length,
      1,
    );
    assert.equal(
      (
        await act(f, id, "done", undefined, "1", {
          choice: "INVALID",
          optedIn: true,
        })
      ).status,
      400,
    );
    await done(f, id, "1", "again");
    await done(f, id, "2");
    for (const who of ["1", "2"])
      assert.equal((await read(f, id, who)).data.outcome, null);
    assert.equal(
      (
        await f.call("POST", "feedback", {
          eventId: f.event,
          sessionId: id,
          conversation_ease: 6,
        })
      ).status,
      400,
    );
    assert.equal(
      (await f.db.query("SELECT * FROM feedback WHERE interaction_id=$1", [id]))
        .length,
      0,
    );
    assert.equal(
      (
        await f.call("PUT", `sessions/${id}/note`, {
          eventId: f.event,
          text: "x".repeat(501),
        })
      ).status,
      400,
    );
  } finally {
    await f.pg.close();
  }
});

test("one-sided ask-me-about falls back to unused verbatim material for the other view", () => {
  const a = person(),
    b = person();
  b.interests = [topic("ask_me_about", "My boat")];
  const arc = buildArc(a, b, { name: "Room", questions }),
    deepen = arc.cards.find((c) => c.kind === "deepen");
  assert.deepEqual(deepen.aboutB, ["My boat"]);
  assert.deepEqual(deepen.aboutA, []);
  assert.deepEqual(deepen.fallback, {
    framing: "A shared answer",
    facts: ["A1"],
  });
  assert.ok(
    !arc.cards
      .filter((c) => c.kind === "spare")
      .some((c) => c.facts.includes("A1")),
  );
});
