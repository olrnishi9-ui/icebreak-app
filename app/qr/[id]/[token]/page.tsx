"use client";
import { use, useEffect, useState } from "react";
import { api } from "../../../../lib/supabase";
import { Header, ErrorMessage, Loading } from "../../../components/shared";
import { CheckIn } from "../../../components/check-in";
import { Conversation } from "../../../components/conversation";
import type { MeetSession } from "../../../../lib/connections";
export default function QR({
  params,
}: {
  params: Promise<{ id: string; token: string }>;
}) {
  const { id, token } = use(params);
  const [organiser, setOrganiser] = useState(false),
    [person, setPerson] = useState(""),
    [session, setSession] = useState<MeetSession | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        await api(`/api/events/${id}/organiser`);
        setOrganiser(true);
        return;
      } catch {}
      const row = await api<{ sessionId: string; displayName: string }>(
        "/api/qr/resolve",
        "POST",
        { eventId: id, token },
      );
      setPerson(row.displayName);
      const state = await api<{ session: MeetSession | null }>(
        `/api/connections?eventId=${id}`,
      );
      if (state.session?.id === row.sessionId) setSession(state.session);
      else
        setError(
          "This conversation is already complete. Find your exchanged details in Matches.",
        );
    })()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, token]);
  return (
    <>
      <Header />
      <main className="narrow">
        {loading ? (
          <Loading />
        ) : organiser ? (
          <CheckIn eventId={id} initialToken={token} />
        ) : (
          <>
            <p className="eyebrow">Your introduction</p>
            <h1>
              {person ? `Follow up with ${person}` : "Your personal connection"}
            </h1>
            <ErrorMessage message={error} />
            {session && (
              <Conversation
                eventId={id}
                session={session}
                onFinish={() => location.assign(`/event/${id}?tab=Matches`)}
              />
            )}
            <a className="text-link" href={`/event/${id}?tab=Matches`}>
              Go to Matches →
            </a>
            <a className="text-link" href="/">
              Sign in to your event →
            </a>
          </>
        )}
      </main>
    </>
  );
}
