import type { ArcView } from "./arc-service";
/** Offline rendering uses only the downloaded script. The queued position is a CAS token. */
export function localArcAction(v: ArcView, action: string): ArcView {
  if (action === "keep-talking")
    return {
      ...v,
      phase: "conversation",
      position: Math.max(0, v.script.cards.length - 2),
      offered: false,
    };
  if (action === "wrap-up" || v.script.cards[v.position + 1]?.kind === "close")
    return {
      ...v,
      phase: "closing",
      position: v.script.cards.length - 1,
      elapsed: 0,
      skipped: [],
      cardsState: v.script.cards.map((_, i) =>
        i === v.script.cards.length - 1 ? "current" : "done",
      ),
      offered: false,
      role: "symmetric",
    };
  if (action === "advance" || action === "skip") {
    const position = Math.min(v.position + 1, v.script.cards.length - 1),
      kind = v.script.cards[position].kind;
    return {
      ...v,
      position,
      cardsState: v.script.cards.map((_, i) =>
        i === position
          ? "current"
          : i === v.position && action === "skip"
            ? "skipped"
            : i < position
              ? v.cardsState[i] === "skipped"
                ? "skipped"
                : "done"
              : "upcoming",
      ),
      skipped: action === "skip" ? [...v.skipped, v.position] : v.skipped,
      offered: false,
      role:
        kind === "expand"
          ? v.side === "a"
            ? "starter"
            : "listener"
          : kind === "deepen"
            ? v.side === "a"
              ? "listener"
              : "starter"
            : "symmetric",
    };
  }
  return v;
}
