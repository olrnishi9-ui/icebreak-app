// Mobile browser -> real application handler -> migrated PGlite. Auth SDK credentials
// are fixture-only; this does not verify hosted Supabase/Auth or deployment wiring.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import { fixture, authId } from "./helpers/connections.mjs";
const base = process.env.TEST_BROWSER_URL || "http://127.0.0.1:3000";
const dir = "docs/screenshots/task5b";
test("Part B 390×844 Discover, Requests, matched profile, mutual extensions, feedback, stations and notifications", async (t) => {
  const f = await fixture();
  t.after(() => f.pg.close());
  await f.db.query(
    "UPDATE events SET name='MeetMates · Summit 2026' WHERE id=$1",
    [f.event],
  );
  await f.db.query(
    "UPDATE event_participants SET profile_saved=true,setup_complete=true,checked_in_at=$2,networking_goals=ARRAY['Find collaborators'],role='Product designer',organization='Common Ground',industry='Technology',field='Design research',field_visible=true,introduction='I build tools that bring people together.' WHERE event_id=$1",
    [f.event, new Date(f.now - 60000).toISOString()],
  );
  await f.db.query(
    "UPDATE event_participants SET display_name='Alex Morgan' WHERE event_id=$1 AND user_id=$2",
    [f.event, f.members[0]],
  );
  await f.db.query(
    "UPDATE event_participants SET display_name='Maya Chen',role='Research lead',organization='Open Studio' WHERE event_id=$1 AND user_id=$2",
    [f.event, f.members[1]],
  );
  await f.db.query(
    "INSERT INTO user_interests(event_id,user_id,interest_type,topic,share_consent) VALUES($1,$2,'learn','Design research',true),($1,$3,'help','Design research',true),($1,$2,'interest','AI',true),($1,$3,'interest','AI',true)",
    [f.event, f.members[0], f.members[1]],
  );
  await f.call("POST", "stations", {
    eventId: f.event,
    name: "Design & discovery",
    description: "Bring a question from your latest project.",
    tags: ["Design research"],
    locationNote: "East lounge · beside the windows",
  });
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  t.after(() => browser.close());
  await mkdir(dir, { recursive: true });
  const errors = [];
  async function page(who) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    await context.addInitScript(
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
              email: "fixture@example.invalid",
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
    await context.route("**/api/**", async (route) => {
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
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    return p;
  }
  const A = await page(1),
    B = await page(2);
  let shots = 0;
  async function shot(p, name, anchor) {
    if (anchor) await anchor.scrollIntoViewIfNeeded();
    else await p.evaluate(() => scrollTo(0, 0));
    await p.screenshot({ path: `${dir}/${name}.png`, animations: "disabled" });
    assert.equal(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `${name}: no horizontal overflow`,
    );
    const small = await p.getByRole("button").evaluateAll((bs) =>
      bs
        .filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.width < 48 || r.height < 48);
        })
        .map((b) => b.textContent.trim()),
    );
    assert.deepEqual(small, [], `${name}: 48px targets`);
    shots++;
  }
  const nav = (p, name) =>
    p
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
  await A.goto(`${base}/event/${f.event}?tab=Discover`);
  await A.getByRole("tab", { name: "For You", exact: true }).waitFor();
  const maya = A.locator(".person").filter({
    has: A.getByRole("heading", { name: "Maya Chen", exact: true }),
  });
  await maya.waitFor();
  await shot(
    A,
    "01-discover-for-you",
    A.getByRole("tablist", { name: "Discover people" }),
  );
  await maya
    .getByRole("button", { name: "Save for later", exact: true })
    .click();
  await maya
    .getByRole("button", { name: "Saved · remove", exact: true })
    .waitFor();
  await A.getByRole("tab", { name: "All Attendees", exact: true }).click();
  await A.getByLabel("Search by name or organization").fill("Open Studio");
  await maya.waitFor();
  await shot(
    A,
    "02-directory-search",
    A.getByLabel("Search by name or organization"),
  );
  assert.equal(await A.locator(".person:visible").count(), 1);
  await A.getByRole("tab", { name: "Saved", exact: true }).click();
  await maya.waitFor();
  await shot(
    A,
    "03-discover-saved",
    A.getByRole("tablist", { name: "Discover people" }),
  );
  await maya
    .getByRole("button", { name: "Request a Short Introduction", exact: true })
    .click();
  await A.getByRole("button", { name: "Send request", exact: true }).waitFor();
  assert.equal(await A.locator("select:visible").count(), 0);
  await shot(A, "04-request-composer");
  await A.getByRole("button", { name: "Send request", exact: true }).click();
  await A.getByRole("button", {
    name: "Withdraw request",
    exact: true,
  }).waitFor();
  await shot(A, "05-requests-sent");
  await B.goto(`${base}/event/${f.event}?tab=Requests`);
  await B.getByRole("button", { name: "Accept", exact: true }).waitFor();
  await shot(B, "06-requests-received");
  await B.getByRole("button", { name: "Later", exact: true }).click();
  await B.getByRole("heading", {
    name: "Room for a new hello",
    exact: true,
  }).waitFor();
  await shot(B, "07-requests-empty");
  assert.equal((await f.state()).data.outgoing[0].status, "pending");
  await A.getByRole("button", {
    name: "Withdraw request",
    exact: true,
  }).click();
  await A.getByText("5 minutes · Expired / closed", { exact: true }).waitFor();
  await shot(A, "08-requests-closed");
  await A.getByRole("tab", { name: "Saved", exact: true }).click();
  await maya.waitFor();
  await shot(A, "09-requests-saved");
  await f.reset();
  await f.send();
  const r = (await f.state()).data.outgoing[0];
  await f.respond(r.id, "accept");
  const sid = (await f.state()).data.session.id;
  await A.getByText("Your matched profile", { exact: true }).waitFor();
  await shot(A, "10-matched-profile");
  await shot(
    A,
    "11-matched-profile-value",
    A.getByRole("heading", { name: "Mutual value", exact: true }),
  );
  await shot(
    A,
    "12-matched-profile-prep",
    A.getByRole("heading", { name: "A moment to prepare", exact: true }),
  );
  await A.getByRole("button", { name: "I’m here", exact: true }).click();
  await B.getByRole("button", { name: "I’m here", exact: true }).click();
  await A.getByRole("button", { name: "Wrap up", exact: true }).waitFor();
  await shot(A, "13-conversation-timer");
  // Clock is injected into the real service; timer grants are always server-controlled.
  f.now += 245000;
  await A.getByRole("button", { name: "Extend +5", exact: true }).waitFor();
  await shot(A, "14-extension-offer");
  await A.getByRole("button", { name: "Extend +5", exact: true }).click();
  await B.getByRole("button", {
    name: "Agree · Extend +5",
    exact: true,
  }).waitFor();
  await shot(B, "15-extension-consent");
  await B.getByRole("button", {
    name: "Agree · Extend +5",
    exact: true,
  }).click();
  assert.equal((await f.state()).data.session.duration, 10);
  for (const duration of [10, 15]) {
    f.now += 300000;
    await f.call(
      "POST",
      `sessions/${sid}/arc`,
      { eventId: f.event, action: "extend", duration },
      "1",
    );
    await f.call(
      "POST",
      `sessions/${sid}/arc`,
      { eventId: f.event, action: "extend", duration },
      "2",
    );
  }
  await A.getByText("Save a follow-up to continue later.", {
    exact: true,
  }).waitFor();
  await shot(A, "27-session-cap");
  await A.getByRole("button", { name: "Wrap up", exact: true }).click();
  await A.getByRole("button", { name: "Done", exact: true }).waitFor();
  await shot(A, "16-session-close");
  await A.getByRole("button", {
    name: "Save and Follow Up",
    exact: true,
  }).click();
  await A.getByRole("button", {
    name: "Save optional feedback",
    exact: true,
  }).waitFor();
  await shot(
    A,
    "17-feedback",
    A.getByText("Was the conversation worthwhile?", { exact: true }),
  );
  await A.getByRole("button", { name: "collaboration", exact: true }).click();
  await A.getByLabel("Private feedback note · optional").fill(
    "An idea to explore later.",
  );
  await shot(
    A,
    "18-feedback-private-note",
    A.getByLabel("Private feedback note · optional"),
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
    (
      await f.db.query(
        "SELECT availability_status FROM event_participants WHERE event_id=$1 AND user_id=$2",
        [f.event, f.members[0]],
      )
    )[0].availability_status,
    "unavailable",
  );
  await nav(A, "Requests");
  await A.getByRole("tab", { name: "Matches", exact: true }).click();
  await A.getByRole("button", {
    name: "View matched profile",
    exact: true,
  }).waitFor();
  await shot(A, "19-requests-matches");
  await nav(A, "Matches");
  await A.getByRole("heading", {
    name: "People you met",
    exact: true,
  }).waitFor();
  await shot(A, "20-matches-history");
  await f.db.query(
    "UPDATE event_participants SET checked_in_at=$3,availability_status='open',available_until=$4 WHERE event_id=$1 AND user_id=$2",
    [
      f.event,
      f.members[4],
      new Date(f.now).toISOString(),
      new Date(f.now + 900000).toISOString(),
    ],
  );
  await nav(A, "Home");
  await A.getByRole("heading", {
    name: "Someone new you’d probably enjoy is here",
    exact: true,
  }).waitFor();
  await shot(
    A,
    "21-home-notification",
    A.getByRole("heading", {
      name: "Someone new you’d probably enjoy is here",
      exact: true,
    }),
  );
  await shot(
    A,
    "22-home-stations",
    A.getByRole("heading", { name: "Follow your curiosity", exact: true }),
  );
  await A.getByRole("button", {
    name: "Dismiss this suggestion",
    exact: true,
  }).click();
  await A.getByRole("button", { name: "Dismiss station", exact: true }).click();
  await shot(
    A,
    "23-home-dismissed",
    A.getByRole("heading", { name: "Follow your curiosity", exact: true }),
  );
  const O = await page(1);
  await O.goto(`${base}/organiser/${f.event}`);
  await O.getByRole("heading", { name: "Stations", exact: true }).waitFor();
  await shot(
    O,
    "24-organiser-stations",
    O.getByRole("heading", { name: "Stations", exact: true }),
  );
  await O.getByRole("button", { name: "Edit station", exact: true }).click();
  await shot(
    O,
    "25-organiser-edit-station",
    O.getByRole("heading", { name: "Edit station", exact: true }),
  );
  await O.getByLabel("Station name", { exact: true }).fill(
    "Design conversations",
  );
  await O.getByRole("button", { name: "Save station", exact: true }).click();
  await O.getByRole("heading", {
    name: "Design conversations",
    exact: true,
  }).waitFor();
  await O.getByRole("button", { name: "Delete station", exact: true }).click();
  await O.getByRole("heading", {
    name: "Design conversations",
    exact: true,
  }).waitFor({ state: "hidden" });
  await shot(
    O,
    "26-organiser-add-station",
    O.getByRole("heading", { name: "Add a station", exact: true }),
  );
  await O.getByLabel("Station name", { exact: true }).fill("Research exchange");
  await O.getByLabel("Description", { exact: true }).fill(
    "Bring a question to discuss.",
  );
  await O.getByLabel("Tags · separated by commas").fill("Design research");
  await O.getByLabel("Location note", { exact: true }).fill("South lounge");
  await O.getByRole("button", { name: "Create station", exact: true }).click();
  await O.getByRole("heading", {
    name: "Research exchange",
    exact: true,
  }).waitFor();
  await shot(
    O,
    "28-organiser-created",
    O.getByRole("heading", { name: "Stations", exact: true }),
  );
  await f.db.query(
    "UPDATE event_participants SET availability_status='unavailable',available_until=null WHERE event_id=$1",
    [f.event],
  );
  await nav(A, "Discover");
  await A.getByRole("tab", { name: "For You", exact: true }).click();
  await A.getByRole("heading", {
    name: "Your next hello is ahead",
    exact: true,
  }).waitFor();
  await shot(
    A,
    "29-discover-empty",
    A.getByRole("tablist", { name: "Discover people" }),
  );
  await A.getByRole("tab", { name: "All Attendees", exact: true }).click();
  await A.getByLabel("Search by name or organization").fill(
    "Nobody called this",
  );
  await A.getByRole("heading", {
    name: "No attendees found",
    exact: true,
  }).waitFor();
  await shot(
    A,
    "30-directory-no-results",
    A.getByLabel("Search by name or organization"),
  );
  assert.deepEqual(errors, []);
  console.log(
    `Captured ${shots} screenshots at 390×844; fixture Auth, real handler and migrated Postgres.`,
  );
});
