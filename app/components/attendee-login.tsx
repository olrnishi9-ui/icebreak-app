"use client";
import { useState } from "react";
import { api, supabase } from "../../lib/supabase";
import { ErrorMessage } from "./shared";
export function AttendeeLogin() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="panel">
      <p className="eyebrow">Your MeetMates account</p>
      <h1>A hello starts here.</h1>
      <p>Enter an email label to try MeetMates in show mode.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const { data, error } = await supabase().auth.getSession();
            if (error) throw error;
            if (!data.session?.user.is_anonymous) {
              const { error } = await supabase().auth.signInAnonymously();
              if (error) throw error;
            }
            await api("/api/show/entry", "POST", { email: email.trim() });
            location.assign("/join");
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <label>
          Email address
          <input
            required
            type="email"
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <ErrorMessage message={error} />
        <button disabled={busy}>{busy ? "Please wait…" : "Continue"}</button>
      </form>
      <p className="quiet">
        Show mode · this email is an unverified profile label. No email will be
        sent.
      </p>
    </section>
  );
}
