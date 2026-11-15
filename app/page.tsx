"use client";
import { useEffect, useState } from "react";
import { Header } from "./components/shared";
export default function Home() {
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
          <p>Bring your expertise. Start with your MeetMates profile.</p>
          <button onClick={() => location.assign("/sign-in")}>
            Get started
          </button>
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
