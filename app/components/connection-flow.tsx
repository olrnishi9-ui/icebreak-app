"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../lib/supabase";
import type { ConnectionState, Connection } from "../../lib/connections";
import { Conversation } from "./conversation";
import { MatchedProfile } from "./matched-profile";
import { Discover } from "./discover";
import { Avatar, ErrorMessage } from "./shared";
export function ConnectionFlow({
  eventId,
  onFlow,
  selection,
  clearSelection,
  parentOffline = false,
  onOffline,
  mode = "requests",
  onDiscover,
  onRequest,
}: {
  eventId: string;
  onFlow: (active: boolean) => void;
  selection: { participantId?: string; displayName: string } | null;
  clearSelection: () => void;
  parentOffline?: boolean;
  onOffline?: (offline: boolean) => void;
  mode?: "requests" | "matches";
  onDiscover?: () => void;
  onRequest?: (p: { participantId: string; displayName: string }) => void;
}) {
  const [state, setState] = useState<ConnectionState | null>(null),
    [offline, setOffline] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [tab, setTab] = useState("Received"),
    [code, setCode] = useState(""),
    [profileId, setProfileId] = useState<string | null>(null);
  const receive = useCallback((s: ConnectionState) => {
    if (
      s.session?.arc.own.done &&
      localStorage.getItem(`icebreak-finished-${s.session.id}`) === "yes"
    )
      s = { ...s, session: null };
    setState(s);
  }, []);
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
    const t = setInterval(() => void poll(), 3000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [eventId, receive]);
  useEffect(() => onOffline?.(offline), [offline, onOffline]);
  const session = state?.session,
    active = !!session || !!selection || !!profileId;
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
      return s;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function safety(id: string, report: boolean) {
    setBusy(true);
    setError("");
    try {
      await api(report ? "/api/reports" : "/api/blocks", "POST", {
        eventId,
        requestId: id,
      });
      receive(
        await api<ConnectionState>(`/api/connections?eventId=${eventId}`),
      );
      if (report) setError("Report received.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const disabled = busy || offline || parentOffline;
  async function requestAction(r: Connection, action: string) {
    await act(`/api/connections/${r.id}`, "PATCH", { action });
  }
  const currentTab = mode === "matches" ? "Matches" : tab;
  return (
    <section className="space-y-4" aria-label="Connections">
      {offline && (
        <p className="notice" role="status">
          Connection lost. Retrying automatically. Controls are read-only until
          we reconnect.
        </p>
      )}
      <ErrorMessage message={error} />
      {session && session.state !== "meeting" ? (
        <section className="panel">
          <Conversation
            key={session.id}
            eventId={eventId}
            session={session}
            onFinish={() => {
              localStorage.setItem(`icebreak-finished-${session.id}`, "yes");
              setState(state ? { ...state, session: null } : null);
              onDiscover?.();
            }}
          />
        </section>
      ) : session ? (
        <section className="panel">
          <MatchedProfile
            eventId={eventId}
            sessionId={session.id}
            session={session}
          />
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
                className="secondary"
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
        </section>
      ) : profileId ? (
        <section className="panel">
          <button className="link-button" onClick={() => setProfileId(null)}>
            Back to matches
          </button>
          <MatchedProfile eventId={eventId} sessionId={profileId} />
        </section>
      ) : selection ? (
        <section className="panel">
          <p className="eyebrow">A short introduction</p>
          <h2>Invite {selection.displayName} to chat</h2>
          <p>
            Start with 5 minutes. If you both want to continue, you can extend
            together.
          </p>
          <div className="actions">
            <button
              disabled={disabled || !selection.participantId}
              onClick={async () => {
                const s = await act("/api/connections", "POST", {
                  participant: selection.participantId,
                });
                if (s) {
                  clearSelection();
                  setTab("Sent");
                }
              }}
            >
              Send request
            </button>
            <button className="link-button" onClick={clearSelection}>
              Back
            </button>
          </div>
        </section>
      ) : (
        <>
          {mode === "requests" && (
            <div
              className="flex rounded-2xl bg-white p-1 gap-1"
              role="tablist"
              aria-label="Manage requests"
            >
              {["Received", "Sent", "Matches", "Saved"].map((t) => (
                <button
                  role="tab"
                  aria-selected={currentTab === t}
                  className={`flex-1 !px-2 text-[13px] ${currentTab === t ? "" : "secondary !border-0"}`}
                  key={t}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {!state ? (
            <p role="status">Restoring your connections…</p>
          ) : currentTab === "Saved" ? (
            <Discover
              eventId={eventId}
              onlySaved
              onRequest={(p) => onRequest?.(p)}
            />
          ) : currentTab === "Matches" ? (
            <>
              {!state.matches?.length && (
                <section className="panel empty">
                  <span className="hello-mark" aria-hidden="true">
                    hello.
                  </span>
                  <h2 className="mt-4">Your next hello is ahead</h2>
                  <p className="quiet">
                    Accepted introductions appear here with a place to meet.
                  </p>
                </section>
              )}
              {state.matches?.map((m) => (
                <article className="panel" key={m.id}>
                  <Avatar name={m.displayName} />
                  <h3 className="mt-3">{m.displayName}</h3>
                  <p>
                    {m.meetingPoint?.label ?? "Together in person"} ·{" "}
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <button
                    className="secondary"
                    onClick={() => setProfileId(m.id)}
                  >
                    View matched profile
                  </button>
                </article>
              ))}
            </>
          ) : (
            <>
              {(currentTab === "Received" ? state.incoming : state.outgoing)
                .length === 0 && (
                <section className="panel empty">
                  <span className="hello-mark" aria-hidden="true">
                    hello.
                  </span>
                  <h2 className="mt-4">
                    {currentTab === "Received"
                      ? "Room for a new hello"
                      : "Start with a short introduction"}
                  </h2>
                  <p className="quiet">
                    {currentTab === "Received"
                      ? "Invitations will appear here. You can accept when you’re ready, or choose Later."
                      : "Find someone in Discover and send an invitation."}
                  </p>
                </section>
              )}
              {(currentTab === "Received"
                ? state.incoming
                : state.outgoing
              ).map((r) => (
                <article className="panel" key={r.id}>
                  <div className="flex gap-4 items-center">
                    <Avatar name={r.displayName} />
                    <div>
                      <h3>{r.displayName}</h3>
                      <p className="quiet !my-1">{r.goalLine}</p>
                    </div>
                  </div>
                  <p>{r.sharedReason}</p>
                  <p className="quiet text-[13px]">
                    {r.duration} minutes ·{" "}
                    {r.status === "expired"
                      ? "Expired / closed"
                      : r.status === "accepted"
                        ? "Accepted"
                        : "Pending"}
                  </p>
                  <div className="actions">
                    {currentTab === "Received" ? (
                      <>
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
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await api("/api/blocks", "POST", {
                                eventId,
                                requestId: r.id,
                              });
                              receive(
                                await api<ConnectionState>(
                                  `/api/connections?eventId=${eventId}`,
                                ),
                              );
                            } catch (e) {
                              setError((e as Error).message);
                            } finally {
                              setBusy(false);
                            }
                          }}
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
                      </>
                    ) : (
                      r.status === "pending" && (
                        <button
                          className="secondary"
                          disabled={disabled}
                          onClick={() => void requestAction(r, "cancel")}
                        >
                          Withdraw request
                        </button>
                      )
                    )}
                  </div>
                </article>
              ))}
            </>
          )}
          {currentTab === "Received" && (
            <section className="panel">
              <h2>Already said hello?</h2>
              <p>
                Your short code:{" "}
                <strong className="short-code">
                  {state?.shortCode ?? "…"}
                </strong>
              </p>
              <p className="quiet">
                Share this in person. You’ll both confirm a five-minute
                conversation.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await act("/api/connections/code", "POST", { code })) {
                    setCode("");
                    setTab("Sent");
                  }
                }}
              >
                <label>
                  Their short code
                  <input
                    autoComplete="off"
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                  />
                </label>
                <button className="secondary" disabled={disabled}>
                  Connect with code
                </button>
              </form>
            </section>
          )}
        </>
      )}
    </section>
  );
}
