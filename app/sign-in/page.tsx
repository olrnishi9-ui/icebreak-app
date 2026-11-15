import { AttendeeLogin } from "../components/attendee-login";
import { Header } from "../components/shared";
export default function SignIn() {
  return (
    <>
      <Header />
      <main className="narrow">
        <AttendeeLogin />
      </main>
    </>
  );
}
