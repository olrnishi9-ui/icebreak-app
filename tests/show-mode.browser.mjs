// Actual browser + Supabase SDK Anonymous Auth mechanics + real SQL-backed API.
// Auth signup responses are fixtures; hosted Auth, DB and deployment are not proven.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { fixture, authId } from "./helpers/connections.mjs";
import { handler } from "../lib/http.ts";
import { showEventId } from "../lib/show-seed.ts";
const base = process.env.TEST_BROWSER_URL || "http://localhost:3001";
const dir = "docs/screenshots/task6-show";
function session(who) {
  const id = authId(who);
  return {
    access_token: `${Buffer.from("{}").toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600, is_anonymous: true })).toString("base64url")}.fixture`,
    refresh_token: "fixture",
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
  };
}
test("Show Mode: email label → Anonymous Auth → Choose Event → editable profile → real two-device introduction, extend and feedback", async (t) => {
  const f = await fixture();
  t.after(() => f.pg.close());
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  t.after(() => browser.close());
  await mkdir(dir, { recursive: true });
  const errors = [];
  const authCalls = [];
  async function page(who) {
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const run = handler(
      f.db,
      async (token) =>
        token === session(who).access_token ||
        (token.split(".")[1] &&
          JSON.parse(Buffer.from(token.split(".")[1], "base64url")).sub ===
            authId(who))
          ? { id: authId(who), anonymous: true }
          : null,
      () => f.now,
    );
    await c.route("**/auth/v1/**", async (route) => {
      const req = route.request(),
        u = new URL(req.url());
      authCalls.push(u.pathname);
      if (u.pathname.endsWith("/signup")) {
        assert.equal(req.postDataJSON().email, undefined);
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(session(who)),
        });
      }
      if (u.pathname.endsWith("/user"))
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify(session(who).user),
        });
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: "{}",
      });
    });
    await c.route("**/api/**", async (route) => {
      const req = route.request(),
        u = new URL(req.url());
      const response = await run(
        new Request(u.href, {
          method: req.method(),
          headers: req.headers(),
          ...(req.postData() ? { body: req.postData() } : {}),
        }),
        u.pathname.replace("/api/", "").split("/"),
      );
      await route.fulfill({
        status: response.status,
        contentType: "application/json",
        body: await response.text(),
      });
    });
    const p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    return p;
  }
  async function shot(p, name) {
    await p.screenshot({ path: `${dir}/${name}.png` });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(
      await p.getByRole("button").evaluateAll((bs) =>
        bs
          .filter((b) => {
            const r = b.getBoundingClientRect();
            return (
              r.width > 0 && r.height > 0 && (r.width < 48 || r.height < 48)
            );
          })
          .map((b) => b.textContent),
      ),
      [],
    );
  }
  async function enter(p, email, name, save = true) {
    await p.goto(`${base}/sign-in`);
    await p.getByLabel("Email address").fill(email);
    if (name === "Alice Show") await shot(p, "01-sign-in");
    await p.getByRole("button", { name: "Continue", exact: true }).click();
    await p
      .getByRole("heading", { name: "Choose Event", exact: true })
      .waitFor();
    assert.equal(new URL(p.url()).pathname, "/join");
    assert.equal(await p.getByLabel("Event code").inputValue(), "DEMO26");
    assert.equal(
      await p.getByText("Check your inbox", { exact: true }).count(),
      0,
    );
    if (name === "Alice Show") await shot(p, "02-choose-event");
    await p.getByRole("button", { name: "Continue", exact: true }).click();
    await p
      .getByRole("heading", { name: "Basic information", exact: true })
      .waitFor();
    assert.equal(
      await p.getByLabel("Name", { exact: true }).inputValue(),
      email.split("@")[0],
    );
    assert.equal(
      await p.getByLabel("Job title / role").inputValue(),
      "Attendee",
    );
    await p.getByLabel("Name", { exact: true }).fill(name);
    if (!save) return;
    for (let i = 0; i < 6; i++)
      await p.getByRole("button", { name: "Continue", exact: true }).click();
    await p
      .getByRole("button", { name: "Save my profile", exact: true })
      .click();
    await p
      .getByRole("heading", {
        name: `Hello, ${name.split(" ")[0]}.`,
        exact: true,
      })
      .waitFor();
    assert.equal(
      await p
        .getByRole("button", { name: "Skip all and continue", exact: true })
        .count(),
      0,
    );
  }
  const A = await page(11),
    B = await page(12);
  await enter(A, "alice@show.invalid", "Alice Show");
  await shot(A, "03-event-home");
  await A.getByRole("navigation")
    .getByRole("button", { name: "Profile", exact: true })
    .click();
  await A.getByAltText("Your personal check-in and follow-up QR").waitFor();
  await A.getByText("Show mode email label · unverified: alice@show.invalid", {
    exact: true,
  }).waitFor();
  await A.reload();
  await A.getByAltText("Your personal check-in and follow-up QR").waitFor();
  await enter(B, "bob@show.invalid", "Bob Show");
  await A.getByRole("navigation")
    .getByRole("button", { name: "Discover", exact: true })
    .click();
  const alex = A.locator(".person").filter({
    has: A.getByRole("heading", { name: "Alex Morgan", exact: true }),
  });
  await alex.getByText("Why you might connect", { exact: true }).waitFor();
  await alex
    .getByText("Shared goal: “Explore something new”.", { exact: true })
    .waitFor();
  await alex.scrollIntoViewIfNeeded();
  await shot(A, "04-discover-persona");
  const bob = A.locator(".person").filter({
    has: A.getByRole("heading", { name: "Bob Show", exact: true }),
  });
  await bob
    .getByRole("button", { name: "Request a Short Introduction", exact: true })
    .click();
  await A.getByRole("button", { name: "Send request", exact: true }).click();
  await A.getByRole("button", {
    name: "Withdraw request",
    exact: true,
  }).waitFor();
  await B.getByRole("navigation")
    .getByRole("button", { name: "Requests", exact: true })
    .click();
  await B.getByRole("button", { name: "Accept", exact: true }).click();
  await A.getByRole("button", { name: "I’m here", exact: true }).waitFor();
  await B.getByRole("button", { name: "I’m here", exact: true }).waitFor();
  const [s] = await f.db.query("SELECT * FROM sessions WHERE event_id=$1", [
    showEventId,
  ]);
  assert.ok(["Table 1", "Table 2"].includes(s.meeting_point.label));
  await A.getByRole("button", { name: "I’m here", exact: true }).click();
  await B.getByRole("button", { name: "I’m here", exact: true }).click();
  await A.getByRole("button", { name: "Wrap up", exact: true }).waitFor();
  f.now += 245000;
  await A.getByRole("button", { name: "Extend +5", exact: true }).click();
  await B.getByRole("button", {
    name: "Agree · Extend +5",
    exact: true,
  }).click();
  assert.equal(
    (await f.db.query("SELECT duration FROM sessions WHERE id=$1", [s.id]))[0]
      .duration,
    10,
  );
  await shot(A, "05-real-conversation");
  await A.getByRole("button", { name: "Wrap up", exact: true }).click();
  await A.getByRole("button", { name: "Done", exact: true }).waitFor();
  await A.getByRole("button", {
    name: "Save and Follow Up",
    exact: true,
  }).click();
  await A.getByRole("button", {
    name: "Save optional feedback",
    exact: true,
  }).waitFor();
  await A.getByRole("button", { name: "learning", exact: true }).click();
  await A.getByLabel("Private feedback note · optional").fill(
    "A private memory from the show.",
  );
  await A.getByRole("button", {
    name: "Save optional feedback",
    exact: true,
  }).click();
  await A.getByRole("button", {
    name: "Meet Someone New",
    exact: true,
  }).click();
  await A.getByRole("tab", { name: "For You", exact: true }).waitFor();
  assert.equal(
    (await f.db.query("SELECT * FROM feedback WHERE interaction_id=$1", [s.id]))
      .length,
    1,
  );
  assert.equal(authCalls.filter((x) => x.endsWith("/signup")).length, 2);
  assert.equal(
    authCalls.some((x) => /otp|verify/.test(x)),
    false,
    "no email delivery or verification endpoint in attendee path",
  );
  assert.deepEqual(errors, []);
});
