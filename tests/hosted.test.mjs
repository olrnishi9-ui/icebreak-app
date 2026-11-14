import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  base = process.env.TEST_APP_URL;
test(
  "hosted Supabase Anonymous Auth: two SDK sessions, storage restore, join and availability",
  {
    skip:
      !url || !key || !base
        ? "Set TEST_APP_URL and public Supabase env vars for a disposable configured test deployment."
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
    const aa = await a.auth.signInAnonymously(),
      bb = await b.auth.signInAnonymously();
    assert.ifError(aa.error);
    assert.ifError(bb.error);
    assert.notEqual(aa.data.user.id, bb.data.user.id);
    assert.equal(aa.data.user.is_anonymous, true);
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
      [a, "Guest A"],
      [b, "Guest B"],
    ])
      await request(client, "events/join", "POST", {
        code: invite.joinCode,
        displayName: name,
        goal: "Just socialize",
      });
    t.after(async () => {
      await request(a, `events/${id}/membership`, "DELETE");
      await request(b, `events/${id}/membership`, "DELETE");
    });
    await request(a, `events/${id}/availability`, "PUT", { open: true });
    assert.deepEqual(await request(b, `events/${id}/open`), [
      { displayName: "Guest A", goalLine: "Just socialize" },
    ]);
    const restored = createClient(url, key, {
      auth: { storage, persistSession: true, autoRefreshToken: false },
    });
    assert.equal(
      (await restored.auth.getSession()).data.session.user.id,
      aa.data.user.id,
    );
    assert.equal(
      (await request(restored, `profile?eventId=${id}`)).displayName,
      "Guest A",
    );
    await request(a, `events/${id}/availability`, "PUT", { open: false });
    assert.deepEqual(await request(b, `events/${id}/open`), []);
  },
);
