import type { Answer } from "./open-now";
export type PublicPerson = {
  participantId: string;
  displayName: string;
  role: string;
  organization: string;
  industry: string;
  introduction: string;
  photo: string;
  expertise: string;
  goalLine: string;
  goals: string[];
  tags: string[];
  offers: string[];
  seeks: string[];
  why: string;
  topics: string[];
  saved: boolean;
  available: boolean;
};
export type DiscoveryPerson = Omit<PublicPerson, "why" | "topics"> & {
  answers: Answer[];
  checkedInAt: string | null;
  openedAt: string | null;
  met: boolean;
};
const common = (a: string[], b: string[]) => a.filter((v) => b.includes(v));
export function evidence(a: DiscoveryPerson, b: DiscoveryPerson) {
  const goal =
    common(a.goals, b.goals)[0] ??
    (a.goalLine === b.goalLine ? a.goalLine : undefined);
  const seek = common(a.seeks, b.offers)[0],
    offer = common(a.offers, b.seeks)[0];
  const tag = common(a.tags, b.tags)[0];
  const why = seek
    ? `You’re looking for “${seek}”; they offer “${seek}”.`
    : offer
      ? `You offer “${offer}”; they’re looking for “${offer}”.`
      : goal
        ? `Shared goal: “${goal}”.`
        : tag
          ? `Shared interest: “${tag}”.`
          : a.seeks[0] && b.offers[0]
            ? `You’re looking for “${a.seeks[0]}”; they offer “${b.offers[0]}”.`
            : `Their goal: “${b.goalLine}”.`;
  return {
    why,
    topics: [
      ...new Set(
        [seek, offer, goal, tag, ...b.offers, ...b.seeks, ...b.tags, b.goalLine].filter(
          (v): v is string => !!v,
        ),
      ),
    ].slice(0, 3),
    eligible: !!(goal || seek || offer || tag),
  };
}
export function publicPerson(
  a: DiscoveryPerson,
  b: DiscoveryPerson,
): PublicPerson {
  const { why, topics } = evidence(a, b);
  return {
    participantId: b.participantId,
    displayName: b.displayName,
    role: b.role,
    organization: b.organization,
    industry: b.industry,
    introduction: b.introduction,
    photo: b.photo,
    expertise: b.expertise,
    goalLine: b.goalLine,
    goals: b.goals,
    tags: b.tags,
    offers: b.offers,
    seeks: b.seeks,
    why,
    topics,
    saved: b.saved,
    available: b.available,
  };
}
/** All comparison keys stay server-side. Stable id is the final tie-break. */
export function discover(
  a: DiscoveryPerson,
  people: DiscoveryPerson[],
  mode: string,
  search = "",
) {
  const shared = (b: DiscoveryPerson) =>
    a.answers.filter(
      (x) =>
        !x.skipped &&
        x.choice !== null &&
        b.answers.some(
          (y) =>
            !y.skipped &&
            y.questionId === x.questionId &&
            y.choice === x.choice,
        ),
    ).length;
  const goal = (b: DiscoveryPerson) =>
    Number(a.goalLine === b.goalLine || common(a.goals, b.goals).length > 0);
  const pair = (b: DiscoveryPerson) =>
    Number(
      common(a.seeks, b.offers).length > 0 ||
        common(a.offers, b.seeks).length > 0,
    );
  return people
    .filter(
      (b) =>
        b.participantId !== a.participantId &&
        b.checkedInAt &&
        (mode !== "for-you" || b.available) &&
        (mode !== "saved" || b.saved) &&
        `${b.displayName} ${b.organization}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((b, c) =>
      mode === "for-you"
        ? Number(b.met) - Number(c.met) ||
          goal(c) - goal(b) ||
          pair(c) - pair(b) ||
          shared(c) - shared(b) ||
          (Date.parse(c.openedAt || "") || 0) -
            (Date.parse(b.openedAt || "") || 0) ||
          b.participantId.localeCompare(c.participantId)
        : b.displayName.localeCompare(c.displayName) ||
          b.participantId.localeCompare(c.participantId),
    )
    .map((b) => publicPerson(a, b));
}
export type Station = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  locationNote: string;
};
