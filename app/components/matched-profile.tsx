"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/supabase";
import type { PublicPerson } from "../../lib/discovery";
import type { MeetingPoint, MeetSession } from "../../lib/connections";
import { Avatar, ErrorMessage, Loading } from "./shared";
import { PrepCard } from "./conversation";
export function MatchedProfile({
  eventId,
  sessionId,
  session,
}: {
  eventId: string;
  sessionId: string;
  session?: MeetSession;
}) {
  const [data, setData] = useState<{
      person: PublicPerson;
      meetingPoint: MeetingPoint | null;
      createdAt: string;
      startedAt: string | null;
      duration: number;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api<typeof data>(`/api/sessions/${sessionId}/profile?eventId=${eventId}`)
      .then((v) => {
        if (live) setData(v);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [eventId, sessionId]);
  if (error) return <ErrorMessage message={error} />;
  if (!data) return <Loading label="Preparing your introduction…" />;
  const p = data.person;
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="flex justify-center">
          <Avatar name={p.displayName} photo={p.photo} />
        </div>
        <p className="eyebrow">Your matched profile</p>
        <h2 className="!text-[24px]">{p.displayName}</h2>
        <p>{[p.role, p.organization].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="rounded-2xl bg-mint p-5">
        <p className="eyebrow !mt-0">Your introduction</p>
        <h3>{data.meetingPoint?.label ?? "Together in person"}</h3>
        <p>{data.meetingPoint?.direction ?? "Say hello where you are."}</p>
        <p className="quiet text-[13px]">
          {data.startedAt ? "Started" : "Confirmed"} at{" "}
          {new Date(data.startedAt ?? data.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          · {data.duration} minutes to begin
        </p>
      </div>
      <section>
        <h3>About {p.displayName.split(" ")[0]}</h3>
        <p>
          {p.introduction ||
            "Start with a hello and let the conversation unfold."}
        </p>
        {p.industry && <p className="quiet">{p.industry}</p>}
        <div className="flex flex-wrap gap-2">
          {[p.expertise, ...p.tags].filter(Boolean).map((v) => (
            <span className="chip" key={v}>
              {v}
            </span>
          ))}
        </div>
      </section>
      <section>
        <h3>Goals</h3>
        {(p.goals.length ? p.goals : [p.goalLine]).map((v) => (
          <p key={v}>{v}</p>
        ))}
      </section>
      <section>
        <h3>Mutual value</h3>
        <p>{p.why}</p>
        {p.offers.map((v) => (
          <p key={v}>I can offer · {v}</p>
        ))}
        {p.seeks.map((v) => (
          <p key={v}>I’m looking for · {v}</p>
        ))}
      </section>
      {p.topics.length > 0 && (
        <section>
          <h3>Suggested topics</h3>
          {p.topics.map((v) => (
            <p className="rounded-xl bg-mint px-4 py-3" key={v}>
              {v}
            </p>
          ))}
        </section>
      )}
      {session && <PrepCard session={session} />}
    </div>
  );
}
