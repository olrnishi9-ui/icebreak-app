import { snapshotArc, ArcService } from "./arc-service";
import {
  REQUEST_TTL_MIN,
  RE_REQUEST_COOLDOWN_MIN,
  MAX_PENDING_INCOMING,
  MAX_REQUESTS_PER_HOUR,
} from "./connection-policy";
import { EntryService, HttpError, fail, text, uuid, type DB } from "./service";
import {
  assignMeetingPoint,
  type Connection,
  type ConnectionState,
  type MeetingPoint,
  type MeetSession,
} from "./connections";
const neutral = () => {
  throw new HttpError(409, "Not available right now.");
};
const iso = (v: string | Date) => new Date(v).toISOString();
type RequestRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  withdrawn: boolean;
  expires_at: string | Date;
  duration: number;
  shared_reason: string;
  kind: string;
  decision: string | null;
};
type SessionRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  duration: number;
  shared_reason: string;
  meeting_point: MeetingPoint | null;
  started_at: string | Date | null;
  closed_at: string | Date | null;
  arrived_a: boolean;
  arrived_b: boolean;
  late_a: boolean;
  late_b: boolean;
};
export class ConnectionService {
  constructor(
    private db: DB,
    private now: () => number = Date.now,
  ) {}
  private time() {
    return new Date(this.now()).toISOString();
  }
  private async context(auth: string, event: string, db = this.db) {
    const s = new EntryService(db, this.now);
    const p = await s.member(auth, event, db);
    s.active(await s.event(event));
    return p;
  }
  private async lock(db: DB, event: string) {
    await db.query("SELECT id FROM events WHERE id=$1::uuid FOR UPDATE", [
      event,
    ]);
  }
  async state(
    auth: string,
    event: string,
  ): Promise<
    ConnectionState & { notice: { id: string; message: string } | null }
  > {
    const p = await this.context(auth, event);
    const [own] = await this.db.query<{ short_code: string }>(
      "SELECT short_code FROM event_participants WHERE event_id=$1::uuid AND user_id=$2::uuid",
      [event, p.user_id],
    );
    const rows = await this.db.query<Connection & { side: string }>(
      "SELECT * FROM app_private.request_projection($1::uuid,$2::uuid,$3::timestamptz)",
      [event, p.user_id, this.time()],
    );
    const fixed = (r: Connection): Connection => ({
      id: r.id,
      displayName: r.displayName,
      goalLine: r.goalLine,
      sharedReason: r.sharedReason,
      duration: r.duration,
      kind: r.kind,
      status: r.status,
      expiresAt: iso(r.expiresAt),
    });
    const sessions = await this.db.query<SessionRow>(
      "SELECT * FROM sessions WHERE event_id=$1::uuid AND $2::uuid IN(user_a_id,user_b_id) ORDER BY created_at DESC,id DESC",
      [event, p.user_id],
    );
    const live =
      sessions.find((s) => !s.closed_at) ??
      (sessions[0]?.started_at ? sessions[0] : undefined);
    const matches = await this.db.query<{
      id: string;
      displayName: string;
      createdAt: string;
      meetingPoint: MeetingPoint | null;
    }>(
      `SELECT s.id,p.display_name AS "displayName",s.created_at AS "createdAt",s.meeting_point AS "meetingPoint" FROM sessions s JOIN event_participants p ON p.event_id=s.event_id AND p.user_id=CASE WHEN s.user_a_id=$2::uuid THEN s.user_b_id ELSE s.user_a_id END WHERE s.event_id=$1::uuid AND $2::uuid IN(s.user_a_id,s.user_b_id) ORDER BY s.created_at DESC`,
      [event, p.user_id],
    );
    return {
      matches: matches.map((m) => ({ ...m, createdAt: iso(m.createdAt) })),
      shortCode: own.short_code,
      incoming: live
        ? []
        : rows.filter((r) => r.side === "incoming").map(fixed),
      outgoing: rows.filter((r) => r.side === "outgoing").map(fixed),
      session: live
        ? await this.sessionProjection(this.db, event, p.user_id, live)
        : null,
      notice:
        !live && sessions[0]?.closed_at
          ? {
              id: sessions[0].id,
              message: "Plans changed. Open to chat again when you’re ready.",
            }
          : null,
    };
  }
  private async sessionProjection(
    db: DB,
    event: string,
    viewer: string,
    s: SessionRow,
  ): Promise<MeetSession> {
    const a = s.user_a_id === viewer;
    const [p] = await db.query<{ display_name: string; goal: string }>(
      "SELECT display_name,goal FROM event_participants WHERE event_id=$1::uuid AND user_id=$2::uuid",
      [event, a ? s.user_b_id : s.user_a_id],
    );
    return {
      id: s.id,
      partner: { displayName: p.display_name, goalLine: p.goal },
      duration: s.duration,
      sharedReason: s.shared_reason,
      meetingPoint: s.meeting_point,
      state: s.closed_at ? "closing" : s.started_at ? "started" : "meeting",
      arc: await new ArcService(db, this.now).viewBySession(
        event,
        viewer,
        s.id,
      ),
      startedAt: s.started_at ? iso(s.started_at) : null,
      arrived: a ? s.arrived_a : s.arrived_b,
      partnerArrived: a ? s.arrived_b : s.arrived_a,
      partnerOnTheirWay: a ? s.late_b : s.late_a,
    };
  }
  async send(
    auth: string,
    event: string,
    body: Record<string, unknown>,
    byCode = false,
  ) {
    // Code entry defaults to a five-minute time box; board entry requires a choice.
    const duration = body.duration === undefined ? 5 : body.duration;
    if (duration !== 5) return fail("Introductions start at 5 minutes.");
    const entered = byCode
      ? text(body.code, "short code", 8).toUpperCase()
      : null;
    if (entered && !/^[A-Z0-9]{8}$/.test(entered))
      throw new HttpError(404, "Code not found. Check it and try again.");
    const targetId = byCode ? null : uuid(body.participant);
    await this.db.transaction(async (db) => {
      await this.lock(db, event);
      const p = await this.context(auth, event, db);
      const [target] = await db.query<{
        user_id: string;
        display_name: string;
        goal: string;
        checked_in_at: string | null;
        availability_status: string;
        available_until: string | Date | null;
      }>(
        `SELECT user_id,display_name,goal,checked_in_at,availability_status,available_until FROM event_participants WHERE event_id=$1::uuid AND ${byCode ? "short_code=$2" : "user_id=$2::uuid"}`,
        [event, entered ?? targetId],
      );
      if (!target) {
        if (byCode)
          throw new HttpError(404, "Code not found. Check it and try again.");
        return neutral();
      }
      if (target.user_id === p.user_id || (!byCode && !target.checked_in_at))
        return neutral();
      const pair = [event, p.user_id, target.user_id];
      const blocked = await db.query(
        "SELECT 1 FROM blocks WHERE event_id=$1::uuid AND ((actor_id=$2::uuid AND target_id=$3::uuid) OR (actor_id=$3::uuid AND target_id=$2::uuid))",
        pair,
      );
      const active = await db.query(
        "SELECT 1 FROM sessions WHERE event_id=$1::uuid AND closed_at IS NULL AND (user_a_id IN($2::uuid,$3::uuid) OR user_b_id IN($2::uuid,$3::uuid))",
        pair,
      );
      if (blocked.length || active.length) return neutral();
      const history = await db.query<RequestRow>(
        `SELECT r.*,d.decision FROM connection_requests r LEFT JOIN connection_request_decisions d ON d.request_id=r.id WHERE r.event_id=$1::uuid AND ((sender_id=$2::uuid AND r.recipient_id=$3::uuid) OR (sender_id=$3::uuid AND r.recipient_id=$2::uuid)) ORDER BY r.created_at DESC,r.id DESC`,
        pair,
      );
      const pending = history.find(
        (r) =>
          !r.withdrawn &&
          r.status === "pending" &&
          new Date(r.expires_at).getTime() > this.now(),
      );
      if (pending) {
        // Later cannot be probed by reverse send: it fails just as a normal duplicate
        // for the original sender; the recipient already knows their own action.
        if (
          pending.sender_id === target.user_id &&
          !pending.decision &&
          pending.kind === "board" &&
          !byCode
        ) {
          await this.accept(db, event, pending);
          return;
        }
        return neutral();
      }
      if (
        history.some(
          (r) =>
            new Date(r.expires_at).getTime() + RE_REQUEST_COOLDOWN_MIN * 60000 >
            this.now(),
        )
      )
        return neutral();
      if (
        !byCode &&
        (target.availability_status !== "open" ||
          !target.available_until ||
          new Date(target.available_until).getTime() <= this.now())
      )
        return neutral();
      const incoming = await db.query(
        "SELECT id FROM connection_requests WHERE event_id=$1::uuid AND recipient_id=$2::uuid AND status='pending' AND NOT withdrawn AND expires_at>$3::timestamptz",
        [event, target.user_id, this.time()],
      );
      const recent = await db.query(
        "SELECT id FROM connection_requests WHERE event_id=$1::uuid AND sender_id=$2::uuid AND created_at>$3::timestamptz",
        [event, p.user_id, new Date(this.now() - 3600000).toISOString()],
      );
      if (
        incoming.length >= MAX_PENDING_INCOMING ||
        recent.length >= MAX_REQUESTS_PER_HOUR
      )
        return neutral();
      const [shared] = await db.query<{ reason: string }>(
        `SELECT q.options[a.option_index+1] AS reason FROM answers a JOIN answers b ON b.event_id=a.event_id AND b.question_id=a.question_id JOIN questions q ON q.event_id=a.event_id AND q.id=a.question_id WHERE a.event_id=$1::uuid AND a.user_id=$2::uuid AND b.user_id=$3::uuid AND NOT a.skipped AND NOT b.skipped AND a.option_index=b.option_index ORDER BY q.position LIMIT 1`,
        pair,
      );
      const reason =
        shared?.reason ??
        (p.goal === target.goal
          ? `You're both here to ${p.goal}`
          : `${p.goal} · ${target.goal}`);
      await db.query(
        `INSERT INTO connection_requests(event_id,sender_id,recipient_id,duration,shared_reason,kind,created_at,expires_at) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7::timestamptz,$8::timestamptz)`,
        [
          ...pair,
          duration,
          reason,
          byCode ? "code" : "board",
          this.time(),
          new Date(this.now() + REQUEST_TTL_MIN * 60000).toISOString(),
        ],
      );
    });
    return this.state(auth, event);
  }
  private async accept(db: DB, event: string, r: RequestRow) {
    const busy = await db.query(
      "SELECT 1 FROM sessions WHERE event_id=$1::uuid AND closed_at IS NULL AND (user_a_id IN($2::uuid,$3::uuid) OR user_b_id IN($2::uuid,$3::uuid))",
      [event, r.sender_id, r.recipient_id],
    );
    const blocked = await db.query(
      "SELECT 1 FROM blocks WHERE event_id=$1::uuid AND ((actor_id=$2::uuid AND target_id=$3::uuid) OR (actor_id=$3::uuid AND target_id=$2::uuid))",
      [event, r.sender_id, r.recipient_id],
    );
    if (busy.length || blocked.length) return neutral();
    let point: MeetingPoint | null = null;
    if (r.kind === "board") {
      const points = await db.query<MeetingPoint>(
        'SELECT id,label,photo_url AS "photoUrl",direction FROM meeting_points WHERE event_id=$1::uuid ORDER BY position',
        [event],
      );
      const live = await db.query<{ id: string; n: number }>(
        `SELECT meeting_point->>'id' AS id,count(*)::int AS n FROM sessions WHERE event_id=$1::uuid AND closed_at IS NULL AND meeting_point IS NOT NULL GROUP BY meeting_point->>'id'`,
        [event],
      );
      point = assignMeetingPoint(points, new Map(live.map((p) => [p.id, p.n])));
      if (!point) return neutral();
    }
    const script = await snapshotArc(db, event, r.sender_id, r.recipient_id);
    await db.query(
      `INSERT INTO sessions(event_id,request_id,user_a_id,user_b_id,duration,shared_reason,meeting_point,created_at,started_at,arc_script) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7::jsonb,$8::timestamptz,$9::timestamptz,$10::jsonb)`,
      [
        event,
        r.id,
        r.sender_id,
        r.recipient_id,
        r.duration,
        r.shared_reason,
        point ? JSON.stringify(point) : null,
        this.time(),
        r.kind === "code" ? this.time() : null,
        JSON.stringify(script),
      ],
    );
    await db.query(
      "UPDATE connection_requests SET status='accepted' WHERE id=$1::uuid AND event_id=$2::uuid",
      [r.id, event],
    );
    await db.query(
      `INSERT INTO connection_request_decisions(request_id,recipient_id,decision) VALUES($1::uuid,$2::uuid,'accepted')`,
      [r.id, r.recipient_id],
    );
    await db.query(
      `UPDATE event_participants SET availability_status='busy',available_until=null WHERE event_id=$1::uuid AND user_id IN($2::uuid,$3::uuid)`,
      [event, r.sender_id, r.recipient_id],
    );
  }
  async respond(
    auth: string,
    event: string,
    requestId: string,
    action: unknown,
  ) {
    uuid(requestId);
    if (!["accept", "later", "cancel"].includes(String(action)))
      return fail("Choose a request action.");
    await this.db.transaction(async (db) => {
      await this.lock(db, event);
      const p = await this.context(auth, event, db);
      const [r] = await db.query<RequestRow>(
        `SELECT r.*,d.decision FROM connection_requests r LEFT JOIN connection_request_decisions d ON d.request_id=r.id WHERE r.event_id=$1::uuid AND r.id=$2::uuid`,
        [event, requestId],
      );
      if (
        !r ||
        (action === "cancel" ? r.sender_id : r.recipient_id) !== p.user_id
      )
        throw new HttpError(404, "Request not found.");
      if (
        r.status !== "pending" ||
        r.withdrawn ||
        new Date(r.expires_at).getTime() <= this.now()
      )
        return neutral();
      if (action === "cancel")
        await db.query(
          "UPDATE connection_requests SET withdrawn=true WHERE event_id=$1::uuid AND id=$2::uuid",
          [event, r.id],
        );
      else if (action === "later")
        await db.query(
          `INSERT INTO connection_request_decisions(request_id,recipient_id,decision) VALUES($1::uuid,$2::uuid,'declined') ON CONFLICT(request_id) DO NOTHING`,
          [r.id, r.recipient_id],
        );
      else {
        if (r.decision) return neutral();
        await this.accept(db, event, r);
      }
    });
    return this.state(auth, event);
  }
  async sessionAction(auth: string, event: string, id: string, action: string) {
    uuid(id);
    if (!["arrive", "start", "cancel", "late"].includes(action))
      throw new HttpError(404, "Route not found.");
    await this.db.transaction(async (db) => {
      await this.lock(db, event);
      const p = await this.context(auth, event, db);
      const [s] = await db.query<SessionRow>(
        "SELECT * FROM sessions WHERE event_id=$1::uuid AND id=$2::uuid AND $3::uuid IN(user_a_id,user_b_id)",
        [event, id, p.user_id],
      );
      if (!s) throw new HttpError(404, "Session not found.");
      if (s.closed_at) return;
      if (s.started_at) {
        if (action === "arrive" || action === "start") return;
        return neutral();
      }
      const a = s.user_a_id === p.user_id;
      if (action === "cancel") {
        await db.query(
          "UPDATE sessions SET closed_at=$3::timestamptz WHERE event_id=$1::uuid AND id=$2::uuid",
          [event, id, this.time()],
        );
        await db.query(
          "UPDATE event_participants SET availability_status='unavailable',available_until=null WHERE event_id=$1::uuid AND user_id IN($2::uuid,$3::uuid)",
          [event, s.user_a_id, s.user_b_id],
        );
      } else if (action === "start") {
        if (!(a ? s.arrived_a : s.arrived_b))
          return fail("Tap I’m here before starting.");
        await db.query(
          "UPDATE sessions SET started_at=COALESCE(started_at,$3::timestamptz) WHERE event_id=$1::uuid AND id=$2::uuid",
          [event, id, this.time()],
        );
      } else if (action === "late") {
        await db.query(
          `UPDATE sessions SET ${a ? "late_a" : "late_b"}=true WHERE event_id=$1::uuid AND id=$2::uuid`,
          [event, id],
        );
      } else {
        await db.query(
          `UPDATE sessions SET ${a ? "arrived_a" : "arrived_b"}=true,${a ? "late_a" : "late_b"}=false,started_at=CASE WHEN ${a ? "arrived_b" : "arrived_a"} THEN COALESCE(started_at,$3::timestamptz) ELSE started_at END WHERE event_id=$1::uuid AND id=$2::uuid`,
          [event, id, this.time()],
        );
      }
    });
    return this.state(auth, event);
  }
  async safety(
    auth: string,
    event: string,
    body: Record<string, unknown>,
    report: boolean,
  ) {
    if ((body.participant == null) === (body.requestId == null))
      return fail("Choose one participant or request.");
    const participant =
      body.participant == null ? null : uuid(body.participant);
    const requestId = body.requestId == null ? null : uuid(body.requestId);
    const category =
      body.category == null ? null : text(body.category, "category", 80);
    await this.db.transaction(async (db) => {
      await this.lock(db, event);
      const p = await this.context(auth, event, db);
      let target = participant;
      if (requestId) {
        const [r] = await db.query<{ sender_id: string; recipient_id: string }>(
          "SELECT sender_id,recipient_id FROM connection_requests WHERE event_id=$1::uuid AND id=$2::uuid AND $3::uuid IN(sender_id,recipient_id)",
          [event, requestId, p.user_id],
        );
        if (!r) throw new HttpError(404, "Participant not found.");
        target = r.sender_id === p.user_id ? r.recipient_id : r.sender_id;
      }
      const [other] = await db.query(
        "SELECT 1 FROM event_participants WHERE event_id=$1::uuid AND user_id=$2::uuid",
        [event, target],
      );
      if (!other || target === p.user_id)
        throw new HttpError(404, "Participant not found.");
      if (report)
        await db.query(
          "INSERT INTO reports(event_id,actor_id,target_id,category) VALUES($1::uuid,$2::uuid,$3::uuid,$4)",
          [event, p.user_id, target, category],
        );
      else {
        await db.query(
          "INSERT INTO blocks(event_id,actor_id,target_id) VALUES($1::uuid,$2::uuid,$3::uuid) ON CONFLICT DO NOTHING",
          [event, p.user_id, target],
        );
        // Dismiss only the blocker's own inbox, with exactly Later's privacy rule.
        await db.query(
          `INSERT INTO connection_request_decisions(request_id,recipient_id,decision) SELECT id,recipient_id,'declined' FROM connection_requests WHERE event_id=$1::uuid AND sender_id=$2::uuid AND recipient_id=$3::uuid AND status='pending' AND NOT withdrawn AND expires_at>$4::timestamptz ON CONFLICT(request_id) DO NOTHING`,
          [event, target, p.user_id, this.time()],
        );
      }
    });
    return { ok: true };
  }
  async configure(auth: string, event: string, body: Record<string, unknown>) {
    const entry = new EntryService(this.db, this.now);
    await entry.organiser(auth, event, "");
    entry.active(await entry.event(event));
    if (
      !Array.isArray(body.meetingPoints) ||
      body.meetingPoints.length > 20 ||
      !body.meetingPoints.length
    )
      return fail("Configure 1–20 meeting points.");
    const points = body.meetingPoints.map((v) => {
      if (!v || typeof v !== "object") return fail("Check meeting point.");
      const p = v as Record<string, unknown>;
      const photoUrl = text(p.photoUrl, "photo URL", 2000);
      let url: URL;
      try {
        url = new URL(photoUrl);
      } catch {
        return fail("Use an HTTPS photo URL.");
      }
      if (url.protocol !== "https:") return fail("Use an HTTPS photo URL.");
      return {
        label: text(p.label, "point label", 80),
        direction: text(p.direction, "direction", 240),
        photoUrl,
      };
    });
    await this.db.transaction(async (db) => {
      await this.lock(db, event);
      const live = await db.query(
        "SELECT 1 FROM sessions WHERE event_id=$1::uuid AND closed_at IS NULL",
        [event],
      );
      if (live.length)
        throw new HttpError(
          409,
          "Meeting points are in use. Try again after sessions close.",
        );
      await db.query("DELETE FROM meeting_points WHERE event_id=$1::uuid", [
        event,
      ]);
      for (const [i, p] of points.entries())
        await db.query(
          "INSERT INTO meeting_points(event_id,label,photo_url,direction,position) VALUES($1::uuid,$2,$3,$4,$5)",
          [event, p.label, p.photoUrl, p.direction, i],
        );
    });
    return { ok: true };
  }
}
