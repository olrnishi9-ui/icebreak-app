import type { ArcView } from "./arc-service";
export type MeetingPoint = {
  id: string;
  label: string;
  photoUrl: string;
  direction: string;
};
/** Input order is configured order. No location or popularity signal is used. */
export function assignMeetingPoint(
  points: MeetingPoint[],
  live: ReadonlyMap<string, number>,
): MeetingPoint | null {
  return points.reduce<MeetingPoint | null>(
    (best, point) =>
      !best || (live.get(point.id) ?? 0) < (live.get(best.id) ?? 0)
        ? point
        : best,
    null,
  );
}
export type Connection = {
  id: string;
  displayName: string;
  goalLine: string;
  sharedReason: string;
  duration: number;
  kind: "board" | "code";
  status: "pending" | "accepted" | "expired";
  expiresAt: string;
};
export type MeetSession = {
  id: string;
  partner: { displayName: string; goalLine: string };
  duration: number;
  sharedReason: string;
  meetingPoint: MeetingPoint | null;
  state: "meeting" | "started" | "closing";
  arc: ArcView;
  startedAt: string | null;
  arrived: boolean;
  partnerArrived: boolean;
  partnerOnTheirWay: boolean;
};
export type ConnectionState = {
  shortCode: string;
  incoming: Connection[];
  outgoing: Connection[];
  session: MeetSession | null;
};
/** Same selector drives restoration and the browser's S4/S3 expiry transition. */
export function connectionScreen(
  state: ConnectionState,
  waitingId?: string | null,
) {
  if (state.session)
    return state.session.state === "started" ? "started" : "meet";
  if (state.outgoing.some((r) => !waitingId || r.id === waitingId))
    return "waiting";
  return "board";
}
