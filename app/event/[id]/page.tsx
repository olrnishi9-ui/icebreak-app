"use client";
import { use, useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/supabase";
import type { Profile } from "../../../lib/types";
import type { Answer, OpenEntry } from "../../../lib/open-now";
import { Header, Loading, ErrorMessage } from "../../components/shared";
import { ProfileEditor } from "../../components/profile-editor";
export default function EventHome({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null),
    [error, setError] = useState(""),
    [offline, setOffline] = useState(false),
    [busy, setBusy] = useState(false),
    [list, setList] = useState<OpenEntry[] | null>(null),
    [edit, setEdit] = useState(false),
    [questions, setQuestions] = useState(false),
    [clock, setClock] = useState(Date.now()),
    [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    try {
      const p = await api<Profile>(`/api/profile?eventId=${id}`);
      setProfile(p);
      localStorage.setItem("icebreak-event", id);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const home = profile?.step === "home";
  useEffect(() => {
    if (!home) return;
    let live = true,
      running = false;
    async function poll() {
      if (running) return;
      running = true;
      try {
        const entries = await api<OpenEntry[]>(`/api/events/${id}/open`);
        const p = await api<Profile>(`/api/profile?eventId=${id}`);
        if (live) {
          setList(entries);
          setProfile(p);
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
  }, [home, id]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveAnswer(questionId: string, choice: number | null) {
    await action(async () => {
      setProfile(
        await api<Profile>("/api/questionnaire", "POST", {
          eventId: id,
          complete: false,
          answers: [{ questionId, choice, skipped: choice === null }],
        }),
      );
    });
  }
  async function finish(skipAll: boolean) {
    await action(async () => {
      const answers: Answer[] = profile!.questions.map((q) =>
        skipAll
          ? { questionId: q.id, choice: null, skipped: true }
          : (profile!.answers.find((a) => a.questionId === q.id) ?? {
              questionId: q.id,
              choice: null,
              skipped: true,
            }),
      );
      setProfile(
        await api<Profile>("/api/questionnaire", "POST", {
          eventId: id,
          answers,
        }),
      );
      setQuestions(false);
    });
  }
  const until = profile?.openUntil ? Date.parse(profile.openUntil) : 0,
    open = until > clock;
  return (
    <>
      <Header name={profile?.event.name}>
        {profile && (
          <button
            className="link-button"
            disabled={busy || offline}
            onClick={() =>
              void action(async () => {
                await api(`/api/events/${id}/membership`, "DELETE");
                localStorage.removeItem("icebreak-event");
                location.assign("/");
              })
            }
          >
            Leave event
          </button>
        )}
      </Header>
      <main className="room">
        {!profile ? (
          loaded ? (
            <section className="panel">
              <h1>Let’s get you back in.</h1>
              <ErrorMessage message={error} />
              <button onClick={() => void load()}>Retry</button>
              <a className="text-link" href="/">
                Enter an event code →
              </a>
            </section>
          ) : (
            <Loading label="Restoring your event…" />
          )
        ) : (
          <>
            <div className="room-title">
              <p className="eyebrow">{profile.event.name}</p>
              <h1>
                {home
                  ? "A little space for a hello."
                  : `You’re in, ${profile.displayName}.`}
              </h1>
              <p>
                {home
                  ? "People here have chosen to be open to chat."
                  : "Quick setup is optional. Skip everything and head straight in."}
              </p>
            </div>
            <ErrorMessage message={error} />
            {offline && (
              <p role="status" className="notice">
                Connection lost. Retrying automatically. This list may be out of
                date; controls are read-only until we reconnect.
              </p>
            )}
            {!home || questions ? (
              <section className="panel">
                <h2>A few easy conversation starters</h2>
                <p className="quiet">
                  Answering allows one shared option to appear on the event
                  board. Skip means neither, both, or simply “I’d rather not.”
                  Your other answers stay private.
                </p>
                {profile.questions.map((q) => {
                  const answer = profile.answers.find(
                    (a) => a.questionId === q.id,
                  );
                  return (
                    <fieldset key={q.id}>
                      <legend>{q.prompt}</legend>
                      <div className="choices">
                        {q.options.map((option, i) => (
                          <button
                            type="button"
                            className="option"
                            aria-pressed={
                              answer?.choice === i && !answer.skipped
                            }
                            key={option}
                            disabled={busy || offline}
                            onClick={() => void saveAnswer(q.id, i)}
                          >
                            {option}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="option skip"
                          aria-pressed={answer?.skipped === true}
                          disabled={busy || offline}
                          onClick={() => void saveAnswer(q.id, null)}
                        >
                          Skip
                        </button>
                      </div>
                    </fieldset>
                  );
                })}
                <div className="actions">
                  <button
                    disabled={busy || offline}
                    onClick={() => void finish(false)}
                  >
                    I’m in
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || offline}
                    onClick={() => void finish(true)}
                  >
                    Skip all and continue
                  </button>
                </div>
              </section>
            ) : (
              <>
                <section className="availability panel">
                  <div>
                    <h2>Your invitation to chat</h2>
                    <p>
                      {open
                        ? `Open until ${new Date(until).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${Math.ceil((until - clock) / 60000)} min left`
                        : "You’re keeping to yourself for now."}
                    </p>
                    <p className="quiet">
                      Opening shows your name and goal in this event for 15
                      minutes.
                    </p>
                  </div>
                  <div>
                    <button
                      role="switch"
                      aria-checked={open}
                      disabled={busy || offline}
                      onClick={() =>
                        void action(async () => {
                          const v = await api<{ openUntil: string | null }>(
                            `/api/events/${id}/availability`,
                            "PUT",
                            { open: !open },
                          );
                          setProfile({ ...profile, openUntil: v.openUntil });
                        })
                      }
                    >
                      {open ? "Open to chat · turn off" : "I’m open to chat"}
                    </button>
                    {open && (
                      <button
                        className="link-button"
                        disabled={busy || offline}
                        onClick={() =>
                          void action(async () => {
                            const v = await api<{ openUntil: string | null }>(
                              `/api/events/${id}/availability`,
                              "PUT",
                              { open: true },
                            );
                            setProfile({ ...profile, openUntil: v.openUntil });
                          })
                        }
                      >
                        Stay open for 15 more minutes
                      </button>
                    )}
                  </div>
                </section>
                <section>
                  <div className="section-title">
                    <h2>Open to chat</h2>
                    <button
                      className="link-button"
                      disabled={busy || offline}
                      onClick={() => setQuestions(true)}
                    >
                      Edit your answers
                    </button>
                  </div>
                  <p className="quiet">
                    The list order is not a ranking. Start with a hello, and
                    check that now is a good time.
                  </p>
                  {list === null ? (
                    <Loading label="Seeing who’s open…" />
                  ) : list.length === 0 ? (
                    <div className="empty panel">
                      <span className="hello-mark" aria-hidden="true">
                        hello.
                      </span>
                      <h2>Nobody’s open right now — you can be the first</h2>
                      <p>
                        You can open to chat above, or say hello to someone
                        nearby.
                      </p>
                      <label>
                        Event code
                        <input readOnly value={profile.event.code} />
                      </label>
                      <a
                        href={`/join/${profile.event.code}`}
                        className="text-link"
                      >
                        Share this event invitation →
                      </a>
                    </div>
                  ) : (
                    <ul className="people">
                      {list.map((p, i) => (
                        <li className="person" key={i}>
                          <h3>{p.displayName}</h3>
                          <p>{p.goalLine}</p>
                          {p.chip && <span className="chip">{p.chip}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
            <section className="panel">
              <div className="section-title">
                <div>
                  <p className="eyebrow">Make it yours · optional</p>
                  <h2>Your profile</h2>
                </div>
                <button
                  className="link-button"
                  disabled={busy || offline}
                  aria-expanded={edit}
                  onClick={() => setEdit(!edit)}
                >
                  {edit ? "Close editor" : "Edit profile"}
                </button>
              </div>
              {edit ? (
                <ProfileEditor
                  profile={profile}
                  busy={busy || offline}
                  save={async (body) => {
                    await action(async () => {
                      setProfile(
                        await api<Profile>("/api/profile", "PUT", {
                          ...body,
                          eventId: id,
                        }),
                      );
                      setEdit(false);
                    });
                  }}
                />
              ) : (
                <p className="quiet">
                  Add a fun fact, an interest, or something you’d like to learn.
                  You can leave these empty forever.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
