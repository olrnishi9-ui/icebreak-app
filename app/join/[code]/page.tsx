"use client";
import { use, useEffect, useState } from "react";
import { api, guest } from "../../../lib/supabase";
import type { Question } from "../../../lib/open-now";
import type { Profile } from "../../../lib/types";
import { Header, Loading, ErrorMessage } from "../../components/shared";
type Basics = { id: string; name: string; status: string; active: boolean };
export default function Join({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [event, setEvent] = useState<Basics | null>(null),
    [questions, setQuestions] = useState<Question[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    (async () => {
      const response = await fetch(
        `/api/events/${encodeURIComponent(code.toUpperCase())}`,
        { cache: "no-store" },
      );
      const b = await response.json();
      if (!response.ok) throw Error(b.error);
      if (!b.active) throw Error("This event has ended.");
      const r = await fetch(
        `/api/events/${encodeURIComponent(code.toUpperCase())}/questions`,
        { cache: "no-store" },
      );
      const q = await r.json();
      if (!r.ok) throw Error(q.error);
      if (live) {
        setEvent(b);
        setQuestions(q);
      }
      // A persisted SDK session restores membership; a fresh visitor stays on S1.
      try {
        const p = await api<Profile>(`/api/profile?eventId=${b.id}`);
        if (live) {
          localStorage.setItem("icebreak-event", b.id);
          location.replace(`/event/${p.event.id}`);
        }
      } catch {
        /* No membership is expected before joining. */
      }
    })()
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [code, retry]);
  return (
    <>
      <Header name={event?.name} />
      <main className="narrow">
        <p className="eyebrow">Your invitation · {code.toUpperCase()}</p>
        {loading ? (
          <Loading label="Checking your invitation…" />
        ) : event ? (
          <section className="panel ticket">
            <h1>{event.name}</h1>
            <p>A name and a goal. Everything else can wait.</p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                setBusy(true);
                setError("");
                try {
                  await guest();
                  const p = await api<Profile>("/api/events/join", "POST", {
                    code,
                    displayName: data.get("displayName"),
                    goal: data.get("goal"),
                  });
                  localStorage.setItem("icebreak-event", p.event.id);
                  location.assign(`/event/${p.event.id}`);
                } catch (e) {
                  setError((e as Error).message);
                  setBusy(false);
                }
              }}
            >
              <label>
                What should we call you?
                <input
                  name="displayName"
                  required
                  maxLength={80}
                  autoComplete="nickname"
                />
              </label>
              <label>
                What brings you here?
                <select name="goal" required defaultValue="">
                  <option value="" disabled>
                    Choose your event goal
                  </option>
                  {questions
                    .find((q) => q.kind === "event_goal")
                    ?.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                </select>
              </label>
              <p className="quiet">
                When you open to chat, people in this event can see your name
                and goal.
              </p>
              <ErrorMessage message={error} />
              <button disabled={busy}>
                {busy ? "Joining…" : "Join event"}
              </button>
            </form>
          </section>
        ) : (
          <section className="panel">
            <h1>Let’s check that code.</h1>
            <ErrorMessage message={error} />
            <button onClick={() => setRetry(retry + 1)}>Try again</button>
          </section>
        )}
        <a href="/" className="text-link">
          Join with code instead →
        </a>
      </main>
    </>
  );
}
