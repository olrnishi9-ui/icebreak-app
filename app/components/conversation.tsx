"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/supabase";
import { ARC_COPY } from "../../lib/arc";
import type { ArcView } from "../../lib/arc-service";
import type { MeetSession } from "../../lib/connections";
import { localArcAction } from "../../lib/arc-client";
export function PrepCard({ session }: { session: MeetSession }) {
  const v = session.arc,
    c = v.script.cards[0];
  return (
    <article className="arc-card">
      <h3>A moment to prepare</h3>
      <p>
        {session.duration} minutes · {c.framing}
      </p>
      <p>{c.facts.join(" · ")}</p>
      <p>
        {v.side === "a"
          ? "You start."
          : `${session.partner.displayName} starts — you just listen first. You do not need to prepare an opener.`}
      </p>
      <p className="quiet">{v.script.disclosure}</p>
    </article>
  );
}
export function Conversation({
  eventId,
  session,
  onFinish,
}: {
  eventId: string;
  session: MeetSession;
  onFinish: () => void;
}) {
  const [view, setView] = useState(session.arc),
    [offline, setOffline] = useState(false),
    [error, setError] = useState(""),
    [down, setDown] = useState(false),
    [choice, setChoice] = useState<string | null>(null),
    [optedIn, setOptedIn] = useState(false),
    [note, setNote] = useState(session.arc.note),
    [feedback, setFeedback] = useState(false),
    [values, setValues] = useState<Record<string, number | boolean>>({});
  const current = useRef(view),
    queue = useRef<Record<string, unknown>[]>([]),
    syncing = useRef(false),
    signal = useRef("");
  const path = `/api/sessions/${session.id}/arc`;
  function receive(v: ArcView) {
    current.current = v;
    setView(v);
  }
  async function sync() {
    if (syncing.current) return;
    syncing.current = true;
    try {
      while (queue.current.length) {
        const v = await api<ArcView>(path, "POST", {
          eventId,
          ...queue.current[0],
        });
        queue.current.shift();
        if (!queue.current.length) receive(v);
      }
      const v = await api<ArcView>(`${path}?eventId=${eventId}`);
      receive(v);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      syncing.current = false;
    }
  }
  useEffect(() => {
    void sync();
    const t = setInterval(() => void sync(), 3000);
    return () => clearInterval(t);
  }, [session.id, eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const key = `${view.position}:${view.offered}:${view.phase}`;
    if (signal.current && signal.current !== key) {
      navigator.vibrate?.(120);
      setDown(false);
    }
    signal.current = key;
  }, [view.position, view.offered, view.phase]);
  function act(action: string) {
    queue.current.push({ action, position: current.current.position });
    receive(localArcAction(current.current, action));
    setDown(false);
    void sync();
  }
  async function done() {
    setError("");
    try {
      await sync();
      if (queue.current.length)
        throw Error("Reconnect to save your private choices.");
      await api(`/api/sessions/${session.id}/note`, "PUT", {
        eventId,
        text: note,
      });
      receive(
        await api<ArcView>(path, "POST", {
          eventId,
          action: "done",
          choice,
          optedIn,
        }),
      );
      const key = `icebreak-feedback-${session.id}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "shown");
        setFeedback(true);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const card = view.script.cards[view.position];
  const about =
    card.kind === "deepen" && card.framing === "Ask me about"
      ? view.side === "a"
        ? card.aboutB
        : card.aboutA
      : undefined;
  const missingAbout = about !== undefined && !about.length;
  const facts = about?.length
    ? about
    : missingAbout
      ? (card.fallback?.facts ?? [])
      : card.facts;
  const framing = missingAbout
    ? (card.fallback?.framing ?? ARC_COPY.exhausted)
    : card.framing;
  return (
    <div className="conversation">
      <p className="eyebrow">
        {session.partner.displayName} ·{" "}
        {view.phase === "closing" ? "Closing" : "Conversation"}
      </p>
      {offline && (
        <p role="status">
          Offline. Your cards still work; changes will sync when connected.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {view.phase === "conversation" ? (
        <>
          {view.position === 0 && <h2>Your conversation has started.</h2>}
          {view.offered && (
            <p className="notice card-signal" role="status">
              Another card is available whenever you’re ready.
            </p>
          )}
          <p className="quiet">
            <time>{Math.floor(view.elapsed / 60000)} min together</time>
          </p>
          {!down && view.script.notice && <p>{view.script.notice}</p>}
          {down ? (
            <h2>Keep talking. Phones face-down.</h2>
          ) : card.kind === "prep" ? (
            <PrepCard session={session} />
          ) : (
            <article className="arc-card" aria-live="polite">
              <h2>{framing}</h2>
              {facts.map((f, i) => (
                <p key={i}>{f}</p>
              ))}
              <p>
                {missingAbout && !card.fallback
                  ? ARC_COPY.exhausted
                  : view.role === "listener"
                    ? ARC_COPY.listener
                    : view.role === "starter"
                      ? ARC_COPY.starter
                      : "Use your own words."}
              </p>
            </article>
          )}
          {view.script.cards[view.position + 1]?.kind === "close" && (
            <p role="status">{ARC_COPY.exhausted}</p>
          )}
          <div className="actions">
            <button onClick={() => act("advance")}>Next card</button>
            <button className="secondary" onClick={() => act("skip")}>
              Skip card
            </button>
            <button className="secondary" onClick={() => setDown(!down)}>
              {down ? "Show card" : "Phones down · keep talking"}
            </button>
            <button className="link-button" onClick={() => act("wrap-up")}>
              Wrap up
            </button>
          </div>
          <p className="quiet">{view.script.disclosure}</p>
        </>
      ) : (
        <>
          <h2>One thing to remember</h2>
          <p>{view.script.cards.at(-1)!.framing}</p>
          {view.own.done ? (
            <>
              <h3>That’s a wrap.</h3>
              {view.outcome === "again" && (
                <p>You both chose to meet again this event.</p>
              )}
              {view.outcome === "exchange" && (
                <p>Your exchanged contact fields are in My People.</p>
              )}
              {feedback && (
                <fieldset>
                  <legend>{ARC_COPY.feedback}</legend>
                  {(["conversation_ease", "perceived_value"] as const).map(
                    (key) => (
                      <div key={key}>
                        <p>
                          {key === "conversation_ease"
                            ? "Ease of using the conversation format"
                            : "Value of the conversation format"}
                        </p>
                        {[
                          "Very low",
                          "Low",
                          "Neutral",
                          "High",
                          "Very high",
                        ].map((label, i) => (
                          <button
                            className="option"
                            key={label}
                            aria-pressed={values[key] === i + 1}
                            onClick={() =>
                              setValues({ ...values, [key]: i + 1 })
                            }
                          >
                            {label}
                          </button>
                        ))}
                        <button
                          className="link-button"
                          onClick={() =>
                            setValues((v) => {
                              const copy = { ...v };
                              delete copy[key];
                              return copy;
                            })
                          }
                        >
                          Skip this question
                        </button>
                      </div>
                    ),
                  )}
                  <p>Would you use this conversation format to reconnect?</p>
                  {[true, false].map((b) => (
                    <button
                      key={String(b)}
                      className="option"
                      aria-pressed={values.willingness_to_reconnect === b}
                      onClick={() =>
                        setValues({ ...values, willingness_to_reconnect: b })
                      }
                    >
                      {b ? "Yes" : "No"}
                    </button>
                  ))}
                  <div className="actions">
                    <button
                      onClick={async () => {
                        try {
                          await api("/api/feedback", "POST", {
                            eventId,
                            sessionId: session.id,
                            ...values,
                          });
                          setFeedback(false);
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Save optional feedback
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setFeedback(false)}
                    >
                      Skip feedback
                    </button>
                  </div>
                </fieldset>
              )}
              <button onClick={onFinish}>Back to the room · stay paused</button>
            </>
          ) : (
            <>
              <fieldset>
                <legend>Your private next step · optional</legend>
                {[
                  ["exchange", "Exchange contact"],
                  ["again", "Meet again this event"],
                  ["nothing", "That’s all"],
                ].map(([key, label]) => (
                  <button
                    className="option"
                    key={key}
                    aria-pressed={choice === key}
                    onClick={() => setChoice(choice === key ? null : key)}
                  >
                    {label}
                  </button>
                ))}
              </fieldset>
              <label>
                <input
                  type="checkbox"
                  checked={optedIn}
                  onChange={(e) => setOptedIn(e.target.checked)}
                />
                Share only my contact fields marked visible, if we both choose
                exchange.
              </label>
              <label>
                A remembered fact · only you can read this
                <textarea
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <div className="actions">
                <button onClick={() => void done()}>Done</button>
                <button
                  className="secondary"
                  onClick={() => act("keep-talking")}
                >
                  Keep talking
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
export function MyPeople({ eventId }: { eventId: string }) {
  const [people, setPeople] = useState<
      {
        id: string;
        displayName: string;
        eventName: string;
        note: string;
        exchanged: boolean;
        contacts: { field: string; value: string }[];
      }[]
    >([]),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  async function load() {
    try {
      setPeople(await api(`/api/people?eventId=${eventId}`));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!open) return;
    void load();
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [open, eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="panel">
      <button
        className="link-button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        My People · private
      </button>
      {open && (
        <>
          <h2>People you met</h2>
          {error && <p role="alert">{error}</p>}
          {!people.length && <p>Your first conversation will appear here.</p>}
          {people.map((p) => (
            <article key={p.id}>
              <h3>{p.displayName}</h3>
              <p>{p.eventName}</p>
              {p.exchanged && <p>Contact mutually exchanged</p>}
              {p.contacts.map((c) => (
                <p key={c.field}>
                  {c.field}: {c.value}
                </p>
              ))}
              <form
                key={`${p.id}:${p.note}`}
                onSubmit={async (e) => {
                  e.preventDefault();
                  const text = new FormData(e.currentTarget).get("text");
                  try {
                    await api(`/api/sessions/${p.id}/note`, "PUT", {
                      eventId,
                      text,
                    });
                    void load();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <label>
                  Your private remembered fact
                  <textarea name="text" defaultValue={p.note} maxLength={500} />
                </label>
                <button>Save note</button>
                <button
                  type="button"
                  className="link-button"
                  onClick={async () => {
                    try {
                      await api(
                        `/api/sessions/${p.id}/note?eventId=${eventId}`,
                        "DELETE",
                      );
                      void load();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Delete note
                </button>
              </form>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
