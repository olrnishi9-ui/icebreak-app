import { test } from "node:test";
import assert from "node:assert/strict";
import { openNow } from "../lib/open-now.ts";
const now = Date.parse("2026-11-14T12:00:00Z");
const qs = [
  { id: "q1", options: ["Coffee", "Tea"] },
  { id: "q2", options: ["Morning", "Evening"] },
];
const a = (q, choice, skipped = false) => ({ questionId: q, choice, skipped });
const caller = { id: "self", goal: "Learn", answers: [a("q1", 0), a("q2", 1)] };
const p = (
  id,
  goal,
  answers,
  openedAt = "2026-11-14T11:59:00Z",
  openUntil = "2026-11-14T12:15:00Z",
) => ({ id, displayName: id, goal, answers, openedAt, openUntil });
const run = (rows) => openNow(caller, rows, qs, now, () => 0);
test("goal priority then shared answers; only fixed projection and one verbatim chip", () => {
  const result = run([
    p("other", "Socialize", caller.answers),
    p("same", "Learn", []),
    p("both", "Learn", [a("q1", 0)]),
  ]);
  assert.deepEqual(result, [
    { displayName: "both", goalLine: "Learn", chip: "Coffee" },
    { displayName: "same", goalLine: "Learn" },
    { displayName: "other", goalLine: "Socialize", chip: "Coffee" },
  ]);
});
test("recently opened breaks ties, then injected random values; does not mutate input", () => {
  const rows = [
    p("old", "Learn", [], "2026-11-14T11:50:00Z"),
    p("new", "Learn", []),
  ];
  const copy = structuredClone(rows);
  assert.equal(run(rows)[0].displayName, "new");
  assert.deepEqual(rows, copy);
  assert.equal(
    openNow(
      caller,
      [p("a", "Learn", []), p("b", "Learn", [])],
      qs,
      now,
      (id) => (id === "a" ? 1 : 0),
    )[0].displayName,
    "b",
  );
});
test("self, expired, boundary and closed excluded; explicit skips never contribute", () => {
  assert.deepEqual(
    run([
      p("self", "Learn", []),
      p("expired", "Learn", [], null, "2026-11-14T11:59:59Z"),
      p("boundary", "Learn", [], null, "2026-11-14T12:00:00Z"),
      p("closed", "Learn", [], null, null),
    ]),
    [],
  );
  assert.deepEqual(
    run([p("skipped", "Learn", [a("q1", null, true), a("q2", null, true)])]),
    [{ displayName: "skipped", goalLine: "Learn" }],
  );
});
