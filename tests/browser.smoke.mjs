// Presentation/interaction test only. API and Auth responses are deliberate fixtures.
// Build with placeholder NEXT_PUBLIC_SUPABASE_* and start Next before running.
import { test } from "node:test";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { chromium } from "playwright-core";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
const base = process.env.TEST_BROWSER_URL || "http://127.0.0.1:3000";
const eventId = "10000000-0000-4000-8000-000000000100";
const questions = Array.from({ length: 6 }, (_, i) => ({
  id: `q${i}`,
  prompt: i === 5 ? "What brings you here?" : `Preference ${i + 1}`,
  kind: i === 5 ? "event_goal" : "preference",
  options: i === 5 ? ["Find teammates", "Just socialize"] : ["Coffee", "Tea"],
  position: i,
}));
const initial = {
  event: { id: eventId, name: "Community Mixer", code: "HELLO26" },
  displayName: "Alex",
  goal: "Find teammates",
  field: "",
  funFact: "",
  fieldVisible: false,
  funFactVisible: false,
  topics: [],
  answers: [],
  questions,
  step: "setup",
  openUntil: null,
};

test("S1–S3 browser states, optional setup, edits, poll recovery, restore and QR at desktop/mobile (fixture backend)", async (t) => {
  await mkdir("work", { recursive: true });
  const userData = await mkdtemp("work/browser-profile-");
  const launch = () =>
    chromium.launchPersistentContext(userData, {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
      viewport: { width: 390, height: 844 },
    });
  let context = await launch();
  t.after(async () => {
    await context.close();
    await rm(userData, { recursive: true, force: true });
  });
  let page = await context.newPage();
  let profile = structuredClone(initial),
    joined = false,
    offline = false,
    delay = false,
    people = [],
    rejectQuestion = false;

  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  async function installFixtures() {
    await context.route("**/api/**", async (route) => {
      const url = new URL(route.request().url()),
        path = url.pathname,
        method = route.request().method();
      if (joined && (path === "/api/profile" || path.endsWith("/open"))) {
        assert.match(
          route.request().headers().authorization || "",
          /^Bearer .+/,
          "SDK session must restore and authorize private reads",
        );
      }
      let data = {};
      let status = 200;
      if (delay) await new Promise((r) => setTimeout(r, 300));
      if (path === "/api/events/WRONG") {
        status = 404;
        data = { error: "Event not found. Check the code and try again." };
      } else if (path === "/api/events/HELLO26")
        data = {
          id: eventId,
          name: "Community Mixer",
          status: "active",
          active: true,
        };
      else if (path === "/api/connections") data = {shortCode:"ABCD1234",incoming:[],outgoing:[],session:null};
      else if (path.endsWith("/questions")) data = questions;
      else if (path === "/api/events/join") {
        joined = true;
        const b = route.request().postDataJSON();
        profile.displayName = b.displayName;
        profile.goal = b.goal;
        data = profile;
      } else if (path === "/api/profile" && !joined) {
        status = 404;
        data = { error: "You have not joined this event." };
      } else if (path === "/api/profile") {
        if (method === "PUT") {
          const b = route.request().postDataJSON();
          profile = { ...profile, ...b };
        }
        data = profile;
      } else if (path === "/api/questionnaire") {
        if (rejectQuestion) {
          rejectQuestion = false;
          return route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              error: "Could not save your answer. Try again.",
            }),
          });
        }
        const b = route.request().postDataJSON();
        for (const a of b.answers) {
          profile.answers = profile.answers.filter(
            (x) => x.questionId !== a.questionId,
          );
          profile.answers.push(a);
        }
        if (b.complete !== false) profile.step = "home";
        data = profile;
      } else if (path.endsWith("/availability")) {
        profile.openUntil = route.request().postDataJSON().open
          ? new Date(Date.now() + 900000).toISOString()
          : null;
        data = { openUntil: profile.openUntil };
      } else if (path.endsWith("/open")) {
        if (offline) return route.abort();
        data = people;
      } else if (path.endsWith("/organiser"))
        data = {
          event: { id: eventId, name: "Community Mixer", status: "active" },
          joinCode: "HELLO26",
          joinUrl: `${base}/join/HELLO26`,
        };
      else if (path.endsWith("/membership")) {
        joined = false;
        data = { left: true };
      } else {
        status = 404;
        data = { error: "Unknown fixture path" };
      }
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    await context.route(
      "https://task2-test.supabase.co/auth/**",
      async (route) => {
        const user = {
          id: "10000000-0000-4000-8000-000000000001",
          aud: "authenticated",
          role: "authenticated",
          is_anonymous: true,
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        };
        const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            access_token: token,
            refresh_token: "fixture-only",
            token_type: "bearer",
            expires_in: 3600,
            user,
          }),
        });
      },
    );
  }
  await installFixtures();
  await page.goto(base);
  await page.getByLabel("Event code").fill("WRONG");
  await page.getByRole("button", { name: "Join event", exact: true }).click();
  await page.locator("p[role=alert]").waitFor();
  assert.match(
    await page.locator("p[role=alert]").innerText(),
    /Check the code/,
  );
  delay = true;
  await page.goto(`${base}/join/HELLO26`);
  await page.getByRole("status").waitFor();
  delay = false;
  await page.getByLabel("What should we call you?").fill("Alex");
  await page.getByLabel("What brings you here?").selectOption("Find teammates");
  const start = Date.now();
  await page.getByRole("button", { name: "Join event", exact: true }).click();
  await page.getByRole("button", { name: "Skip all and continue" }).waitFor();
  rejectQuestion = true;
  await page
    .getByRole("button", { name: "Coffee", exact: true })
    .first()
    .click();
  await page.locator("p[role=alert]").waitFor();
  assert.match(
    await page.locator("p[role=alert]").innerText(),
    /Could not save your answer/,
  );
  await page
    .getByRole("button", { name: "Coffee", exact: true })
    .first()
    .click();
  await page.getByRole('button',{name:'Coffee',exact:true,pressed:true}).first().waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Coffee", exact: true })
      .first()
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: "Skip all and continue" }).click();
  await page.getByRole("switch").waitFor();
  assert.ok(Date.now() - start < 30000);
  assert.ok(profile.answers.every((a) => a.skipped && a.choice === null));
  await page
    .getByText("Nobody’s open right now — you can be the first")
    .waitFor();
  await page.getByRole("switch").click();
  await page.getByText(/Open until/).waitFor();
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  await page.getByLabel("Fun fact", { exact: true }).fill("I keep bees");
  await page.getByLabel("Interests", { exact: true }).fill("walking\npainting");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit profile", exact: true })
    .waitFor();
  assert.equal(profile.topics.length, 2);
  await page.reload();
  await page.getByRole("switch").waitFor();
  assert.equal(
    await page.getByRole("switch").getAttribute("aria-checked"),
    "true",
  );
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  assert.equal(
    await page.getByLabel("Fun fact", { exact: true }).inputValue(),
    "I keep bees",
  );
  await page.getByRole("button", { name: "Close editor" }).click();
  people = [{ displayName: "Bea", goalLine: "Just socialize", chip: "Coffee" }];
  await page
    .getByRole("heading", { name: "Bea", exact: true })
    .waitFor({ timeout: 7000 });
  offline = true;
  await page.getByText(/Connection lost/).waitFor({ timeout: 7000 });
  assert.equal(await page.getByRole("switch").isDisabled(), true);
  offline = false;
  await page
    .getByText(/Connection lost/)
    .waitFor({ state: "hidden", timeout: 7000 });
  await mkdir("work/screenshots", { recursive: true });
  await page.screenshot({
    path: "work/screenshots/open-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "work/screenshots/open-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit your answers" }).click();
  await page
    .getByRole("button", { name: "Coffee", exact: true })
    .first()
    .click();
  await page.getByRole('button',{name:'Coffee',exact:true,pressed:true}).first().waitFor();
  await page.reload();
  await page.getByRole("switch").waitFor();
  await page.getByRole("button", { name: "Edit your answers" }).click();
  await page.getByRole('button',{name:'Coffee',exact:true,pressed:true}).first().waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Coffee", exact: true })
      .first()
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.goto(`${base}/organiser/${eventId}`);
  await page
    .getByRole("img", { name: "Scan to join Community Mixer" })
    .waitFor();
  await page.screenshot({
    path: "work/screenshots/invitation.png",
    fullPage: true,
  });
  const qrPixels = await page
    .getByRole("img", { name: "Scan to join Community Mixer" })
    .evaluate(async (img) => {
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return {
        width: c.width,
        height: c.height,
        pixels: Array.from(ctx.getImageData(0, 0, c.width, c.height).data),
      };
    });
  assert.equal(
    jsQR(
      new Uint8ClampedArray(qrPixels.pixels),
      qrPixels.width,
      qrPixels.height,
    )?.data,
    `${base}/join/HELLO26`,
  );
  await page.goto(base);
  await page.screenshot({ path: "work/screenshots/home.png", fullPage: true });
  await page.close();
  page = await context.newPage();
  await page.goto(`${base}/event/${eventId}`);
  await page.getByRole("switch").waitFor();
  assert.equal(
    await page.getByRole("switch").getAttribute("aria-checked"),
    "true",
  );
  await context.close();
  context = await launch();
  await installFixtures();
  page = await context.newPage();
  await page.goto(`${base}/event/${eventId}`);
  await page.getByRole("switch").waitFor();
  assert.equal(
    await page.getByRole("switch").getAttribute("aria-checked"),
    "true",
  );
  await page.getByRole("button", { name: "Edit profile", exact: true }).click();
  assert.equal(
    await page.getByLabel("Fun fact", { exact: true }).inputValue(),
    "I keep bees",
  );
  assert.equal(profile.answers.find((a) => a.questionId === "q0").choice, 0);
  assert.deepEqual(errors, []);
});
