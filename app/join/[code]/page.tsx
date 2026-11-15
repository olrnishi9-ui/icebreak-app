"use client";
import { use, useEffect, useState } from "react";
import { api, supabase } from "../../../lib/supabase";
import type { Profile } from "../../../lib/types";
import { Header, Loading, ErrorMessage } from "../../components/shared";
import { EmailLogin } from "../../components/email-login";
import { ProfileEditor } from "../../components/profile-editor";
export default function Join({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [event, setEvent] = useState<{ id: string; name: string } | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [signed, setSigned] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function resume() {
    const p = await api<Profile>("/api/account/resume", "POST", { code });
    if (p.profileSaved) {
      localStorage.setItem("icebreak-event", p.event.id);
      location.replace(`/event/${p.event.id}?welcome=back`);
      return;
    }
    setProfile({
      ...p,
      displayName: p.displayName ?? "",
      role: p.role ?? "",
      organization: p.organization ?? "",
      industry: p.industry ?? "",
      introduction: p.introduction ?? "",
      photo: p.photo ?? "",
      field: p.field ?? "",
      funFact: p.funFact ?? "",
      fieldVisible: p.fieldVisible ?? false,
      funFactVisible: p.funFactVisible ?? false,
      goal:
        p.goal ?? p.questions.find((q) => q.kind === "event_goal")!.options[0],
      networkingGoals: p.networkingGoals ?? [],
      topics: p.topics ?? [],
      answers: p.answers ?? [],
    });
    setSigned(true);
  }
  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/events/${encodeURIComponent(code)}`);
      const e = await r.json();
      if (!r.ok || !e.active) throw Error(e.error || "This event has ended.");
      setEvent(e);
      const { data } = await supabase().auth.getSession();
      if (data.session && !data.session.user.is_anonymous) await resume();
    })()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);
  return (
    <>
      <Header name={event?.name} />
      <main className="narrow">
        <p className="eyebrow">Your invitation · {code.toUpperCase()}</p>
        {loading ? (
          <Loading label="Checking your invitation…" />
        ) : error ? (
          <section className="panel">
            <ErrorMessage message={error} />
            <a className="text-link" href="/">
              Enter an event code →
            </a>
          </section>
        ) : signed && profile ? (
          <section className="panel">
            <ProfileEditor
              profile={profile}
              busy={busy}
              save={async (body) => {
                setBusy(true);
                try {
                  const p = await api<Profile>("/api/account/profile", "POST", {
                    ...body,
                    code,
                  });
                  localStorage.setItem("icebreak-event", p.event.id);
                  location.assign(`/event/${p.event.id}`);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </section>
        ) : (
          <EmailLogin onSuccess={resume} />
        )}
      </main>
    </>
  );
}
