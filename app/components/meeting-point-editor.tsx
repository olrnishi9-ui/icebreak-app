"use client";
import { useState } from "react";
import { api } from "../../lib/supabase";
import type { MeetingPoint } from "../../lib/connections";
import { ErrorMessage } from "./shared";
export function MeetingPointEditor({
  eventId,
  initial,
}: {
  eventId: string;
  initial: MeetingPoint[];
}) {
  const [points, setPoints] = useState(
      initial.map(({ label, photoUrl, direction }) => ({
        label,
        photoUrl,
        direction,
      })),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  return (
    <section className="panel">
      <h2>Meeting points</h2>
      <p>
        Use visible landmarks at your venue, with a photo and a one-line
        direction. Points in this order break ties when equally busy.
      </p>
      <ErrorMessage message={error} />
      {saved && <p role="status">Meeting points saved.</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setSaved(false);
          try {
            await api(`/api/events/${eventId}/meeting-points`, "PUT", {
              meetingPoints: points,
            });
            setSaved(true);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {points.map((p, i) => (
          <fieldset key={i}>
            <legend>Point {i + 1}</legend>
            {(["label", "photoUrl", "direction"] as const).map((k) => (
              <label key={k}>
                {k === "photoUrl"
                  ? "Photo URL"
                  : k === "direction"
                    ? "One-line direction"
                    : "Label / number"}
                <input
                  type={k === "photoUrl" ? "url" : "text"}
                  required
                  maxLength={k === "photoUrl" ? 2000 : k === "label" ? 80 : 240}
                  value={p[k]}
                  onChange={(e) => {
                    setSaved(false);
                    setPoints(
                      points.map((v, j) =>
                        j === i ? { ...v, [k]: e.target.value } : v,
                      ),
                    );
                  }}
                />
              </label>
            ))}
            <button
              type="button"
              className="link-button"
              disabled={busy}
              onClick={() => setPoints(points.filter((_, j) => i !== j))}
            >
              Remove point
            </button>
          </fieldset>
        ))}
        <div className="actions">
          <button
            type="button"
            className="secondary"
            disabled={busy || points.length >= 20}
            onClick={() =>
              setPoints([...points, { label: "", photoUrl: "", direction: "" }])
            }
          >
            Add meeting point
          </button>
          <button disabled={busy || !points.length}>Save meeting points</button>
        </div>
      </form>
    </section>
  );
}
