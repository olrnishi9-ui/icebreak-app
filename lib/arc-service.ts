import { EntryService, HttpError, fail, uuid, type DB } from "./service";
import { buildArc, type Arc, type ArcPerson } from "./arc";
export async function snapshotArc(db: DB, event: string, a: string, b: string) {
  const person = async (id: string): Promise<ArcPerson> => {
    const [p] = await db.query<{ goal: string }>(
      "SELECT goal FROM event_participants WHERE event_id=$1::uuid AND user_id=$2::uuid",
      [event, id],
    );
    const answers = await db.query<ArcPerson["answers"][number]>(
      'SELECT question_id AS "questionId",option_index AS choice,skipped FROM answers WHERE event_id=$1::uuid AND user_id=$2::uuid',
      [event, id],
    );
    const interests = await db.query<ArcPerson["interests"][number]>(
      "SELECT interest_type,topic,share_consent FROM user_interests WHERE event_id=$1::uuid AND user_id=$2::uuid AND share_consent",
      [event, id],
    );
    return { ...p, answers, interests };
  };
  const [e] = await db.query<{ name: string }>(
    "SELECT name FROM events WHERE id=$1::uuid",
    [event],
  );
  return buildArc(await person(a), await person(b), {
    ...e,
    questions: await new EntryService(db).questions(event),
  });
}
type Row = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  arc_script: Arc;
  arc_position: number;
  arc_skipped: number[];
  started_at: string | null;
  closed_at: string | null;
  duration: number;
};
type Choice = {
  user_id: string;
  choice: string | null;
  opted_in: boolean;
  done: boolean;
};
export type ArcView = {
  extension: { canPropose: boolean; proposal: "yours" | "partner" | null };
  duration: number;
  script: Arc;
  position: number;
  skipped: number[];
  cardsState: ("upcoming" | "current" | "skipped" | "done")[];
  role: "starter" | "listener" | "symmetric";
  side: "a" | "b";
  offered: boolean;
  elapsed: number;
  phase: "conversation" | "closing";
  own: { choice: string | null; optedIn: boolean; done: boolean };
  outcome: "exchange" | "again" | null;
  contacts: { field: string; value: string }[];
  note: string;
};
export class ArcService {
  constructor(
    private db: DB,
    private now: () => number = Date.now,
  ) {}
  private async context(auth: string, event: string, id: string, db = this.db) {
    uuid(id);
    const entry = new EntryService(db, this.now);
    const p = await entry.member(auth, event, db);
    entry.active(await entry.event(event));
    const [s] = await db.query<Row>(
      "SELECT * FROM sessions WHERE id=$1::uuid AND event_id=$2::uuid AND $3::uuid IN(user_a_id,user_b_id)",
      [id, event, p.user_id],
    );
    if (!s || !s.arc_script) throw new HttpError(404, "Session not found.");
    return { s, p };
  }
  async viewBySession(event: string, viewer: string, id: string) {
    const [u] = await this.db.query<{ auth_id: string }>(
      "SELECT auth_id FROM users WHERE id=$1::uuid",
      [viewer],
    );
    return this.view(u.auth_id, event, id);
  }
  async view(auth: string, event: string, id: string): Promise<ArcView> {
    const { s, p } = await this.context(auth, event, id);
    const a = p.user_id === s.user_a_id;
    const choices = await this.db.query<Choice>(
      "SELECT * FROM session_choices WHERE session_id=$1::uuid",
      [id],
    );
    const own = choices.find((c) => c.user_id === p.user_id),
      other = choices.find((c) => c.user_id !== p.user_id);
    const mutual = own?.done && other?.done && own.choice === other.choice;
    const outcome =
      mutual && own.choice === "again"
        ? "again"
        : mutual && own.choice === "exchange" && own.opted_in && other.opted_in
          ? "exchange"
          : null;
    const contacts =
      outcome === "exchange"
        ? await this.db.query<{ field: string; value: string }>(
            "SELECT field,value FROM user_contacts WHERE user_id=$1::uuid AND visibility='mutual_connection' AND share_consent ORDER BY field",
            [a ? s.user_b_id : s.user_a_id],
          )
        : [];
    const [note] = await this.db.query<{ text: string }>(
      "SELECT text FROM session_notes WHERE session_id=$1::uuid AND user_id=$2::uuid",
      [id, p.user_id],
    );
    const closing = !!s.closed_at;
    const position = closing ? s.arc_script.cards.length - 1 : s.arc_position;
    const kind = s.arc_script.cards[position].kind;
    const elapsed = closing
      ? 0
      : s.started_at
        ? Math.max(0, this.now() - new Date(s.started_at).getTime())
        : 0;
    const next = s.arc_script.cards[position + 1]?.kind;
    const threshold =
      next === "expand"
        ? 0.25
        : next === "deepen"
          ? 0.55
          : next === "close"
            ? 0.8
            : 0;
    const canPropose =
      !closing &&
      !!s.started_at &&
      s.duration < 20 &&
      elapsed >= (s.duration - 1) * 60000 &&
      elapsed < s.duration * 60000;
    const [proposal] = canPropose
      ? await this.db.query<{ proposer_id: string }>(
          "SELECT proposer_id FROM session_extensions WHERE session_id=$1::uuid AND base_duration=$2",
          [id, s.duration],
        )
      : [];
    return {
      duration: s.duration,
      extension: {
        canPropose,
        proposal: proposal
          ? proposal.proposer_id === p.user_id
            ? "yours"
            : "partner"
          : null,
      },
      script: s.arc_script,
      position,
      skipped: closing ? [] : s.arc_skipped,
      cardsState: s.arc_script.cards.map((_, i) =>
        i === position
          ? "current"
          : closing
            ? "done"
            : s.arc_skipped.includes(i)
              ? "skipped"
              : i < position
                ? "done"
                : "upcoming",
      ),
      role:
        kind === "expand"
          ? a
            ? "starter"
            : "listener"
          : kind === "deepen"
            ? a
              ? "listener"
              : "starter"
            : "symmetric",
      side: a ? "a" : "b",
      offered: !closing && !!next && elapsed >= s.duration * 60000 * threshold,
      elapsed,
      phase: closing ? "closing" : "conversation",
      own: {
        choice: own?.choice ?? null,
        optedIn: own?.opted_in ?? false,
        done: own?.done ?? false,
      },
      outcome,
      contacts,
      note: note?.text ?? "",
    };
  }
  async action(
    auth: string,
    event: string,
    id: string,
    body: Record<string, unknown>,
  ) {
    const action = body.action;
    if (
      typeof action !== "string" ||
      ![
        "advance",
        "skip",
        "wrap-up",
        "keep-talking",
        "done",
        "extend",
        "extension-later",
      ].includes(action)
    )
      return fail("Choose a card action.");
    if (
      (action === "advance" || action === "skip") &&
      (!Number.isInteger(body.position) || Number(body.position) < 0)
    )
      return fail("Send the current card position.");
    await this.db.transaction(async (db) => {
      await db.query("SELECT id FROM events WHERE id=$1::uuid FOR UPDATE", [
        event,
      ]);
      const { s, p } = await this.context(auth, event, id, db);
      if (!s.started_at)
        return fail("Arrive before starting the conversation.");
      if (action === "extend" || action === "extension-later") {
        const elapsed = this.now() - new Date(s.started_at).getTime();
        if (
          (body.duration !== undefined && body.duration !== s.duration) ||
          s.closed_at ||
          s.duration >= 20 ||
          elapsed < (s.duration - 1) * 60000 ||
          elapsed >= s.duration * 60000
        )
          throw new HttpError(
            409,
            "Continue at your pace, or save a follow-up.",
          );
        // Later is intentionally a no-op: it cannot reveal a negative decision.
        if (action === "extension-later") return;
        const a = p.user_id === s.user_a_id;
        await db.query(
          `INSERT INTO session_extensions(session_id,base_duration,proposer_id,a_agrees,b_agrees) VALUES($1::uuid,$2,$3::uuid,$4,$5) ON CONFLICT(session_id,base_duration) DO UPDATE SET ${a ? "a_agrees" : "b_agrees"}=true`,
          [id, s.duration, p.user_id, a, !a],
        );
        await db.query(
          "UPDATE sessions SET duration=duration+5 WHERE id=$1::uuid AND duration=$2 AND EXISTS(SELECT 1 FROM session_extensions WHERE session_id=$1::uuid AND base_duration=$2 AND a_agrees AND b_agrees)",
          [id, s.duration],
        );
        return;
      }
      if (action === "done") {
        if (!s.closed_at) return fail("Wrap up first.");
        const choice = body.choice ?? null;
        if (
          choice !== null &&
          (typeof choice !== "string" ||
            !["exchange", "again", "nothing"].includes(choice))
        )
          return fail("Choose a next step.");
        if (typeof body.optedIn !== "boolean")
          return fail("Choose contact consent.");
        await db.query(
          "INSERT INTO session_choices(session_id,user_id,choice,opted_in,done) VALUES($1::uuid,$2::uuid,$3,$4,true) ON CONFLICT(session_id,user_id) DO NOTHING",
          [id, p.user_id, choice, body.optedIn],
        );
        return;
      }
      if (action === "keep-talking") {
        if (!s.closed_at) return;
        const done = await db.query(
          "SELECT 1 FROM session_choices WHERE session_id=$1::uuid AND done",
          [id],
        );
        if (done.length)
          throw new HttpError(409, "This conversation is complete.");
        const busy = await db.query(
          "SELECT 1 FROM sessions WHERE event_id=$1::uuid AND id<>$2::uuid AND closed_at IS NULL AND (user_a_id IN($3::uuid,$4::uuid) OR user_b_id IN($3::uuid,$4::uuid))",
          [event, id, s.user_a_id, s.user_b_id],
        );
        if (busy.length) throw new HttpError(409, "Not available right now.");
        await db.query(
          "UPDATE sessions SET closed_at=null,close_reason=null,arc_position=resume_position WHERE id=$1::uuid",
          [id],
        );
        await db.query(
          "UPDATE event_participants SET availability_status='busy',available_until=null WHERE event_id=$1::uuid AND user_id IN($2::uuid,$3::uuid)",
          [event, s.user_a_id, s.user_b_id],
        );
        return;
      }
      if (s.closed_at) return;
      if (
        action !== "wrap-up" &&
        (!Number.isInteger(body.position) || body.position !== s.arc_position)
      )
        return;
      const next = s.arc_position + 1;
      if (action === "wrap-up" || s.arc_script.cards[next]?.kind === "close") {
        const reason =
          action !== "wrap-up" &&
          this.now() - new Date(s.started_at).getTime() >=
            s.duration * 60000 * 0.8
            ? "timer"
            : "either";
        await db.query(
          "UPDATE sessions SET closed_at=$2::timestamptz,close_reason=$3,resume_position=arc_position,arc_position=jsonb_array_length(arc_script->'cards')-1,arc_skipped='{}' WHERE id=$1::uuid AND closed_at IS NULL",
          [id, new Date(this.now()).toISOString(), reason],
        );
        await db.query(
          "UPDATE event_participants SET availability_status='unavailable',available_until=null WHERE event_id=$1::uuid AND user_id IN($2::uuid,$3::uuid)",
          [event, s.user_a_id, s.user_b_id],
        );
        await db.query(
          "INSERT INTO interactions(id,event_id,user_a_id,user_b_id,started_at,ended_at) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::timestamptz,$6::timestamptz) ON CONFLICT(id) DO UPDATE SET ended_at=excluded.ended_at",
          [
            id,
            event,
            s.user_a_id,
            s.user_b_id,
            s.started_at,
            new Date(this.now()).toISOString(),
          ],
        );
      } else
        await db.query(
          "UPDATE sessions SET arc_position=$2,arc_skipped=CASE WHEN $3 THEN array_append(arc_skipped,arc_position) ELSE arc_skipped END WHERE id=$1::uuid",
          [id, next, action === "skip"],
        );
    });
    return this.view(auth, event, id);
  }
  async note(auth: string, event: string, id: string, value: unknown) {
    const { p } = await this.context(auth, event, id);
    if (typeof value !== "string" || value.length > 500)
      return fail("Use a note up to 500 characters.");
    if (value.trim())
      await this.db.query(
        "INSERT INTO session_notes(session_id,user_id,text) VALUES($1::uuid,$2::uuid,$3) ON CONFLICT(session_id,user_id) DO UPDATE SET text=excluded.text",
        [id, p.user_id, value.trim()],
      );
    else
      await this.db.query(
        "DELETE FROM session_notes WHERE session_id=$1::uuid AND user_id=$2::uuid",
        [id, p.user_id],
      );
    return { ok: true };
  }
  async feedback(
    auth: string,
    event: string,
    id: string,
    body: Record<string, unknown>,
  ) {
    const { s, p } = await this.context(auth, event, id);
    const [done] = await this.db.query(
      "SELECT 1 FROM session_choices WHERE session_id=$1::uuid AND user_id=$2::uuid AND done",
      [id, p.user_id],
    );
    if (!s.closed_at || !done) return fail("Finish the conversation first.");
    const values = [
      body.conversation_ease ?? null,
      body.perceived_value ?? null,
      body.willingness_to_reconnect ?? null,
    ];
    if (
      values
        .slice(0, 2)
        .some(
          (v) =>
            v !== null &&
            (!Number.isInteger(v) || Number(v) < 1 || Number(v) > 5),
        ) ||
      (values[2] !== null && typeof values[2] !== "boolean")
    )
      return fail("Check the feedback options.");
    const reasons = body.reasons ?? [],
      note = body.private_note ?? "";
    if (
      !Array.isArray(reasons) ||
      reasons.length > 4 ||
      reasons.some(
        (r) =>
          !["collaboration", "learning", "investment", "advice"].includes(r),
      ) ||
      typeof note !== "string" ||
      note.length > 500
    )
      return fail("Check the private feedback.");
    if (values.some((v) => v !== null) || reasons.length || note.trim())
      await this.db.query(
        "INSERT INTO feedback(interaction_id,user_id,conversation_ease,perceived_value,willingness_to_reconnect,reasons,private_note) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6::text[],$7) ON CONFLICT(interaction_id,user_id) DO NOTHING",
        [id, p.user_id, ...values, [...new Set(reasons)], note.trim()],
      );
    return { ok: true };
  }
  async people(auth: string, event: string) {
    const p = await new EntryService(this.db, this.now).member(auth, event);
    const rows = await this.db.query<{
      id: string;
      displayName: string;
      eventName: string;
    }>(
      `SELECT s.id,p.display_name AS "displayName",e.name AS "eventName" FROM sessions s JOIN session_choices c ON c.session_id=s.id AND c.user_id=$2::uuid AND c.done JOIN event_participants p ON p.event_id=s.event_id AND p.user_id=CASE WHEN s.user_a_id=$2::uuid THEN s.user_b_id ELSE s.user_a_id END JOIN events e ON e.id=s.event_id WHERE s.event_id=$1::uuid AND $2::uuid IN(s.user_a_id,s.user_b_id) AND s.closed_at IS NOT NULL ORDER BY s.created_at DESC`,
      [event, p.user_id],
    );
    return Promise.all(
      rows.map(async (r) => {
        const v = await this.view(auth, event, r.id);
        return {
          ...r,
          note: v.note,
          exchanged: v.outcome === "exchange",
          contacts: v.contacts,
        };
      }),
    );
  }
}
