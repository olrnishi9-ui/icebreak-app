"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/supabase";
import type { Station } from "../../lib/discovery";
import { ErrorMessage } from "./shared";
export function StationEditor({ eventId }: { eventId: string }) {
  const [stations, setStations] = useState<Station[]>([]),
    [edit, setEdit] = useState<Station | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => {
    try {
      setStations(await api(`/api/stations?eventId=${eventId}&manage=true`));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void load();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="panel" id="stations">
      <p className="eyebrow">Spaces for connection</p>
      <h2>Stations</h2>
      <p className="quiet">
        Suggest places to explore. Use tags attendees have chosen in their
        profiles.
      </p>
      <ErrorMessage message={error} />
      {stations.map((s) => (
        <article className="border-t border-[#D4E6DC] py-4" key={s.id}>
          <h3>{s.name}</h3>
          <p>{s.description}</p>
          <p className="quiet">
            {s.locationNote} · {s.tags.join(" · ")}
          </p>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => setEdit(s)}
          >
            Edit station
          </button>
          <button
            className="link-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/api/stations/${s.id}?eventId=${eventId}`, "DELETE");
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete station
          </button>
        </article>
      ))}
      <form
        key={edit?.id ?? "new"}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          setBusy(true);
          setError("");
          try {
            await api(
              `/api/stations${edit ? `/${edit.id}` : ""}`,
              edit ? "PUT" : "POST",
              {
                eventId,
                name: data.get("name"),
                description: data.get("description"),
                locationNote: data.get("location"),
                tags: String(data.get("tags"))
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              },
            );
            setEdit(null);
            form.reset();
            await load();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>{edit ? "Edit station" : "Add a station"}</h3>
        <label>
          Station name
          <input
            name="name"
            required
            maxLength={80}
            defaultValue={edit?.name}
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            maxLength={500}
            defaultValue={edit?.description}
          />
        </label>
        <label>
          Tags · separated by commas
          <input
            name="tags"
            required
            defaultValue={edit?.tags.join(", ")}
            maxLength={2000}
          />
        </label>
        <label>
          Location note
          <input
            name="location"
            maxLength={240}
            defaultValue={edit?.locationNote}
          />
        </label>
        <button disabled={busy}>
          {edit ? "Save station" : "Create station"}
        </button>
        {edit && (
          <button
            type="button"
            className="link-button"
            onClick={() => setEdit(null)}
          >
            Cancel edit
          </button>
        )}
      </form>
    </section>
  );
}
