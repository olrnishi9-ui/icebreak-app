import { randomBytes } from "node:crypto";
import {
  openNow,
  type Answer,
  type Candidate,
  type Question,
} from "./open-now";
export interface DB {
  query<T = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<T[]>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
}
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const fail = (message: string): never => {
  throw new HttpError(400, message);
};
export function text(
  value: unknown,
  label: string,
  max: number,
  required = true,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    return fail(`Check ${label}.`);
  return value.trim();
}
export function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    return fail("Check event ID.");
  return value;
}
export function code(value: unknown): string {
  const c = text(value, "event code", 16).toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(c))
    return fail("Check the event code and try again.");
  return c;
}
function bool(v: unknown): boolean {
  if (typeof v !== "boolean") return fail("Expected true or false.");
  return v;
}
type Event = {
  id: string;
  name: string;
  status: string;
  event_code: string;
  ends_at: string | Date | null;
};
type Member = {
  user_id: string;
  display_name: string;
  goal: string;
  field: string;
  fun_fact: string;
  field_visible: boolean;
  fun_fact_visible: boolean;
  setup_complete: boolean;
  available_until: string | Date | null;
};
const bank = [
  ["preference", "Your go-to warm drink?", ["Coffee", "Tea"]],
  ["preference", "When do you feel most energized?", ["Morning", "Evening"]],
  [
    "preference",
    "A free afternoon: where would you go?",
    ["Out into nature", "Exploring the city"],
  ],
  [
    "preference",
    "How do you start a new project?",
    ["Make a plan", "Try it and see"],
  ],
  [
    "preference",
    "How do you enjoy a story?",
    ["Reading a book", "Watching a film"],
  ],
  [
    "event_goal",
    "What brings you to this event?",
    [
      "Find teammates",
      "Meet people in my field",
      "Explore something new",
      "Just socialize",
    ],
  ],
] as const;
export class EntryService {
  constructor(
    private db: DB,
    private now: () => number = Date.now,
  ) {}
  async event(value: string): Promise<Event> {
    const [e] = await this.db.query<Event>(
      "SELECT id,name,status,event_code,ends_at FROM events WHERE id::text=$1 OR event_code=$1",
      [value],
    );
    if (!e)
      throw new HttpError(
        404,
        "Event not found. Check the code and try again.",
      );
    return e;
  }
  active(e: Event) {
    if (
      e.status !== "active" ||
      (e.ends_at && new Date(e.ends_at).getTime() <= this.now())
    )
      throw new HttpError(410, "This event has ended.");
  }
  async basics(value: string) {
    if (value.includes("-")) uuid(value);
    else value = code(value);
    const e = await this.event(value);
    return {
      id: e.id,
      name: e.name,
      status: e.status,
      active:
        e.status === "active" &&
        (!e.ends_at || new Date(e.ends_at).getTime() > this.now()),
    };
  }
  async user(authId: string, db = this.db): Promise<string> {
    const [u] = await db.query<{ id: string }>(
      `INSERT INTO users(auth_id,display_name) VALUES ($1,'Guest') ON CONFLICT(auth_id) DO UPDATE SET auth_id=EXCLUDED.auth_id RETURNING id`,
      [authId],
    );
    return u.id;
  }
  async member(authId: string, eventId: string, db = this.db): Promise<Member> {
    uuid(eventId);
    const [p] = await db.query<Member>(
      `SELECT p.* FROM event_participants p JOIN users u ON u.id=p.user_id WHERE p.event_id=$1 AND u.auth_id=$2`,
      [eventId, authId],
    );
    if (!p) throw new HttpError(404, "You have not joined this event.");
    return p;
  }
  async questions(eventId: string, db = this.db) {
    return db.query<Question>(
      "SELECT id,prompt,kind,options,position FROM questions WHERE event_id=$1 ORDER BY position",
      [eventId],
    );
  }
  async goal(eventId: string, value: unknown, db = this.db) {
    const g = text(value, "event goal", 200);
    const qs = await this.questions(eventId, db);
    if (!qs.some((q) => q.kind === "event_goal" && q.options.includes(g)))
      return fail("Choose an event goal.");
    return g;
  }
  async create(authId: string, body: Record<string, unknown>, origin: string) {
    const name = text(body.name, "event name", 120);
    let endsAt: string | null = null;
    if (body.endsAt != null && body.endsAt !== "") {
      endsAt = text(body.endsAt, "end time", 40);
      if (
        !Number.isFinite(Date.parse(endsAt)) ||
        Date.parse(endsAt) <= this.now()
      )
        return fail("End time must be in the future.");
    }
    return this.db.transaction(async (db) => {
      const userId = await this.user(authId, db);
      const eventCode = randomBytes(5).toString("hex").toUpperCase();
      const [e] = await db.query<Event>(
        `INSERT INTO events(name,event_code,status,organizer_id,ends_at) VALUES ($1,$2,'active',$3,$4) RETURNING id,name,status,event_code,ends_at`,
        [name, eventCode, userId, endsAt],
      );
      for (let i = 0; i < bank.length; i++)
        await db.query(
          'INSERT INTO questions(event_id,kind,prompt,options,position) VALUES ($1,$2::"QuestionKind",$3,$4::text[],$5)',
          [e.id, bank[i][0], bank[i][1], [...bank[i][2]], i],
        );
      return {
        event: { id: e.id, name: e.name, status: e.status },
        joinCode: eventCode,
        joinUrl: `${origin}/join/${eventCode}`,
      };
    });
  }
  async organiser(authId: string, eventId: string, origin: string) {
    uuid(eventId);
    const [e] = await this.db.query<Event>(
      "SELECT e.* FROM events e JOIN users u ON u.id=e.organizer_id WHERE e.id=$1 AND u.auth_id=$2",
      [eventId, authId],
    );
    if (!e) throw new HttpError(404, "Event not found.");
    return {
      event: { id: e.id, name: e.name, status: e.status },
      joinCode: e.event_code,
      joinUrl: `${origin}/join/${e.event_code}`,
      meetingPoints: await this.db.query(
        'SELECT id,label,photo_url AS "photoUrl",direction FROM meeting_points WHERE event_id=$1 ORDER BY position',
        [eventId],
      ),
    };
  }
  async join(authId: string, body: Record<string, unknown>) {
    const eventCode = code(body.code),
      name = text(body.displayName, "display name", 80);
    const e = await this.event(eventCode);
    this.active(e);
    const goal = await this.goal(e.id, body.goal);
    await this.db.transaction(async (db) => {
      const userId = await this.user(authId, db);
      await db.query(
        `INSERT INTO event_participants(event_id,user_id,display_name,goal) VALUES($1,$2,$3,$4) ON CONFLICT(event_id,user_id) DO NOTHING`,
        [e.id, userId, name, goal],
      );
    });
    return this.profile(authId, e.id);
  }
  async profile(authId: string, eventId: string) {
    const p = await this.member(authId, eventId);
    const e = await this.event(eventId);
    this.active(e);
    const answers = await this.db.query<Answer>(
      'SELECT question_id AS "questionId",option_index AS choice,skipped FROM answers WHERE event_id=$1 AND user_id=$2',
      [eventId, p.user_id],
    );
    const topics = await this.db.query<{
      type: string;
      topic: string;
      visible: boolean;
    }>(
      "SELECT interest_type AS type,topic,share_consent AS visible FROM user_interests WHERE event_id=$1 AND user_id=$2 ORDER BY interest_type,topic",
      [eventId, p.user_id],
    );
    return {
      event: { id: e.id, name: e.name, code: e.event_code },
      displayName: p.display_name,
      goal: p.goal,
      field: p.field,
      funFact: p.fun_fact,
      fieldVisible: p.field_visible,
      funFactVisible: p.fun_fact_visible,
      topics,
      answers,
      questions: await this.questions(eventId),
      step: p.setup_complete ? "home" : "setup",
      openUntil: p.available_until,
    };
  }
  async update(authId: string, eventId: string, body: Record<string, unknown>) {
    await this.member(authId, eventId);
    this.active(await this.event(eventId));
    const name = text(body.displayName, "display name", 80),
      goal = await this.goal(eventId, body.goal);
    const field = text(body.field ?? "", "field or major", 160, false),
      funFact = text(body.funFact ?? "", "fun fact", 500, false);
    const fieldVisible = bool(body.fieldVisible ?? false),
      funFactVisible = bool(body.funFactVisible ?? false);
    const inputTopics = body.topics ?? [];
    if (!Array.isArray(inputTopics) || inputTopics.length > 22)
      return fail("Check optional topics.");
    const topics = inputTopics.map((v: unknown) => {
      if (!v || typeof v !== "object" || Array.isArray(v))
        return fail("Check optional topics.");
      const t = v as Record<string, unknown>;
      if (
        !["interest", "discuss", "help", "learn", "ask_me_about"].includes(
          String(t.type),
        )
      )
        return fail("Check topic type.");
      return {
        type: String(t.type),
        topic: text(t.topic, "topic", 200),
        visible: bool(t.visible),
      };
    });
    if (
      topics.filter((t) => t.type === "ask_me_about").length > 2 ||
      new Set(topics.map((t) => `${t.type}:${t.topic}`)).size !== topics.length
    )
      return fail("Use distinct topics and at most two ask-me-about prompts.");
    await this.db.transaction(async (db) => {
      const p = await this.member(authId, eventId, db);
      await db.query(
        "UPDATE event_participants SET display_name=$3,goal=$4,field=$5,fun_fact=$6,field_visible=$7,fun_fact_visible=$8 WHERE event_id=$1 AND user_id=$2",
        [
          eventId,
          p.user_id,
          name,
          goal,
          field,
          funFact,
          fieldVisible,
          funFactVisible,
        ],
      );
      await db.query(
        "DELETE FROM user_interests WHERE event_id=$1 AND user_id=$2",
        [eventId, p.user_id],
      );
      for (const t of topics)
        await db.query(
          'INSERT INTO user_interests(event_id,user_id,interest_type,topic,share_consent) VALUES($1,$2,$3::"InterestType",$4,$5)',
          [eventId, p.user_id, t.type, t.topic, t.visible],
        );
    });
    return this.profile(authId, eventId);
  }
  async questionnaire(
    authId: string,
    eventId: string,
    body: Record<string, unknown>,
  ) {
    const p = await this.member(authId, eventId);
    this.active(await this.event(eventId));
    const qs = await this.questions(eventId);
    if (!Array.isArray(body.answers) || body.answers.length > 6)
      return fail("Check questionnaire answers.");
    const answers = body.answers.map((v: unknown) => {
      if (!v || typeof v !== "object") return fail("Check answer.");
      const a = v as Record<string, unknown>;
      const q = qs.find((q) => q.id === a.questionId);
      if (!q) return fail("Unknown question.");
      const skipped = bool(a.skipped);
      if (
        skipped
          ? a.choice !== null
          : !Number.isInteger(a.choice) ||
            Number(a.choice) < 0 ||
            Number(a.choice) >= q.options.length
      )
        return fail("Choose an option or skip.");
      return { questionId: q.id, choice: a.choice, skipped };
    });
    if (new Set(answers.map((a) => a.questionId)).size !== answers.length)
      return fail("Duplicate question.");
    const complete = bool(body.complete ?? true);
    if (complete && answers.length !== qs.length)
      return fail("Answer or skip every question.");
    await this.db.transaction(async (db) => {
      for (const a of answers)
        await db.query(
          `INSERT INTO answers(event_id,user_id,question_id,option_index,skipped) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id,user_id,question_id) DO UPDATE SET option_index=EXCLUDED.option_index,skipped=EXCLUDED.skipped`,
          [eventId, p.user_id, a.questionId, a.choice, a.skipped],
        );
      if (complete)
        await db.query(
          "UPDATE event_participants SET setup_complete=true WHERE event_id=$1 AND user_id=$2",
          [eventId, p.user_id],
        );
    });
    return this.profile(authId, eventId);
  }
  async availability(
    authId: string,
    eventId: string,
    body: Record<string, unknown>,
  ) {
    const open = bool(body.open);
    const p = await this.member(authId, eventId);
    this.active(await this.event(eventId));
    const now = this.now(),
      until = open ? new Date(now + 15 * 60 * 1000).toISOString() : null;
    await this.db.transaction(async (db) => {
      await db.query("SELECT id FROM events WHERE id=$1 FOR UPDATE", [eventId]);
      const active = await db.query(
        "SELECT 1 FROM sessions WHERE event_id=$1 AND closed_at IS NULL AND $2 IN(user_a_id,user_b_id)",
        [eventId, p.user_id],
      );
      if (active.length) throw new HttpError(409, "Not available right now.");
      await db.query(
        `UPDATE event_participants SET availability_status=$3::"AvailabilityStatus",available_until=$4,opened_at=$5 WHERE event_id=$1 AND user_id=$2`,
        [
          eventId,
          p.user_id,
          open ? "open" : "unavailable",
          until,
          open ? new Date(now).toISOString() : null,
        ],
      );
    });
    return { openUntil: until };
  }
  async open(authId: string, eventId: string) {
    const p = await this.member(authId, eventId);
    this.active(await this.event(eventId));
    // Only this trusted server operation reads other participants. Never return raw rows.
    const rows = await this.db.query<Candidate>(
      `SELECT p.user_id AS id,p.display_name AS "displayName",p.goal,p.available_until AS "openUntil",p.opened_at AS "openedAt",COALESCE((SELECT json_agg(json_build_object('questionId',a.question_id,'choice',a.option_index,'skipped',a.skipped)) FROM answers a WHERE a.event_id=p.event_id AND a.user_id=p.user_id),'[]'::json) AS answers FROM event_participants p WHERE p.event_id=$1 AND (p.user_id=$2 OR (p.availability_status='open' AND p.available_until>$3 AND NOT EXISTS(SELECT 1 FROM sessions s WHERE s.event_id=p.event_id AND s.closed_at IS NULL AND p.user_id IN(s.user_a_id,s.user_b_id))))`,
      [eventId, p.user_id, new Date(this.now()).toISOString()],
    );
    for (const row of rows) {
      if (row.openUntil) row.openUntil = new Date(row.openUntil).toISOString();
      if (row.openedAt) row.openedAt = new Date(row.openedAt).toISOString();
    }
    const caller = rows.find((r) => r.id === p.user_id)!;
    // Random ties sampled once per candidate. All deterministic keys stay server-side.
    const ties = new Map(
      rows.map((r) => [r.id, randomBytes(4).readUInt32BE()]),
    );
    const met = await this.db.query<{ other: string }>(
      "SELECT CASE WHEN user_a_id=$2 THEN user_b_id ELSE user_a_id END AS other FROM interactions WHERE event_id=$1 AND $2 IN(user_a_id,user_b_id)",
      [eventId, p.user_id],
    );
    for (const row of rows) row.met = met.some((m) => m.other === row.id);
    return openNow(
      caller,
      rows,
      await this.questions(eventId),
      this.now(),
      (id) => ties.get(id)!,
      true,
    );
  }
  async leave(authId: string, eventId: string) {
    await this.db.transaction(async (db) => {
      await db.query("SELECT id FROM events WHERE id=$1 FOR UPDATE", [eventId]);
      const p = await this.member(authId, eventId, db);
      const live = await db.query(
        "SELECT 1 FROM sessions WHERE event_id=$1 AND closed_at IS NULL AND $2 IN(user_a_id,user_b_id)",
        [eventId, p.user_id],
      );
      if (live.length) throw new HttpError(409, "Not available right now.");
      await db.query(
        "DELETE FROM event_participants WHERE event_id=$1 AND user_id=$2",
        [eventId, p.user_id],
      );
    });
    return { left: true };
  }
}
