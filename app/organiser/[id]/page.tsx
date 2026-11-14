"use client";
import { use, useEffect, useState } from "react";
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
      </main>
    </>
  );
}
