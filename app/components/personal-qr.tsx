"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Profile } from "../../lib/types";
import { ErrorMessage } from "./shared";
export function PersonalQR({ profile }: { profile: Profile }) {
  const [qr, setQr] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (profile.qrToken)
      QRCode.toDataURL(
        `${location.origin}/qr/${profile.event.id}/${profile.qrToken}`,
        { width: 320, margin: 4, errorCorrectionLevel: "M" },
      )
        .then(setQr)
        .catch(() =>
          setError(
            "Your QR could not load. Ask the organiser to find your name.",
          ),
        );
  }, [profile.qrToken, profile.event.id]);
  return (
    <section className="panel text-center">
      <p className="eyebrow">Your personal pass</p>
      <h2>A hello, ready to happen.</h2>
      {qr ? (
        <img
          className="qr"
          src={qr}
          width="320"
          height="320"
          alt="Your personal check-in and follow-up QR"
        />
      ) : (
        <p>Preparing your QR…</p>
      )}
      <h3>{profile.displayName}</h3>
      <p>{profile.event.name}</p>
      <span className="chip">
        {profile.checkedInAt
          ? "You’re checked in"
          : "Show this at the welcome desk"}
      </span>
      <p className="quiet">
        After a conversation, scan each other’s code to open contact exchange.
        Sharing always needs both people’s consent.
      </p>
      <ErrorMessage message={error} />
    </section>
  );
}
