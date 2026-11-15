import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const tokenA = process.env.TEST_ACCOUNT_TOKEN_A,
  tokenB = process.env.TEST_ACCOUNT_TOKEN_B;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  base = process.env.TEST_APP_URL;
test(
  "hosted Supabase email accounts: two SDK sessions, storage restore, join, check-in and availability",
  {
    skip:
      !url || !key || !base || !tokenA || !tokenB
        ? "Set TEST_APP_URL, public Supabase env vars and two confirmed email-account access tokens (TEST_ACCOUNT_TOKEN_A/B) for a disposable configured test deployment."
        : false,
  },
  async (t) => {
    const memory = new Map();
    const storage = {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => memory.set(k, v),
      removeItem: (k) => memory.delete(k),
    };
    const a = createClient(url, key, {
      auth: { storage, persistSession: true, autoRefreshToken: false },
    });
    const b = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    async function attach(client, token) {
      const { data, error } = await client.auth.getUser(token);
      assert.ifError(error);
      assert.equal(data.user.is_anonymous, false);
      assert.ok(data.user.email_confirmed_at);
      const result = await client.auth.setSession({
        access_token: token,
        refresh_token: "test-unused",
      });
      assert.ifError(result.error);
      return result;
    }
    const aa = await attach(a, tokenA),
      bb = await attach(b, tokenB);
    assert.notEqual(aa.data.user.id, bb.data.user.id);
    async function request(client, path, method = "GET", body) {
      const { data } = await client.auth.getSession();
      const r = await fetch(`${base}/api/${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      assert.ok(r.ok, `${method} ${path}: ${r.status}`);
      return r.json();
    }
    const invite = await request(a, "events", "POST", {
        name: "Automated disposable Task 2 event",
        endsAt: new Date(Date.now() + 3600000).toISOString(),
      }),
      id = invite.event.id;
    for (const [client, name] of [
      [a, "Attendee A"],
      [b, "Attendee B"],
    ]) {
      const p = await request(client, "account/profile", "POST", {
        code: invite.joinCode,
        displayName: name,
        goal: "Just socialize",
        networkingGoals: [],
      });
      await request(a, `events/${id}/check-in`, "POST", { token: p.qrToken });
    }
    t.after(async () => {
      await request(a, `events/${id}/membership`, "DELETE");
      await request(b, `events/${id}/membership`, "DELETE");
    });
    await request(a, `events/${id}/availability`, "PUT", { open: true });
    const open = await request(b, `events/${id}/open`);
    assert.equal(open.length, 1);
    assert.deepEqual(Object.keys(open[0]).sort(), [
      "displayName",
      "goalLine",
      "participantId",
    ]);
    assert.match(open[0].participantId, /^[0-9a-f-]{36}$/i);
    assert.equal(open[0].displayName, "Attendee A");
    assert.equal(open[0].goalLine, "Just socialize");
    const restored = createClient(url, key, {
      auth: { storage, persistSession: true, autoRefreshToken: false },
    });
    assert.equal(
      (await restored.auth.getSession()).data.session.user.id,
      aa.data.user.id,
    );
    assert.equal(
      (await request(restored, `profile?eventId=${id}`)).displayName,
      "Attendee A",
    );
    await request(a, `events/${id}/availability`, "PUT", { open: false });
    assert.deepEqual(await request(b, `events/${id}/open`), []);
  },
);
