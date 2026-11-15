"use client";
export type Tab = "Home" | "Discover" | "Requests" | "Matches" | "Profile";
const paths: Record<Tab, string> = {
  Home: "m3 10 9-7 9 7v11h-6v-7H9v7H3Z",
  Discover: "m21 3-6 12-12 6L9 9Z M9 9l6 6",
  Requests: "M4 4h16v13H8l-4 4Z M8 8h8 M8 12h6",
  Matches:
    "M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8 M16 12a4 4 0 1 0 0-8 M2 21v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3 M18 14a4 4 0 0 1 4 4v3",
  Profile:
    "M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10 M3 23v-4a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v4",
};
export function BottomNav({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {(Object.keys(paths) as Tab[]).map((t) => (
        <button
          key={t}
          aria-current={tab === t ? "page" : undefined}
          onClick={() => onChange(t)}
        >
          <NavIcon tab={t} />
          {t}
        </button>
      ))}
    </nav>
  );
}

export function NavIcon({ tab }: { tab: Tab }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[tab]} />
    </svg>
  );
}
