export type Answer = {
  questionId: string;
  choice: number | null;
  skipped: boolean;
};
export type Question = {
  id: string;
  prompt: string;
  kind: string;
  options: string[];
  position: number;
};
export type Candidate = {
  id: string;
  displayName: string;
  goal: string;
  openUntil: string | null;
  openedAt: string | null;
  answers: Answer[];
};
export type OpenEntry = {
  displayName: string;
  goalLine: string;
  chip?: string;
};
/** Pure ordering + fixed projection. Random tie values are injected, never emitted. */
export function openNow(
  caller: Pick<Candidate, "id" | "goal" | "answers">,
  candidates: Candidate[],
  questions: Question[],
  now: number,
  tie: (id: string) => number,
): OpenEntry[] {
  return candidates
    .filter(
      (p) => p.id !== caller.id && p.openUntil && Date.parse(p.openUntil) > now,
    )
    .map((p) => {
      const shared = questions.filter((q) =>
        caller.answers.some(
          (a) =>
            a.questionId === q.id &&
            !a.skipped &&
            a.choice !== null &&
            q.options[a.choice] !== undefined &&
            p.answers.some(
              (b) =>
                b.questionId === q.id && !b.skipped && a.choice === b.choice,
            ),
        ),
      );
      const first = shared[0];
      const choice = caller.answers.find(
        (a) => a.questionId === first?.id,
      )?.choice;
      const entry: OpenEntry = { displayName: p.displayName, goalLine: p.goal };
      if (first && choice != null) entry.chip = first.options[choice];
      return {
        entry,
        goal: Number(p.goal === caller.goal),
        shared: shared.length,
        opened: Date.parse(p.openedAt || "") || 0,
        tie: tie(p.id),
      };
    })
    .sort(
      (a, b) =>
        b.goal - a.goal ||
        b.shared - a.shared ||
        b.opened - a.opened ||
        a.tie - b.tie,
    )
    .map((p) => p.entry);
}
