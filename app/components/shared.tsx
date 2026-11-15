"use client";
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p className="notice" role="alert">
      {message}
    </p>
  ) : null;
}
export function Loading({ label = "Opening the event…" }: { label?: string }) {
  return (
    <div role="status" className="panel">
      <p>{label}</p>
      <div className="skeleton" />
      <div className="skeleton short" />
    </div>
  );
}
export function Header({
  name,
  children,
}: {
  name?: string;
  children?: React.ReactNode;
}) {
  return (
    <header>
      <a href="/" className="wordmark">
        <span
          aria-hidden="true"
          className="relative inline-flex h-9 w-12 shrink-0 items-center"
        >
          <span className="absolute left-0 h-8 w-8 rounded-full bg-[#5BE3B0]" />
          <span className="absolute left-5 h-8 w-8 rounded-full bg-primary mix-blend-multiply" />
        </span>{" "}
        MeetMates
      </a>
      <span className="event-label">
        {name || "Explore Broadly. Connect Deeply."}
      </span>
      {children}
    </header>
  );
}

export function Avatar({ name, photo }: { name: string; photo?: string }) {
  return photo ? (
    <img
      className="h-16 w-16 rounded-2xl object-cover"
      src={photo}
      alt={`${name}’s profile`}
    />
  ) : (
    <span
      aria-label={`${name}’s initials`}
      className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#DCEFE7] text-xl font-bold text-[#075C40]"
    >
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}
