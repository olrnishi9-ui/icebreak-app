"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/supabase";
import type { PublicPerson, Station } from "../../lib/discovery";
import { Avatar, ErrorMessage, Loading } from "./shared";
export function PeopleCard({
  person,
  eventId,
  onRequest,
  onSaved,
  disabled = false,
}: {
  person: PublicPerson;
  eventId: string;
  onRequest: (p: PublicPerson) => void;
  onSaved?: () => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <article className="panel person !mb-0">
      <div className="flex items-center gap-4">
        <Avatar name={person.displayName} photo={person.photo} />
        <div>
          <h3>{person.displayName}</h3>
          <p className="!my-1 text-[15px]">
            {[person.role, person.organization].filter(Boolean).join(" · ") ||
              person.goalLine}
          </p>
          <span className="quiet text-[13px]">
            {person.available
              ? "Open to a short introduction"
              : "Connect when they’re ready"}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {[person.expertise, ...person.tags].filter(Boolean).map((t) => (
          <span className="chip" key={t}>
            {t}
          </span>
        ))}
      </div>
      <div className="rounded-2xl bg-mint p-4 mt-4">
        <p className="eyebrow !mt-0">Why you might connect</p>
        <p className="!mb-0 text-[15px]">{person.why}</p>
      </div>
      {person.topics.length > 0 && (
        <p className="quiet text-[13px]">
          Suggested topics · {person.topics.join(" · ")}
        </p>
      )}
      <ErrorMessage message={error} />
      <div className="flex flex-col gap-2 mt-4">
        <button
          disabled={disabled || !person.available}
          onClick={() => onRequest(person)}
        >
          Request a Short Introduction
        </button>
        <button
          className="secondary"
          aria-pressed={person.saved}
          disabled={busy || disabled}
          onClick={async () => {
            setBusy(true);
            try {
              await api(
                `/api/saved/${person.participantId}?eventId=${eventId}`,
                person.saved ? "DELETE" : "PUT",
                { eventId },
              );
              onSaved?.();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {person.saved ? "Saved · remove" : "Save for later"}
        </button>
      </div>
    </article>
  );
}
export function Discover({
  eventId,
  onRequest,
  onlySaved = false,
  disabled = false,
}: {
  eventId: string;
  onRequest: (p: PublicPerson) => void;
  onlySaved?: boolean;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState("for-you"),
    [search, setSearch] = useState(""),
    [people, setPeople] = useState<PublicPerson[] | null>(null),
    [error, setError] = useState("");
  const mode = onlySaved ? "saved" : tab;
  const load = useCallback(async () => {
    try {
      setPeople(
        await api(
          `/api/discover?eventId=${eventId}&tab=${mode}&search=${encodeURIComponent(mode === "all" ? search : "")}`,
        ),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [eventId, mode, search]);
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [load]);
  return (
    <section className="space-y-4">
      {!onlySaved && (
        <div
          className="flex rounded-2xl bg-white p-1 gap-1"
          role="tablist"
          aria-label="Discover people"
        >
          {[
            ["for-you", "For You"],
            ["all", "All Attendees"],
            ["saved", "Saved"],
          ].map(([key, label]) => (
            <button
              className={`flex-1 !px-2 text-[13px] ${tab === key ? "" : "secondary !border-0"}`}
              role="tab"
              aria-selected={tab === key}
              key={key}
              onClick={() => {
                setTab(key);
                setPeople(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {mode === "all" && (
        <label>
          Search by name or organization
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      )}
      <ErrorMessage message={error} />
      {!people ? (
        <Loading label="Finding people at your event…" />
      ) : !people.length ? (
        <div className="panel empty">
          <span className="hello-mark" aria-hidden="true">
            hello.
          </span>
          <h2 className="mt-4">
            {mode === "saved"
              ? "Keep a connection in mind"
              : mode === "all"
                ? "No attendees found"
                : "Your next hello is ahead"}
          </h2>
          <p className="quiet">
            {mode === "saved"
              ? "Save someone from Discover to find them here."
              : mode === "all"
                ? "Try a different name or organization. Only checked-in people appear here."
                : "People who check in and open to chat will appear here. Browse All Attendees while you wait."}
          </p>
        </div>
      ) : (
        people.map((p) => (
          <PeopleCard
            key={p.participantId}
            person={p}
            eventId={eventId}
            onRequest={onRequest}
            onSaved={() => void load()}
            disabled={disabled || !!error}
          />
        ))
      )}
    </section>
  );
}
export function HomeSuggestions({
  eventId,
  onRequest,
}: {
  eventId: string;
  onRequest: (p: PublicPerson) => void;
}) {
  const [stations, setStations] = useState<(Station & { reason: string })[]>(
      [],
    ),
    [person, setPerson] = useState<PublicPerson | null>(null),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([
        api<(Station & { reason: string })[]>(
          `/api/stations?eventId=${eventId}`,
        ),
        api<PublicPerson | null>(`/api/notifications?eventId=${eventId}`),
      ]);
      setStations(s);
      setPerson(p);
      setError("");
    } catch {
      setError("Event suggestions are temporarily unavailable. Retrying…");
    }
  }, [eventId]);
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [load]);
  async function dismiss(path: string, method: string) {
    try {
      await api(path, method, { eventId });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <section className="space-y-4" aria-label="Event updates">
        {person ? (
          <>
            <div className="rounded-2xl bg-[#DCEFE7] p-5">
              <p className="eyebrow">A new hello</p>
              <h2>Someone new you’d probably enjoy is here</h2>
              <button
                className="link-button"
                onClick={() =>
                  void dismiss(
                    `/api/notifications/${person.participantId}?eventId=${eventId}`,
                    "DELETE",
                  )
                }
              >
                Dismiss this suggestion
              </button>
            </div>
            <PeopleCard
              person={person}
              eventId={eventId}
              onRequest={onRequest}
              onSaved={() => void load()}
            />
          </>
        ) : (
          <p className="quiet" role="status">
            You’re up to date. A new introduction may appear here as people
            arrive.
          </p>
        )}
        <ErrorMessage message={error} />
      </section>
      <section className="panel">
        <p className="eyebrow">Around the event</p>
        <h2>Follow your curiosity</h2>
        <p className="quiet">
          Drop by a station when you feel like a conversation.
        </p>
        {!stations.length ? (
          <p className="quiet">
            Station suggestions will appear after check-in when a station tag
            matches your profile.
          </p>
        ) : (
          stations.map((s) => (
            <article key={s.id} className="border-t border-[#D4E6DC] pt-4 mt-4">
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <p className="quiet">{s.locationNote}</p>
              <p className="rounded-xl bg-mint p-3 text-[13px]">{s.reason}</p>
              <button
                className="link-button"
                onClick={() =>
                  void dismiss(`/api/stations/${s.id}/dismiss`, "POST")
                }
              >
                Dismiss station
              </button>
            </article>
          ))
        )}
      </section>
    </>
  );
}
