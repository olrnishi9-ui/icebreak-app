"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../../lib/supabase";
import {
  connectionScreen,
  type ConnectionState,
  type Connection,
} from "../../lib/connections";
import { ErrorMessage } from "./shared";
export function ConnectionFlow({
  eventId,
  onFlow,
  selection,
  clearSelection,
  parentOffline = false,
  onOffline,
}: {
  eventId: string;
  onFlow: (active: boolean) => void;
  selection: { participantId?: string; displayName: string } | null;
  clearSelection: () => void;
  parentOffline?: boolean;
  onOffline?: (offline: boolean) => void;
}) {
  const choiceHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (selection) choiceHeading.current?.focus();
  }, [selection]);
  const [state, setState] = useState<
    | (ConnectionState & { notice?: { id: string; message: string } | null })
    | null
  >(null);
  const [offline, setOffline] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [duration, setDuration] = useState(5),
    [code, setCode] = useState(""),
    [browse, setBrowse] = useState(false),
    [waitingId, setWaitingId] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [confirmation, setConfirmation] = useState("");
  useEffect(() => onOffline?.(offline), [offline, onOffline]);
  const receive = useCallback(
    (
      s: ConnectionState & { notice?: { id: string; message: string } | null },
    ) => {
      setState(s);
      if (
        s.notice &&
        sessionStorage.getItem(`icebreak-notice-${s.notice.id}`) !== "seen"
      ) {
        setNotice(s.notice.message);
        sessionStorage.setItem(`icebreak-notice-${s.notice.id}`, "seen");
      }
    },
    [],
  );
  useEffect(() => {
    let live = true,
      running = false;
    async function poll() {
      if (running) return;
      running = true;
      try {
        const s = await api<ConnectionState>(
          `/api/connections?eventId=${eventId}`,
        );
        if (live) {
          receive(s);
          setOffline(false);
        }
      } catch {
        if (live) setOffline(true);
      } finally {
        running = false;
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 3000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [eventId, receive]);
  const waiting = state?.outgoing.find((r) =>
    waitingId ? r.id === waitingId : true,
  );
  const session = state?.session;
  const active =
    !!state &&
    connectionScreen(state, waitingId) !== "board" &&
    (!!session || !browse);
  useEffect(() => onFlow(active), [active, onFlow]);
  async function act(
    path: string,
    method: string,
    body: Record<string, unknown> = {},
  ) {
    setBusy(true);
    setError("");
    try {
      const s = await api<ConnectionState>(path, method, { eventId, ...body });
      receive(s);
      setOffline(false);
      return s;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function send(byCode = false) {
    const s = await act(
      byCode ? "/api/connections/code" : "/api/connections",
      "POST",
      byCode
        ? { code, duration }
        : { participant: selection?.participantId, duration },
    );
    if (s) {
      setWaitingId(s.outgoing.at(-1)?.id ?? null);
      setBrowse(false);
      clearSelection();
      setCode("");
    }
  }
  async function safety(requestId: string, report: boolean) {
    setBusy(true);
    setError("");
    setConfirmation("");
    try {
      await api(report ? "/api/reports" : "/api/blocks", "POST", {
        eventId,
        requestId,
      });
      receive(
        await api<ConnectionState>(`/api/connections?eventId=${eventId}`),
      );
      setConfirmation(report ? "Report received." : "Block saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const disabled = busy || offline || parentOffline;
  function requestAction(r: Connection, action: string) {
    return act(`/api/connections/${r.id}`, "PATCH", { action });
  }
  if (!state)
    return (
      <section className="panel connect-panel" aria-label="Connections">
        {offline && !parentOffline && (
          <p role="status" className="notice">
            Connection lost. Retrying automatically.
          </p>
        )}
        <p role="status">Restoring your connections…</p>
      </section>
    );
  return (
    <section className="panel connect-panel" aria-label="Connections">
      {offline && !parentOffline && (
        <p className="notice" role="status">
          Connection lost. Retrying automatically. Controls are read-only until
          we reconnect.
        </p>
      )}
      <ErrorMessage message={error} />
      {confirmation && <p role="status">{confirmation}</p>}
      {notice && !session && (
        <p role="status">
          {notice}{" "}
          <button className="link-button" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </p>
      )}
      {session ? (
        <>
          <p className="eyebrow">
            {session.state === "started"
              ? "Ready to talk"
              : "Your meeting point"}
          </p>
          <h2>
            {session.state === "started"
              ? "Your conversation has started."
              : `Say hello to ${session.partner.displayName}`}
          </h2>
          <p>
            {session.partner.displayName} · {session.partner.goalLine}
          </p>
          <p>
            {session.duration} minutes · {session.sharedReason}
          </p>
          {session.state === "meeting" && (
            <>
              {session.meetingPoint && (
                <figure className="meeting-point">
                  {/* The organiser supplies the photo; directions always remain in text. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={session.meetingPoint.photoUrl}
                    alt={`Meeting point: ${session.meetingPoint.label}`}
                  />
                  <figcaption>
                    <h3>{session.meetingPoint.label}</h3>
                    <p>{session.meetingPoint.direction}</p>
                  </figcaption>
                </figure>
              )}
              <div data-prep-card-slot="" />
              <p role="status">
                {session.arrived
                  ? "You’re here. Waiting for your partner."
                  : session.partnerArrived
                    ? "Your partner is here."
                    : session.partnerOnTheirWay
                      ? "Your partner is on their way."
                      : "Head over when you’re ready."}
              </p>
              <div className="actions">
                <button
                  disabled={disabled || session.arrived}
                  onClick={() =>
                    void act(`/api/sessions/${session.id}/arrive`, "POST")
                  }
                >
                  {session.arrived ? "You’re here" : "I’m here"}
                </button>
                {session.arrived && (
                  <button
                    disabled={disabled}
                    onClick={() =>
                      void act(`/api/sessions/${session.id}/start`, "POST")
                    }
                  >
                    Start anyway
                  </button>
                )}
                <button
                  className="secondary"
                  disabled={disabled}
                  onClick={() =>
                    void act(`/api/sessions/${session.id}/late`, "POST")
                  }
                >
                  Running late
                </button>
                <button
                  className="link-button"
                  disabled={disabled}
                  onClick={() =>
                    void act(`/api/sessions/${session.id}/cancel`, "POST")
                  }
                >
                  Cancel meeting
                </button>
              </div>
            </>
          )}
        </>
      ) : waiting && !browse ? (
        <>
          <p className="eyebrow">An invitation, with room to breathe</p>
          <h2>Waiting for {waiting.displayName}</h2>
          <p>{waiting.goalLine}</p>
          <p>
            {waiting.sharedReason} · {waiting.duration} minutes
          </p>
          <p>They’ll get a gentle nudge; no reply just means not now.</p>
          <p className="quiet">
            This invitation quietly ends after about 15 minutes. There’s nothing
            else you need to do.
          </p>
          <div className="actions">
            <button
              className="secondary"
              disabled={disabled}
              onClick={() => void requestAction(waiting, "cancel")}
            >
              Cancel request
            </button>
            <button
              className="link-button"
              onClick={() => {
                setBrowse(true);
                clearSelection();
              }}
            >
              Ask someone else
            </button>
          </div>
        </>
      ) : (
        <>
          {!state && !offline && (
            <p role="status">Restoring your connections…</p>
          )}
          {state?.incoming.map((r) => (
            <article className="incoming-request" key={r.id}>
              <p className="eyebrow">
                {r.kind === "code"
                  ? "Already together?"
                  : "An invitation to chat"}
              </p>
              <h2>{r.displayName}</h2>
              <p>{r.goalLine}</p>
              <p>
                {r.sharedReason} · {r.duration} minutes
              </p>
              <p className="quiet">
                {Math.max(
                  0,
                  Math.ceil((Date.parse(r.expiresAt) - Date.now()) / 60000),
                )}{" "}
                minutes left · until{" "}
                {new Date(r.expiresAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <div className="actions">
                <button
                  disabled={disabled}
                  onClick={() => void requestAction(r, "accept")}
                >
                  {r.kind === "code" ? "Start" : "Accept"}
                </button>
                <button
                  className="secondary"
                  disabled={disabled}
                  onClick={() => void requestAction(r, "later")}
                >
                  Later
                </button>
                <button
                  className="link-button"
                  disabled={disabled}
                  onClick={() => void safety(r.id, false)}
                >
                  Block
                </button>
                <button
                  className="link-button"
                  disabled={disabled}
                  onClick={() => void safety(r.id, true)}
                >
                  Report
                </button>
              </div>
            </article>
          ))}
          {selection && (
            <div className="request-choice">
              <h2 ref={choiceHeading} tabIndex={-1}>
                Invite {selection.displayName} to chat
              </h2>
              <label>
                Time together
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                </select>
              </label>
              <div className="actions">
                <button
                  disabled={disabled || !selection.participantId}
                  onClick={() => void send()}
                >
                  Send request
                </button>
                <button className="link-button" onClick={clearSelection}>
                  Back
                </button>
              </div>
              {error && (
                <button
                  className="secondary"
                  disabled={disabled}
                  onClick={() => void send()}
                >
                  Retry request
                </button>
              )}
            </div>
          )}
          <h2>Already said hello?</h2>
          <p>
            Your short code:{" "}
            <strong className="short-code">{state?.shortCode ?? "…"}</strong>
          </p>
          <p className="quiet">
            Share this in person. You’ll confirm before a conversation starts.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(true);
            }}
          >
            <label>
              Their short code
              <input
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
            </label>
            <label>
              Time together
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
              </select>
            </label>
            <button disabled={disabled || !state}>Connect with code</button>
          </form>
          {state?.outgoing.map((r) => (
            <button
              className="link-button"
              key={r.id}
              onClick={() => {
                setWaitingId(r.id);
                setBrowse(false);
              }}
            >
              Waiting for {r.displayName} →
            </button>
          ))}
        </>
      )}
    </section>
  );
}
