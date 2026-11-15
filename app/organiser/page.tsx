"use client";
import { useEffect, useState } from "react";
import { requireAccount, api, supabase } from "../../lib/supabase";
import type { EventInvite } from "../../lib/types";
import { EmailLogin } from "../components/email-login";
import { Header, ErrorMessage } from "../components/shared";
export default function Organiser() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    supabase()
      .auth.getSession()
      .then(({ data }) =>
        setSigned(!!data.session && !data.session.user.is_anonymous),
      )
      .catch((e) => setError(e.message));
  }, []);
  if (!signed)
    return (
      <>
        <Header />
        <main className="narrow">
          <EmailLogin onSuccess={async () => setSigned(true)} />
        </main>
      </>
    );
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
                await requireAccount();
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
          <section className="mt-6 rounded-2xl bg-mint p-5">
            <h2>Presenting to judges?</h2>
            <p className="quiet">
              Create a real event with two optional example personas and an
              illustrated meeting point. Attendees still sign in with their own
              email codes and check in with you.
            </p>
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await requireAccount();
                  const invite = await api<EventInvite>("/api/events", "POST", {
                    demo: true,
                  });
                  location.assign(`/organiser/${invite.event.id}`);
                } catch (e) {
                  setError((e as Error).message);
                  setBusy(false);
                }
              }}
            >
              Create judges demo
            </button>
          </section>
          <p className="quiet">
            Keep this browser session to return to your organiser page.
          </p>
        </section>
      </main>
    </>
  );
}
