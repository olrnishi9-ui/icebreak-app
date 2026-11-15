"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { ErrorMessage } from "./shared";
export function EmailLogin({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function send() {
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
    setSent(true);
  }
  return (
    <section className="panel">
      <p className="eyebrow">Your MeetMates account</p>
      <h1>{sent ? "Check your inbox" : "A hello starts here."}</h1>
      <p>
        {sent
          ? `Enter the one-time code sent to ${email}.`
          : "Sign in with your email to keep your networking profile."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (!sent) await send();
            else {
              const { error } = await supabase().auth.verifyOtp({
                email: email.trim(),
                token: code.trim(),
                type: "email",
              });
              if (error) throw error;
              await onSuccess();
            }
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {!sent ? (
          <label>
            Email address
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        ) : (
          <label>
            One-time code
            <input
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,8}"
              minLength={6}
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
        )}
        <ErrorMessage message={error} />
        <button disabled={busy}>
          {busy
            ? "Please wait…"
            : sent
              ? "Verify and continue"
              : "Send my code"}
        </button>
      </form>
      {sent && (
        <div className="actions">
          <button
            className="link-button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError("");
              send()
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            Resend code
          </button>
          <button
            className="link-button"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setCode("");
              setError("");
            }}
          >
            Change email
          </button>
        </div>
      )}
      <p className="quiet">
        Your email stays private. Codes expire; you can request another.
      </p>
    </section>
  );
}
