"use client";
import { useState } from "react";
import { guest, api } from "../../lib/supabase";
import type { EventInvite } from "../../lib/types";
import { Header, ErrorMessage } from "../components/shared";
export default function Organiser() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Header />
      <main className="narrow">
        <section className="panel ticket">
          <p className="eyebrow">For the person bringing everyone together</p>
          <h1>Make an event.</h1>
          <p>Your invitation will have a QR code and a code people can type.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              setBusy(true);
              setError("");
              try {
                await guest();
                const invite = await api<EventInvite>("/api/events", "POST", {
                  name: data.get("name"),
                  endsAt: data.get("endsAt")
                    ? new Date(String(data.get("endsAt"))).toISOString()
                    : null,
                });
                location.assign(`/organiser/${invite.event.id}`);
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            <label>
              Event name
              <input name="name" required maxLength={120} />
            </label>
            <label>
              Ends at · optional, your local time
              <input name="endsAt" type="datetime-local" />
            </label>
            <ErrorMessage message={error} />
            <button disabled={busy}>
              {busy ? "Creating…" : "Create event"}
            </button>
          </form>
          <p className="quiet">
            Keep this browser session to return to your organiser page.
          </p>
        </section>
      </main>
    </>
  );
}
