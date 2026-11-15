"use client";
import { useEffect, useState } from "react";
import { api, supabase } from "../../lib/supabase";
import { Header, ErrorMessage, Loading } from "../components/shared";
export default function ChooseEvent() {
  const [event, setEvent] = useState<{ name: string; code: string } | null>(
    null,
  );
  const [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      const { data, error } = await supabase().auth.getSession();
      if (error) throw error;
      if (!data.session?.user.is_anonymous) {
        location.replace("/sign-in");
        return;
      }
      setEvent(await api("/api/show/event"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <Header />
      <main className="narrow">
        {event ? (
          <section className="panel ticket">
            <p className="eyebrow">Your event invitation</p>
            <h1>Choose Event</h1>
            <h2>{event.name}</h2>
            <p>Your invitation to explore and connect.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const code = String(new FormData(e.currentTarget).get("code"))
                  .trim()
                  .toUpperCase();
                if (code !== event.code)
                  setError("Use DEMO26 to enter the show event.");
                else location.assign(`/join/${event.code}`);
              }}
            >
              <label>
                Event code
                <input
                  name="code"
                  required
                  maxLength={16}
                  defaultValue={event.code}
                  autoCapitalize="characters"
                  autoComplete="off"
                />
              </label>
              <ErrorMessage message={error} />
              <button>Continue</button>
            </form>
          </section>
        ) : error ? (
          <section className="panel">
            <ErrorMessage message={error} />
            <button onClick={() => void load()}>Retry</button>
          </section>
        ) : (
          <Loading label="Opening your event invitation…" />
        )}
      </main>
    </>
  );
}
