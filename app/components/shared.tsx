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
        icebreak<span aria-hidden="true">→</span>
      </a>
      <span className="event-label">{name || "A first hello starts here"}</span>
      {children}
    </header>
  );
}
