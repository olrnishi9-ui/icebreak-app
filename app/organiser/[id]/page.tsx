"use client";
import { use, useEffect, useState } from "react";
import { MeetingPointEditor } from "../../components/meeting-point-editor";
import { CheckIn } from "../../components/check-in";
import QRCode from "qrcode";
import { api } from "../../../lib/supabase";
import type { EventInvite } from "../../../lib/types";
import { Header, Loading, ErrorMessage } from "../../components/shared";
export default function Invitation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [invite, setInvite] = useState<EventInvite | null>(null),
    [qr, setQr] = useState(""),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    setError("");
    api<EventInvite>(`/api/events/${id}/organiser`)
      .then(async (v) => {
        setInvite(v);
        setQr(
          await QRCode.toDataURL(v.joinUrl, {
            width: 360,
            margin: 4,
            errorCorrectionLevel: "M",
          }),
        );
      })
      .catch((e) => setError(e.message));
  }, [id, retry]);
  return (
    <>
      <Header name={invite?.event.name} />
      <main className="narrow">
        <section className="panel ticket">
          <p className="eyebrow">The invitation · show it around</p>
          <h1>{invite?.event.name || "Your event"}</h1>
          {invite?.event.demo && (
            <div className="rounded-2xl bg-mint p-4">
              <p className="eyebrow">Judges walkthrough</p>
              <p className="quiet">
                Open the invitation in two separate browsers. Sign in with two
                real emails, choose Alex and Maya, save both profiles, then
                check in both QR codes below.
              </p>
              <a className="text-link" href="/judges-demo">
                Open the presentation guide →
              </a>
            </div>
          )}
          {error ? (
            <>
              <ErrorMessage message={error} />
              <button onClick={() => setRetry(retry + 1)}>Retry</button>
            </>
          ) : !invite || !qr ? (
            <Loading label="Preparing your invitation…" />
          ) : (
            <>
              <img
                className="qr"
                src={qr}
                width={360}
                height={360}
                alt={`Scan to join ${invite.event.name}`}
              />
              <label>
                Join with code
                <input
                  readOnly
                  className="event-code"
                  value={invite.joinCode}
                />
              </label>
              <label>
                Or share this link
                <input
                  readOnly
                  value={invite.joinUrl}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <a className="text-link" href={invite.joinUrl}>
                Open event invitation →
              </a>
            </>
          )}
        </section>
        {invite && <CheckIn eventId={id} />}
        {invite && (
          <MeetingPointEditor
            eventId={id}
            initial={invite.meetingPoints ?? []}
          />
        )}
      </main>
    </>
  );
}
