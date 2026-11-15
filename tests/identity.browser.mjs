// Browser + real application handler + migrated PGlite. Supabase email delivery,
// OTP verification and SDK credentials are fixtures; this cannot prove hosted Auth.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import jsQR from "jsqr";
import { fixture, authId } from "./helpers/connections.mjs";
const base = process.env.TEST_BROWSER_URL || "http://127.0.0.1:3000";
const dir = "docs/screenshots/task5a";
test("Part A mobile journey, profile review, QR decoding, shell, organiser check-in and existing conversation states", async (t) => {
  const f = await fixture();
  t.after(() => f.pg.close());
  await f.db.query(
    "UPDATE events SET name='Tech & Business Summit 2026' WHERE id=$1",
    [f.event],
  );
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  t.after(() => browser.close());
  await mkdir(dir, { recursive: true });
  const errors = [];
  async function context(who, signed = true) {
    const c = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    if (signed)
      await c.addInitScript(
        ({ id }) => {
          const token = `${btoa("{}")}.${btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 }))}.fixture`;
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
                email: "attendee@example.invalid",
                email_confirmed_at: new Date().toISOString(),
                app_metadata: {},
                user_metadata: {},
                created_at: new Date().toISOString(),
              },
            }),
          );
        },
        { id: authId(who) },
      );
    await c.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      const r = await f.call(
        req.method(),
        url.pathname.replace("/api/", "") + url.search,
        req.postData() ? req.postDataJSON() : undefined,
        String(who),
      );
      await route.fulfill({
        status: r.status,
        contentType: "application/json",
        body: JSON.stringify(r.data),
      });
    });
    const page = await c.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    return { c, page };
  }
  let shots = 0;
  async function shot(page, name) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${dir}/${name}.png` });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `${name}: no horizontal overflow`,
    );
    const small=await page.getByRole("button").evaluateAll(buttons=>buttons.filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<48||r.height<48);}).map(b=>b.textContent.trim()));assert.deepEqual(small,[],`${name}: all visible button targets at least 48×48`);
    shots++;
  }
  const { page: login, c: lc } = await context(11, false);
  await login.goto(base);
  await login.getByRole("button", { name: "Get started" }).waitFor();
  await shot(login, "01-landing");
  await login.getByLabel("Event code").fill(f.invite.joinCode);
  await login.getByRole("button", { name: "Get started" }).click();
  await login.getByLabel("Email address").waitFor();
  await shot(login, "02-email");
  await lc.route("**/auth/v1/otp", (r) =>
    r.fulfill({ contentType: "application/json", body: "{}" }),
  );
  await login.getByLabel("Email address").fill("alex@example.invalid");
  await login.getByRole("button", { name: "Send my code" }).click();
  await login.getByLabel("One-time code", { exact: true }).waitFor();
  await shot(login, "03-code");
  // Server-backed account/profile UI: identity is supplied by fixture SDK credentials.
  await lc.route("**/auth/v1/verify", async (route) => {
    if (route.request().postDataJSON().token !== "123456")
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          msg: "Code expired. Request a new code.",
          error_code: "otp_expired",
        }),
      });
    const id = authId(11),
      access_token = `${Buffer.from("{}").toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.fixture`;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        access_token,
        refresh_token: "fixture",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id,
          aud: "authenticated",
          role: "authenticated",
          is_anonymous: false,
          email: "alex@example.invalid",
          email_confirmed_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      }),
    });
  });
  await login.getByLabel("One-time code", { exact: true }).fill("999999");
  await login.getByRole("button", { name: "Verify and continue" }).click();
  await login.getByRole("alert").filter({ hasText: "Code expired" }).waitFor();
  await shot(login, "36-expired-code");
  await login.getByRole("button", { name: "Resend code", exact: true }).click();
  await login.getByLabel("One-time code", { exact: true }).fill("123456");
  await login.getByRole("button", { name: "Verify and continue" }).click();
  const A = login;
  await A.getByRole("heading", { name: "Basic information" }).waitFor();
  await A.getByLabel("Name", { exact: true }).fill("Alex Morgan");
  await A.getByLabel("Job title / role").fill("Product designer");
  await shot(A, "04-profile-basic");
  await A.getByRole("button", { name: "Continue", exact: true }).click();
  await A.getByLabel("Company, startup").fill("Common Ground");
  await shot(A, "05-profile-organization");
  await A.getByRole("button", { name: "Continue", exact: true }).click();
  await A.getByLabel("Industry").fill("Technology");
  await A.getByRole("textbox", {
    name: "Expertise · optional",
    exact: true,
  }).fill("Product design");
  await A.getByLabel("Short introduction").fill(
    "I design tools that bring people together.",
  );
  await shot(A, "06-profile-background");
  await A.getByRole("button", { name: "Continue", exact: true }).click();
  await A.getByRole("button", { name: "AI", exact: true }).click();
  await shot(A, "07-profile-interests");
  await A.getByRole("button", { name: "Continue", exact: true }).click();
  await A.getByRole("button", {
    name: "Find collaborators",
    exact: true,
  }).click();
  await shot(A, "08-profile-goals");
  await A.getByRole("button", { name: "Continue", exact: true }).click();
  await A.getByLabel("I can offer").fill("Product design");
  await A.getByLabel("I’m looking for").fill("Research collaborators");
  await shot(A, "09-profile-value");
  await A.getByRole("button", { name: "Continue", exact: true }).click();
  await shot(A, "10-profile-review");
  await A.getByRole("button", { name: "Save my profile" }).click();
  await A.getByRole("heading", {
    name: "A few easy conversation starters",
  }).waitFor();
  assert.equal(await A.locator("fieldset").count(), 5);
  await shot(A, "11-preferences");
  await A.getByRole("button", { name: "Skip all and continue" }).click();
  await A.getByRole("heading", { name: "Your personal QR" }).waitFor();
  await shot(A, "12-event-home");
  for (const [tab, name] of [
    ["Discover", "13-discover"],
    ["Requests", "14-requests"],
    ["Matches", "15-matches"],
    ["Profile", "16-profile-qr"],
  ]) {
    await A.getByRole("navigation")
      .getByRole("button", { name: tab, exact: true })
      .click();
    await A.getByRole("navigation")
      .getByRole("button", { name: tab, exact: true })
      .and(A.locator('[aria-current="page"]'))
      .waitFor();
    if (tab === "Profile")
      await A.getByAltText("Your personal check-in and follow-up QR").waitFor();
    await shot(A, name);
  }
  const pixels = await A.getByAltText(
    "Your personal check-in and follow-up QR",
  ).evaluate((img) => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    return {
      data: Array.from(
        c.getContext("2d").getImageData(0, 0, c.width, c.height).data,
      ),
      size: c.width,
    };
  });
  const qr = jsQR(
    new Uint8ClampedArray(pixels.data),
    pixels.size,
    pixels.size,
  ).data;
  assert.ok(!qr.includes(authId(11)));
  assert.match(qr, /\/qr\/.+\/[0-9a-f]{64}$/);
  const { page: O } = await context(1);
  await O.goto(`${base}/organiser/${f.event}`);
  await O.getByRole("heading", { name: "Check in an attendee" }).waitFor();
  await shot(O, "17-organiser-invitation");
  await O.getByLabel("Attendee name").fill("Alex");
  await O.getByRole("button", { name: "Search names" }).click();
  await O.getByRole("button", { name: "Check in this attendee" }).waitFor();
  await O.getByRole("heading", {
    name: "Check in an attendee",
  }).scrollIntoViewIfNeeded();
  await O.screenshot({ path: `${dir}/18-organiser-name-search.png` });
  shots++;
  await O.getByRole("button", { name: "Check in this attendee" }).click();
  await O.getByText("Alex Morgan is checked in.", { exact: true }).waitFor();
  assert.ok(
    (await f.call("GET", `profile?eventId=${f.event}`, undefined, "11")).data
      .checkedInAt,
  );
  await O.goto(qr);
  await O.getByRole("heading", { name: "Check in an attendee" }).waitFor();
  await shot(O, "19-organiser-qr-scan");
  // Capture existing connection and arc screens through actual services.
  for (const who of ["1", "2"]) {
    const p = (
      await f.call("GET", `profile?eventId=${f.event}`, undefined, who)
    ).data;
    await f.call("PUT", "profile", { ...p, eventId: f.event }, who);
    await f.call(
      "POST",
      "questionnaire",
      {
        eventId: f.event,
        answers: p.questions.map((q) => ({
          questionId: q.id,
          choice: null,
          skipped: true,
        })),
      },
      who,
    );
  }
  const { page: B } = await context(2);
  await B.goto(`${base}/event/${f.event}?tab=Discover`);
  await B.getByRole("heading", { name: "Open to chat", exact: true }).waitFor();
  await shot(B, "20-discover-people");
  await B.locator(".person")
    .filter({ has: B.getByRole("heading", { name: "Person 1", exact: true }) })
    .getByRole("button", { name: "Invite to chat" })
    .click();
  await B.getByRole("button", { name: "Send request", exact: true }).waitFor();
  await shot(B, "21-request-composer");
  await B.getByRole("button", { name: "Send request", exact: true }).click();
  await B.getByRole("button", {
    name: "Cancel request",
    exact: true,
  }).waitFor();
  await shot(B, "22-request-waiting");
  const request = (await f.state("1")).data.incoming[0];
  await f.respond(request.id, "accept", "1");
  const session = (await f.state("1")).data.session.id;
  await B.getByRole("button", { name: "I’m here", exact: true }).waitFor();
  await shot(B, "23-meeting-point");
  await f.session(session, "arrive", "1");
  await f.session(session, "arrive", "2");
  await B.getByRole("button", { name: "Wrap up", exact: true }).waitFor();
  await shot(B, "24-conversation");
  await B.getByRole("button", { name: "Wrap up", exact: true }).click();
  await B.getByRole("button", { name: "Done", exact: true }).waitFor();
  await shot(B, "25-close-contact-consent");
  const personal = (
    await f.call("GET", `profile?eventId=${f.event}`, undefined, "1")
  ).data;
  const Q = await B.context().newPage();
  await Q.goto(`${base}/qr/${f.event}/${personal.qrToken}`);
  await Q.getByRole("heading", {
    name: "Follow up with Person 1",
    exact: true,
  }).waitFor();
  await Q.getByRole("button", { name: "Done", exact: true }).waitFor();
  await shot(Q, "30-qr-follow-up");
  await Q.close();

  await B.getByRole("button", { name: "Done", exact: true }).click();
  await B.getByRole("button", {
    name: "Save optional feedback",
    exact: true,
  }).waitFor();
  await shot(B, "26-feedback");
  await O.goto(`${base}/organiser`);
  await O.getByRole("heading", { name: "Make an event." }).waitFor();
  await shot(O, "27-organiser-create");
  await O.goto(`${base}/organiser/${f.event}`);
  await O.getByRole("heading", {
    name: "Meeting points",
    exact: true,
  }).scrollIntoViewIfNeeded();
  await O.screenshot({ path: `${dir}/28-meeting-point-editor.png` });
  shots++;
  await A.goto(`${base}/join/${f.invite.joinCode}`);
  await A.getByRole("heading", {
    name: "Your personal QR",
    exact: true,
  }).waitFor();
  assert.match(A.url(), /\/event\//);
  await A.getByRole("navigation")
    .getByRole("button", { name: "Profile", exact: true })
    .click();
  await A.getByAltText("Your personal check-in and follow-up QR").waitFor();
  await shot(A, "29-profile-checked-in");
  await O.goto(`${base}/organiser`);
  await O.getByRole("button", {
    name: "Create judges demo",
    exact: true,
  }).click();
  await O.getByRole("heading", {
    name: "MeetMates — Judges Demo",
    exact: true,
  }).waitFor();
  await shot(O, "31-judges-demo-event");
  const demoCode = await O.getByLabel("Join with code", {
    exact: true,
  }).inputValue();
  const { page: D } = await context(12);
  await D.goto(`${base}/join/${demoCode}`);
  await D.getByRole("button", { name: "Use Maya Chen", exact: true }).click();
  await shot(D, "32-demo-persona");
  assert.equal(
    await D.getByLabel("Name", { exact: true }).inputValue(),
    "Maya Chen",
  );
  for (let i = 0; i < 6; i++)
    await D.getByRole("button", { name: "Continue", exact: true }).click();
  await shot(D, "33-demo-persona-review");
  await D.getByRole("button", { name: "Save my profile", exact: true }).click();
  await D.getByRole("button", {
    name: "Skip all and continue",
    exact: true,
  }).click();
  await D.getByRole("heading", {
    name: "Your personal QR",
    exact: true,
  }).waitFor();
  await shot(D, "34-demo-home");
  await O.getByLabel("Attendee name").fill("Maya");
  await O.getByRole("button", { name: "Search names", exact: true }).click();
  await O.getByRole("button", {
    name: "Check in this attendee",
    exact: true,
  }).click();
  await O.getByText("Maya Chen is checked in.", { exact: true }).waitFor();
  await O.goto(`${base}/judges-demo`);
  await O.getByRole("heading", {
    name: "Show the whole hello.",
    exact: true,
  }).waitFor();
  await shot(O, "35-judges-guide");
  await A.getByRole("button", { name: "Edit profile", exact: true }).click();
  await A.locator('input[type="file"]').setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(130001),
  });
  await A.getByRole("alert")
    .filter({ hasText: "smaller than 130 KB" })
    .waitFor();
  await A.getByLabel("Job title / role").fill("Design lead");
  await A.locator('input[type="file"]').setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6cGQAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await A.getByRole("button", {
    name: "Use initials instead",
    exact: true,
  }).waitFor();
  await A.getByRole("button", {
    name: "Use initials instead",
    exact: true,
  }).click();
  for (let i = 0; i < 6; i++)
    await A.getByRole("button", { name: "Continue", exact: true }).click();
  await A.getByRole("button", { name: "Save my profile", exact: true }).click();
  await A.getByRole("button", { name: "Edit profile", exact: true }).waitFor();
  assert.equal(
    (await f.call("GET", `profile?eventId=${f.event}`, undefined, "11")).data
      .role,
    "Design lead",
  );
  const tokenBefore = (
    await f.call("GET", `profile?eventId=${f.event}`, undefined, "11")
  ).data.qrToken;
  await A.reload();
  await A.getByAltText("Your personal check-in and follow-up QR").waitFor();
  assert.equal(
    (await f.call("GET", `profile?eventId=${f.event}`, undefined, "11")).data
      .qrToken,
    tokenBefore,
  );
  await A.setViewportSize({ width: 1280, height: 900 });
  await A.getByRole("navigation")
    .getByRole("button", { name: "Home", exact: true })
    .click();
  assert.equal(
    await A.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  await A.setViewportSize({ width: 390, height: 844 });
  await A.getByRole("navigation")
    .getByRole("button", { name: "Profile", exact: true })
    .click();
  await A.getByAltText("Your personal check-in and follow-up QR").waitFor();
  await f.db.query("UPDATE event_participants SET availability_status='unavailable',available_until=null WHERE event_id=$1",[f.event]);
  await A.getByRole("navigation").getByRole("button",{name:"Discover",exact:true}).click();await A.getByRole("heading",{name:"Nobody’s open right now — you can be the first",exact:true}).waitFor();await shot(A,"38-discover-empty");
  await A.getByRole("navigation").getByRole("button",{name:"Profile",exact:true}).click();
  await lc.route("**/auth/v1/logout*", (r) =>
    r.fulfill({ contentType: "application/json", body: "{}" }),
  );
  await A.getByRole("button", { name: "Sign out", exact: true }).click();
  await A.getByLabel("Email address").waitFor();
  assert.equal(
    (await f.call("GET", `profile?eventId=${f.event}`, undefined, "11")).data
      .displayName,
    "Alex Morgan",
  );
  const { page: E } = await context(10, false);
  await E.goto(`${base}/join/WRONG`);
  await E.getByRole("alert").filter({ hasText: "Event not found" }).waitFor();
  await shot(E, "37-invalid-invitation");
  assert.deepEqual(errors, []);
  assert.ok(shots >= 26);
  console.log(
    `Captured ${shots} mobile screenshots (390×844); real HTTP/PGlite with fixture Auth.`,
  );
});
