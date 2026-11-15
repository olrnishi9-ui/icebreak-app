// Actual UI + HTTP handler + embedded PostgreSQL. Only Supabase identity verification
// and SDK persisted credentials are fixtures; connection/profile payloads are not mocked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import { fixture, authId } from "./helpers/connections.mjs";
const base = process.env.TEST_BROWSER_URL || "http://127.0.0.1:3000";
const waitVisible = (page, name) =>
  page.getByRole("heading", { name, exact: true }).waitFor({ timeout: 9000 });
test("Task 3 browser: two contexts, restore, identical meeting, arrivals, retry/offline/cancel, and three indistinguishable rendered timelines", async (t) => {
  const f = await fixture();
  t.after(() => f.pg.close());
  await f.db.query(
    "UPDATE event_participants SET setup_complete=true,profile_saved=true WHERE event_id=$1",
    [f.event],
  );
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  t.after(() => browser.close());
  let offline = false,
    failSend = false;
  const errors = [];
  async function client(n) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(
      ({ id }) => {
        const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 }))}.fixture`;
        localStorage.setItem(
          "sb-meetmates-test-auth-token",
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
              is_anonymous: false,
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
      const req = route.request(),
        url = new URL(req.url());
      if (offline) return route.abort();
      assert.match(req.headers().authorization ?? "", /^Bearer /);
      const jwt = req.headers().authorization.split(" ")[1];
      assert.equal(
        JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).sub,
        authId(n),
      );
      if (
        failSend &&
        req.method() === "POST" &&
        url.pathname === "/api/connections"
      ) {
        failSend = false;
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Could not send. Try again." }),
        });
      }
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
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="320"><rect width="600" height="320" fill="#355e58"/><text x="40" y="150" fill="white" font-size="40">Venue photo fixture</text></svg>',
      }),
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/event/${f.event}?tab=Requests`);
    await waitVisible(page, "Already said hello?");
    return { context, page };
  }
  const a = await client(1),
    b = await client(2);
  t.after(() => Promise.all([a.context.close(), b.context.close()]));
  let A = a.page;
  const B = b.page;
  async function reopenA() {
    await A.close();
    A = await a.context.newPage();
    A.on("pageerror", (e) => errors.push(e.message));
    await A.goto(`${base}/event/${f.event}?tab=Requests`);
  }
  await A.getByRole("navigation").getByRole("button",{name:"Discover",exact:true}).click();
  await A.locator(".person")
    .filter({ has: A.getByRole("heading", { name: "Person 2", exact: true }) })
    .getByRole("button", { name: "Invite to chat" })
    .click();
  await waitVisible(A, "Invite Person 2 to chat");
  await A.locator(".request-choice select").selectOption("10");
  failSend = true;
  await A.getByRole("button", { name: "Send request", exact: true }).click();
  await A.getByRole("button", { name: "Retry request" }).waitFor();
  await A.getByRole("button", { name: "Retry request" }).click();
  await waitVisible(A, "Waiting for Person 2");
  await mkdir("work/screenshots", { recursive: true });
  await A.screenshot({
    path: "work/screenshots/task3-waiting-mobile.png",
    fullPage: true,
  });
  await reopenA();
  await waitVisible(A, "Waiting for Person 2");
  await B.getByRole("button", { name: "Accept", exact: true }).waitFor({
    timeout: 9000,
  });
  await B.locator(".incoming-request")
    .getByRole("button", { name: "Report", exact: true })
    .click();
  await B.getByText("Report received.", { exact: true }).waitFor();
  assert.equal(
    (await f.db.query("SELECT * FROM reports WHERE event_id=$1", [f.event]))
      .length,
    1,
  );
  await B.getByRole("button", { name: "Accept", exact: true }).click();
  await waitVisible(A, "Say hello to Person 2");
  await waitVisible(B, "Say hello to Person 1");
  assert.equal(
    await A.locator(".meeting-point").innerText(),
    await B.locator(".meeting-point").innerText(),
  );
  assert.equal(
    await A.locator(".meeting-point img").getAttribute("src"),
    await B.locator(".meeting-point img").getAttribute("src"),
  );
  assert.match(await A.locator(".connect-panel").innerText(), /10 minutes/);
  await reopenA();
  await waitVisible(A, "Say hello to Person 2");
  await A.screenshot({
    path: "work/screenshots/task3-meeting-mobile.png",
    fullPage: true,
  });
  await A.getByRole("button", { name: "I’m here", exact: true }).click();
  await A.getByText("You’re here. Waiting for your partner.", {
    exact: true,
  }).waitFor();
  await reopenA();
  await A.getByText("You’re here. Waiting for your partner.", {
    exact: true,
  }).waitFor();
  await B.getByRole("button", { name: "I’m here", exact: true }).click();
  await waitVisible(A, "Your conversation has started.");
  await waitVisible(B, "Your conversation has started.");
  await mkdir("work/screenshots", { recursive: true });
  await A.screenshot({
    path: "work/screenshots/task3-started-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await A.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  // All three worlds reuse the same pair, request ID and clock. Compare actual
  // rendered S4/S3 content, not a stand-in representation of the screen.
  const baseline = f.now,
    scenarios = [];
  for (const mode of ["later", "unseen", "opened"]) {
    f.now = baseline;
    await f.reset();
    const rid = "41000000-0000-4000-8000-000000000001";
    await f.db.query(
      `INSERT INTO connection_requests(id,event_id,sender_id,recipient_id,shared_reason,created_at,expires_at) VALUES($1,$2,$3,$4,'Coffee',$5,$6)`,
      [
        rid,
        f.event,
        f.members[0],
        f.members[1],
        new Date(baseline).toISOString(),
        new Date(baseline + 900000).toISOString(),
      ],
    );
    if (mode === "later") await f.respond(rid, "later");
    if (mode === "opened") await f.state("2");
    const timeline = [];
    for (const offset of [0, 899999, 900000, 900001]) {
      f.now = baseline + offset;
      await A.reload();
      if (offset < 900000) await waitVisible(A, "Waiting for Person 2");
      else await waitVisible(A, "Already said hello?");
      await A.getByText("Restoring your connections…", { exact: true }).waitFor(
        { state: "hidden" },
      );
      timeline.push({
        ui: await A.locator(".connect-panel").innerText(),
        boardVisible: await A.getByRole("switch").isVisible(),
        payload: (await f.state()).data,
      });
    }
    scenarios.push(timeline);
  }
  assert.deepEqual(scenarios[0], scenarios[1]);
  assert.deepEqual(scenarios[1], scenarios[2]);
  f.now = baseline;
  await f.reset();
  await A.reload();
  await B.reload();
  await f.send();
  await f.respond((await f.state()).data.outgoing[0].id, "accept");
  await waitVisible(A, "Say hello to Person 2");
  offline = true;
  await A.getByText(/Connection lost/)
    .first()
    .waitFor({ timeout: 9000 });
  assert.equal(
    await A.getByRole("button", { name: "I’m here", exact: true }).isDisabled(),
    true,
  );
  offline = false;
  await A.getByText(/Connection lost/)
    .first()
    .waitFor({ state: "hidden", timeout: 9000 });
  await A.getByRole("button", { name: "Cancel meeting" }).click();
  await waitVisible(A, "Already said hello?");
  await B.getByText("Plans changed. You’re open to chat again.", {
    exact: false,
  }).waitFor({ timeout: 9000 });
  await f.reset();
  await A.reload();
  await B.reload();
  await waitVisible(A, "Already said hello?");
  await waitVisible(B, "Already said hello?");
  const ownerCode = (await f.state("2")).data.shortCode;
  await A.getByLabel("Their short code").fill("NOTACODE");
  await A.getByRole("button", {
    name: "Connect with code",
    exact: true,
  }).click();
  await A.getByText("Code not found. Check it and try again.", {
    exact: true,
  }).waitFor();
  await A.getByLabel("Their short code").fill(ownerCode);
  await A.getByRole("button", {
    name: "Connect with code",
    exact: true,
  }).click();
  await waitVisible(A, "Waiting for Person 2");
  try {
    await B.getByRole("button", { name: "Start", exact: true }).waitFor({timeout:9000});
  } catch(e) {
    console.error('Code prompt diagnostic',JSON.stringify({server:(await f.state('2')).data,ui:await B.locator('.connect-panel').innerText(),errors}));
    throw e;
  }
  await B.getByRole("button", { name: "Start", exact: true }).click();
  await waitVisible(A, "Your conversation has started.");
  await waitVisible(B, "Your conversation has started.");
  assert.equal(await A.locator(".meeting-point").count(), 0);
  await f.reset();
  await f.send();
  await A.reload();await B.reload();
  await waitVisible(A, "Waiting for Person 2");
  await B.locator(".incoming-request")
    .getByRole("button", { name: "Block", exact: true })
    .waitFor({ timeout: 9000 });
  const senderBefore = await f.state();
  await B.locator(".incoming-request")
    .getByRole("button", { name: "Block", exact: true })
    .click();
  await B.getByText("Block saved.", { exact: true }).waitFor();
  assert.deepEqual(await f.state(), senderBefore);
  assert.equal(await B.locator(".incoming-request").count(), 0);
  await waitVisible(A, "Waiting for Person 2");
  assert.deepEqual(errors, []);
});
