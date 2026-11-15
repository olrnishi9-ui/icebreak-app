import type { Answer, Question } from "./open-now";
export const LIGHTEST_ORDER = "question.position ascending, then question.id";
export const ARC_COPY = {
  short:
    "There is less shared material here. A shorter conversation is welcome.",
  disclosure:
    "Either of you can wrap up at any time — it looks exactly like this card arriving on schedule.",
  starter: "Say one thing about yourself first, then ask in your own words.",
  listener: "Ask one follow-up question.",
  close:
    "Each say one specific thing you will remember. Choose any next step privately.",
  exhausted: "You’ve used the real material — a good place to wrap up.",
  hook: "Return to something they mentioned and ask one more question.",
  feedback:
    "Optional feedback about the conversation format, never the person.",
};
export type ArcPerson = {
  goal: string;
  answers: Answer[];
  interests: { interest_type: string; topic: string; share_consent: boolean }[];
};
export type Card = {
  kind: "prep" | "expand" | "deepen" | "spare" | "close";
  framing: string;
  facts: string[];
  aboutA?: string[];
  aboutB?: string[];
  fallback?: { framing: string; facts: string[] };
};
export type Arc = { cards: Card[]; notice: string | null; disclosure: string };
/** No clock, randomness, IO or unapproved profile data. Inputs are snapshotted at creation. */
export function buildArc(
  a: ArcPerson,
  b: ArcPerson,
  event: { name: string; questions: Question[] },
): Arc {
  const shared: Card[] = [],
    differ: Card[] = [];
  for (const q of [...event.questions].sort(
    (x, y) => x.position - y.position || x.id.localeCompare(y.id),
  )) {
    const x = a.answers.find((v) => v.questionId === q.id),
      y = b.answers.find((v) => v.questionId === q.id);
    if (
      !x ||
      !y ||
      x.skipped ||
      y.skipped ||
      x.choice == null ||
      y.choice == null ||
      !q.options[x.choice] ||
      !q.options[y.choice]
    )
      continue;
    (x.choice === y.choice ? shared : differ).push({
      kind: "spare",
      framing: x.choice === y.choice ? "A shared answer" : "Different answers",
      facts:
        x.choice === y.choice
          ? [q.options[x.choice]]
          : [q.options[x.choice], q.options[y.choice]],
    });
  }
  const material = [...shared, ...differ],
    opener = material.shift();
  const topics = (p: ArcPerson, t: string) =>
    p.interests
      .filter((i) => i.share_consent && i.interest_type === t)
      .map((i) => i.topic)
      .sort();
  const pair =
    topics(a, "help").find((t) => topics(b, "learn").includes(t)) ??
    topics(b, "help").find((t) => topics(a, "learn").includes(t));
  const cards: Card[] = [
    opener
      ? { ...opener, kind: "prep" }
      : { kind: "prep", framing: "Both at this event", facts: [event.name] },
    {
      kind: "expand",
      framing: pair
        ? "Help and learn"
        : a.goal === b.goal
          ? "A shared goal"
          : "Your goals",
      facts: pair ? [pair] : a.goal === b.goal ? [a.goal] : [a.goal, b.goal],
    },
  ];
  if (opener) {
    const aa = topics(a, "ask_me_about"),
      bb = topics(b, "ask_me_about");
    if (aa.length || bb.length) {
      const fallback = !aa.length || !bb.length ? material.shift() : undefined;
      cards.push({
        kind: "deepen",
        framing: "Ask me about",
        facts: [],
        aboutA: aa,
        aboutB: bb,
        ...(fallback
          ? { fallback: { framing: fallback.framing, facts: fallback.facts } }
          : {}),
      });
    } else if (material.length)
      cards.push({ ...material.shift()!, kind: "deepen" });
    cards.push(...material, {
      kind: "spare",
      framing: ARC_COPY.hook,
      facts: [],
    });
  }
  cards.push({ kind: "close", framing: ARC_COPY.close, facts: [] });
  return {
    cards,
    notice: opener ? null : ARC_COPY.short,
    disclosure: ARC_COPY.disclosure,
  };
}

export function promptCategory(card: Card): string {
  if (card.kind === "prep") return "Icebreaker";
  if (card.kind === "close") return "Next step";
  if (card.framing === "Help and learn") return "Complementary value";
  if (card.framing === "A shared answer") return "Shared interest";
  return "Professional insight";
}
