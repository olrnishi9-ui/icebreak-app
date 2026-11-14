// Real Next UI → HTTP handler → PostgreSQL; only Supabase identity is a fixture.
import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { fixture, authId } from "./helpers/connections.mjs";
const base = process.env.TEST_BROWSER_URL || "http://127.0.0.1:3000";
test("Task 4 rendered closing indistinguishability, two authenticated contexts, restore, full UI exchange/feedback and offline remaining cards", async (t) => {
  const f = await fixture();
  t.after(() => f.pg.close());
  await f.db.query(
    "UPDATE event_participants SET setup_complete=true WHERE event_id=$1",
    [f.event],
  );
  for (const who of ["1", "2"])
    await f.call(
      "POST",
      "questionnaire",
      {
        eventId: f.event,
        complete: false,
        answers: f.qs
          .slice(0, 3)
          .map((q) => ({ questionId: q.id, choice: 0, skipped: false })),
      },
      who,
    );
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  t.after(() => browser.close());
  const errors = [];
  let offline = false;
  async function client(n) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(
      ({ id }) => {
        const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 }))}.fixture`;
        localStorage.setItem(
          "sb-task2-test-auth-token",
          JSON.stringify({
            access_token: token,
            refresh_token: "fixture",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            expires_in: 3600,
            token_type: "bearer",
            user: {
              id,
              aud: "authenticated",
              role: "authenticated",
              is_anonymous: true,
              app_metadata: {},
              user_metadata: {},
              created_at: new Date().toISOString(),
            },
          }),
        );
      },
      { id: authId(n) },
    );
    await context.route("**/api/**", async (route) => {
      if (offline) return route.abort();
      const req = route.request(),
        url = new URL(req.url());
      const r = await f.call(
        req.method(),
        url.pathname.replace("/api/", "") + url.search,
        req.postData() ? req.postDataJSON() : undefined,
        String(n),
      );
      await route.fulfill({
        status: r.status,
        contentType: "application/json",
        body: JSON.stringify(r.data),
      });
    });
    await context.route("https://example.org/*.jpg", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
      }),
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/event/${f.event}`);
    return { page, context };
  }
  const a = await client(1),
    b = await client(2);
  t.after(() => Promise.all([a.context.close(), b.context.close()]));
  const A = a.page,
    B = b.page;
  const visible = (page, text) =>
    page.getByText(text, { exact: true }).waitFor({ timeout: 12000 });
  await A.locator(".person")
    .filter({ has: A.getByRole("heading", { name: "Person 2", exact: true }) })
    .getByRole("button", { name: "Invite to chat" })
    .click();
  await A.getByRole("button", { name: "Send request", exact: true }).click();
  await B.getByRole("button", { name: "Accept", exact: true }).click({
    timeout: 12000,
  });
  await visible(A, "A moment to prepare");
  await visible(B, "A moment to prepare");
  await A.getByRole("button", { name: "I’m here", exact: true }).click();
  await B.getByRole("button", { name: "I’m here", exact: true }).click();
  await visible(A, "Your conversation has started.");
  await visible(B, "Your conversation has started.");
  const id = (await f.state()).data.session.id;
  f.now += 90000;
  await A.getByRole("button", { name: "Wrap up", exact: true }).click();
  await visible(B, "One thing to remember");
  const early = [
    await A.locator(".conversation").innerText(),
    await B.locator(".conversation").innerText(),
  ];
  await A.getByRole("button", { name: "Keep talking", exact: true }).click();
  await visible(B, "Your conversation has started.");
  await A.getByRole("button", { name: "Next card", exact: true }).click();
  await visible(B, "A shared goal");
  await A.getByRole("button", { name: "Next card", exact: true }).click();
  await visible(B, "Morning");
  await A.reload();
  await visible(A, "Morning");
  assert.ok(
    (await A.locator(".conversation").innerText()).includes(
      "Ask one follow-up question.",
    ),
  );
  // Advance to closing through all remaining real material.
  let v = (await f.call("GET", `sessions/${id}/arc?eventId=${f.event}`)).data;
  while (v.script.cards[v.position + 1].kind !== "close") {
    await A.getByRole("button", { name: "Next card", exact: true }).click();
    await A.waitForFunction(
      (pos) =>
        document.querySelector(".conversation")?.textContent.includes(pos),
      v.script.cards[v.position + 1].framing,
    );
    v = (await f.call("GET", `sessions/${id}/arc?eventId=${f.event}`)).data;
  }
  f.now += 240000;
  await A.getByRole("button", { name: "Next card", exact: true }).click();
  await visible(B, "One thing to remember");
  assert.deepEqual(
    [
      await A.locator(".conversation").innerText(),
      await B.locator(".conversation").innerText(),
    ],
    early,
  );
  // Replay stored script offline: no response supplies any remaining card.
  await A.getByRole("button", { name: "Keep talking", exact: true }).click();
  await A.reload();
  await A.locator(".conversation").waitFor();
  offline = true;
  await visible(
    A,
    "Offline. Your cards still work; changes will sync when connected.",
  );
  v = (await f.call("GET", `sessions/${id}/arc?eventId=${f.event}`)).data;
  for (let i = v.position + 1; i < v.script.cards.length; i++) {
    await A.getByRole("button", { name: "Next card", exact: true }).click();
    if (v.script.cards[i].kind === "close")
      await visible(A, "One thing to remember");
    else await visible(A, v.script.cards[i].framing);
  }
  offline = false;
  await A.getByRole("button", { name: "Done", exact: true }).click();
  await visible(A, "That’s a wrap.");
  await visible(B, "One thing to remember");
  await B.getByRole("button", { name: "Done", exact: true }).click();
  await visible(
    A,
    "Optional feedback about the conversation format, never the person.",
  );
  await A.getByRole("button", { name: "High", exact: true }).first().click();
  await A.getByRole("button", {
    name: "Save optional feedback",
    exact: true,
  }).click();
  await B.getByRole("button", { name: "Skip feedback", exact: true }).click();
  await A.getByRole("button", {
    name: "Back to the room · stay paused",
    exact: true,
  }).click();
  await A.getByRole("switch").waitFor();
  assert.equal(
    await A.getByRole("switch").getAttribute("aria-checked"),
    "false",
  );
  await A.getByRole("button", {
    name: "My People · private",
    exact: true,
  }).click();
  await visible(A, "People you met");
  assert.equal(
    await A.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  // A second independent pair traverses EVERY remaining card with API traffic blocked.
  for (const who of ["3", "4"]) {
    await f.call(
      "POST",
      "questionnaire",
      {
        eventId: f.event,
        complete: false,
        answers: f.qs
          .slice(0, 3)
          .map((q) => ({ questionId: q.id, choice: 0, skipped: false })),
      },
      who,
    );
  }
  const c = await client(3),
    d = await client(4);
  t.after(() => Promise.all([c.context.close(), d.context.close()]));
  const C = c.page,
    D = d.page;
  await C.locator(".person")
    .filter({ has: C.getByRole("heading", { name: "Person 4", exact: true }) })
    .getByRole("button", { name: "Invite to chat" })
    .click();
  await C.getByRole("button", { name: "Send request", exact: true }).click();
  await D.getByRole("button", { name: "Accept", exact: true }).click({
    timeout: 12000,
  });
  await C.getByRole("button", { name: "I’m here", exact: true }).click();
  await D.getByRole("button", { name: "I’m here", exact: true }).click();
  await visible(C, "Your conversation has started.");
  const second = (await f.state("3")).data.session;
  offline = true;
  await visible(
    C,
    "Offline. Your cards still work; changes will sync when connected.",
  );
  for (const card of second.arc.script.cards.slice(1)) {
    await C.getByRole("button", { name: "Next card", exact: true }).click();
    await visible(
      C,
      card.kind === "close" ? "One thing to remember" : card.framing,
    );
  }
  offline = false;
  await C.getByRole("button", { name: "Done", exact: true }).click();
  await visible(D, "One thing to remember");
  await D.getByRole("button", { name: "Done", exact: true }).click();
  for (const page of [C, D])
    await page
      .getByRole("button", { name: "Skip feedback", exact: true })
      .click();
  assert.deepEqual(errors, []);
});
