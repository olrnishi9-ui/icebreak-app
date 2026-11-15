import { Header } from "../components/shared";
import { demoPersonas } from "../../lib/demo-personas";
export default function JudgesDemo() {
  return (
    <>
      <Header />
      <main className="narrow">
        <p className="eyebrow">MeetMates · presentation guide</p>
        <h1>Show the whole hello.</h1>
        <p>
          A real event, two email accounts, and a short introduction. The sample
          personas below are fictional.
        </p>
        <section className="panel">
          <h2>Set the room up</h2>
          <ol className="list-decimal pl-5 space-y-4">
            <li>
              Sign in as organiser. Choose <strong>Create judges demo</strong>{" "}
              and keep the event invitation open.
            </li>
            <li>
              Open the event invitation in two separate browser profiles or
              devices. Use a different real email account on each, then enter
              the code from that inbox.
            </li>
            <li>
              On the first profile screen, choose{" "}
              <strong>Use Alex Morgan</strong> on one device and{" "}
              <strong>Use Maya Chen</strong> on the other. Review the sections
              and save. Answer or skip the five preferences.
            </li>
            <li>
              Open Profile on each device. On the organiser page, scan each
              personal QR or search Alex / Maya and check them in.
            </li>
          </ol>
          <a className="text-link" href="/organiser">
            Create the demo event →
          </a>
        </section>
        <section className="panel mt-6">
          <h2>Walk the judges through it</h2>
          <ol className="list-decimal pl-5 space-y-4">
            <li>
              <strong>Home:</strong> show the event and personal QR shortcut.
            </li>
            <li>
              <strong>Discover:</strong> both attendees choose “I’m open to
              chat.” Alex invites Maya to a five-minute introduction.
            </li>
            <li>
              <strong>Requests:</strong> Maya accepts. Both see the same
              meeting-point illustration and agree on a real nearby place.
            </li>
            <li>
              <strong>Meet:</strong> both choose “I’m here.” Show the
              preparation card, then the conversation cards. Put phones down
              between cards.
            </li>
            <li>
              <strong>Close:</strong> wrap up. Show the private next-step choice
              and both-sided contact consent. Scanning the other person’s QR
              reopens their conversation. Skip or submit private feedback.
            </li>
            <li>
              <strong>Matches:</strong> show the introduction history and
              private notes. No contact appears unless both participants consent
              and have eligible contact fields saved.
            </li>
          </ol>
        </section>
        <h2 className="mt-8">Meet your example personas</h2>
        {demoPersonas.map((p) => (
          <section key={p.name} className="panel my-4">
            <p className="eyebrow">Fictional demo persona</p>
            <h2>{p.name}</h2>
            <p>
              {p.role} · {p.organization}
            </p>
            <p>{p.introduction}</p>
            <p>
              <strong>I can offer:</strong> {p.offer}
              <br />
              <strong>I’m looking for:</strong> {p.lookingFor}
            </p>
            <p className="quiet">
              Interests: {p.interests.join(" · ")}
              <br />
              Goals: {p.goals.join(" · ")}
            </p>
          </section>
        ))}
        <section className="panel mt-6">
          <h2>Keep the demonstration honest</h2>
          <p className="quiet">
            Use only inboxes you control. There is no shared password or login
            bypass. Example profiles are not real attendees or evidence of
            matching quality. The illustrated meeting point is not a venue
            photograph. Station suggestions and new-person notifications are
            reserved for the next release.
          </p>
        </section>
      </main>
    </>
  );
}
