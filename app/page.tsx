"use client";
import { useEffect, useState } from "react";
import { Header, ErrorMessage } from "./components/shared";
export default function Home() {
  const [error, setError] = useState("");
  const [last, setLast] = useState("");
  useEffect(() => setLast(localStorage.getItem("icebreak-event") || ""), []);
  return (
    <>
      <Header />
      <main className="landing">
        <section>
          <p className="eyebrow">Explore Broadly. Connect Deeply.</p>
          <h1>
            Meet people.
            <br />
            Find possibilities.
          </h1>
          <p className="intro">
            Short introductions. Meaningful connections.
            <br />
            Bring your expertise. Discover what you can build together.
          </p>
        </section>
        <section className="panel ticket">
          <p className="eyebrow">Your event invitation</p>
          <h2>Come on in.</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const code = String(new FormData(e.currentTarget).get("code"))
                .trim()
                .toUpperCase();
              if (!/^[A-Z0-9]{4,16}$/.test(code))
                setError("Enter the event code from your organiser.");
              else location.assign(`/join/${code}`);
            }}
          >
            <label>
              Event code
              <input
                name="code"
                required
                maxLength={16}
                autoCapitalize="characters"
                placeholder="HELLO26"
                autoComplete="off"
              />
            </label>
            <ErrorMessage message={error} />
            <button>Get started</button>
          </form>
          {last && (
            <a className="text-link" href={`/event/${last}`}>
              Return to your event →
            </a>
          )}
          <p className="quiet">
            Your invitation, your profile, your next hello.
          </p>
        </section>
        <a className="text-link" href="/organiser">
          Organising an event? Create your invitation →
        </a>
      </main>
    </>
  );
}
