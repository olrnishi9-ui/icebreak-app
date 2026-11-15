"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/supabase";
import { ErrorMessage } from "./shared";
type Result = {
  participantId: string;
  displayName: string;
  checkedInAt: string | null;
};
export function CheckIn({
  eventId,
  initialToken = "",
}: {
  eventId: string;
  initialToken?: string;
}) {
  const [input, setInput] = useState(initialToken),
    [name, setName] = useState(""),
    [results, setResults] = useState<Result[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [scanning, setScanning] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null);
  function stop() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setScanning(false);
  }
  useEffect(
    () => () => stream.current?.getTracks().forEach((t) => t.stop()),
    [],
  );
  async function check(body: object) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const r = await api<{ displayName: string }>(
        `/api/events/${eventId}/check-in`,
        "POST",
        body,
      );
      setNotice(`${r.displayName} is checked in.`);
      setResults([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function token(value: string) {
    try {
      const url = new URL(value);
      const path = url.pathname.split("/");
      if (path[1] !== "qr" || path[2] !== eventId) throw Error();
      return path[3];
    } catch {
      if (/^[0-9a-f]{64}$/.test(value)) return value;
      throw Error("Scan a personal QR for this event.");
    }
  }
  async function scan() {
    setError("");
    try {
      const Detector = (
        window as unknown as {
          BarcodeDetector?: new (o: { formats: string[] }) => {
            detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
          };
        }
      ).BarcodeDetector;
      if (!Detector)
        throw Error(
          "Camera scanning is unavailable in this browser. Use the QR link field or name search below.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setScanning(true);
      setTimeout(async () => {
        if (!video.current || !stream.current) return;
        video.current.srcObject = stream.current;
        await video.current.play();
        const detector = new Detector({ formats: ["qr_code"] });
        const tick = async () => {
          if (!stream.current || !video.current) return;
          try {
            const codes = await detector.detect(video.current);
            if (codes[0]) {
              const t = token(codes[0].rawValue);
              stop();
              setInput(t);
              await check({ token: t });
              return;
            }
            setTimeout(tick, 200);
          } catch (e) {
            stop();
            setError((e as Error).message);
          }
        };
        void tick();
      }, 0);
    } catch (e) {
      stop();
      setError((e as Error).message);
    }
  }
  return (
    <section className="panel mt-6">
      <p className="eyebrow">Welcome desk</p>
      <h2>Check in an attendee</h2>
      <p className="quiet">
        A checked-in attendee can appear on the event board when they’re open to
        chat.
      </p>
      <button
        className="secondary"
        disabled={busy || scanning}
        onClick={() => void scan()}
      >
        Scan personal QR
      </button>
      {scanning && (
        <>
          <video
            className="w-full rounded-2xl mt-4"
            ref={video}
            muted
            playsInline
          />
          <button className="link-button" onClick={stop}>
            Stop camera
          </button>
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            void check({ token: token(input.trim()) });
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <label>
          Personal QR link or token
          <input
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <button disabled={busy}>Check in</button>
      </form>
      <fieldset>
        <legend>Find by name</legend>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setNotice("");
            try {
              const rows = await api<Result[]>(
                `/api/events/${eventId}/check-in?name=${encodeURIComponent(name)}`,
              );
              setResults(rows);
              if (!rows.length)
                setNotice(
                  "No saved profiles found. Check the spelling or ask the attendee to finish their profile.",
                );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Attendee name
            <input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button className="secondary" disabled={busy}>
            Search names
          </button>
        </form>
        {results.map((p) => (
          <div className="incoming-request" key={p.participantId}>
            <h3>{p.displayName}</h3>
            <button
              className="secondary"
              disabled={busy || !!p.checkedInAt}
              onClick={() => void check({ participant: p.participantId })}
            >
              {p.checkedInAt ? "Checked in" : "Check in this attendee"}
            </button>
          </div>
        ))}
      </fieldset>
      <ErrorMessage message={error} />
      {notice && (
        <p role="status" className="rounded-2xl bg-mint p-4">
          {notice}
        </p>
      )}
    </section>
  );
}
