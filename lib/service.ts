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
  is_demo: boolean;
  id: string;
  name: string;
  status: string;
  event_code: string;
  ends_at: string | Date | null;
};
type Member = {
  role: string;
  organization: string;
  industry: string;
  introduction: string;
  photo: string;
  networking_goals: string[];
  profile_saved: boolean;
  checked_in_at: string | Date | null;
  qr_token: string | null;
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
      "SELECT id,name,status,event_code,ends_at,is_demo FROM events WHERE id::text=$1 OR event_code=$1",
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
      `INSERT INTO users(auth_id,display_name) VALUES ($1::uuid,'Attendee') ON CONFLICT(auth_id) DO UPDATE SET auth_id=EXCLUDED.auth_id RETURNING id`,
      [authId],
    );
    return u.id;
  }
  async member(authId: string, eventId: string, db = this.db): Promise<Member> {
    uuid(eventId);
    const [p] = await db.query<Member>(
      `SELECT p.* FROM event_participants p JOIN users u ON u.id=p.user_id WHERE p.event_id=$1::uuid AND u.auth_id=$2::uuid`,
      [eventId, authId],
    );
    if (!p) throw new HttpError(404, "You have not joined this event.");
    return p;
  }
  async questions(eventId: string, db = this.db) {
    return db.query<Question>(
      "SELECT id,prompt,kind,options,position FROM questions WHERE event_id=$1::uuid ORDER BY position",
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
    const demo = bool(body.demo ?? false);
    const name = demo
      ? "MeetMates — Judges Demo"
      : text(body.name, "event name", 120);
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
        `INSERT INTO events(name,event_code,status,organizer_id,ends_at,is_demo) VALUES ($1,$2,'active',$3::uuid,$4::timestamptz,$5) RETURNING id,name,status,event_code,ends_at,is_demo`,
        [name, eventCode, userId, endsAt, demo],
      );
      for (let i = 0; i < bank.length; i++)
        await db.query(
          'INSERT INTO questions(event_id,kind,prompt,options,position) VALUES ($1::uuid,$2::"QuestionKind",$3,$4::text[],$5)',
          [e.id, bank[i][0], bank[i][1], [...bank[i][2]], i],
        );
      if (demo)
        await db.query(
          `INSERT INTO meeting_points(event_id,label,photo_url,direction,position) VALUES($1::uuid,'Demo meeting point',$2,'Example illustration — agree on a real place nearby.',0)`,
          [e.id, `${origin}/demo-meeting-point.svg`],
        );
      return {
        event: { id: e.id, name: e.name, status: e.status, demo: e.is_demo },
        joinCode: eventCode,
        joinUrl: `${origin}/join/${eventCode}`,
      };
    });
  }
  async organiser(authId: string, eventId: string, origin: string) {
    uuid(eventId);
    const [e] = await this.db.query<Event>(
      "SELECT e.* FROM events e JOIN users u ON u.id=e.organizer_id WHERE e.id=$1::uuid AND u.auth_id=$2::uuid",
      [eventId, authId],
    );
    if (!e) throw new HttpError(404, "Event not found.");
    return {
      event: { id: e.id, name: e.name, status: e.status, demo: e.is_demo },
      joinCode: e.event_code,
      joinUrl: `${origin}/join/${e.event_code}`,
      meetingPoints: await this.db.query(
        'SELECT id,label,photo_url AS "photoUrl",direction FROM meeting_points WHERE event_id=$1::uuid ORDER BY position',
        [eventId],
      ),
    };
  }
  async resume(authId: string, value: unknown) {
    const e = await this.event(code(value));
    this.active(e);
    try {
      return await this.profile(authId, e.id);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status !== 404) throw error;
    }
    const tags = await this.db.query<{ interest_tags: string[] }>(
      "SELECT interest_tags FROM events WHERE id=$1::uuid",
      [e.id],
    );
    return {
      event: { id: e.id, name: e.name, code: e.event_code, demo: e.is_demo },
      interestTags: tags[0].interest_tags,
      questions: await this.questions(e.id),
      step: "profile",
    };
  }
  async saveProfile(authId: string, body: Record<string, unknown>) {
    const e = await this.event(code(body.code));
    this.active(e);
    const name = text(body.displayName, "name", 80);
    // The event goal remains the deterministic baseline's intention field.
    await this.goal(e.id, body.goal);
    return this.db.transaction(async (db) => {
      const userId = await this.user(authId, db);
      await db.query(
        `INSERT INTO event_participants(event_id,user_id,display_name,goal) VALUES($1::uuid,$2::uuid,$3,$4) ON CONFLICT(event_id,user_id) DO NOTHING`,
        [e.id, userId, name, body.goal],
      );
      return new EntryService(db, this.now).update(authId, e.id, body);
    });
  }
  async checkin(
    authId: string,
    eventId: string,
    body: Record<string, unknown>,
  ) {
    await this.organiser(authId, eventId, "");
    this.active(await this.event(eventId));
    const token = typeof body.token === "string" ? body.token : "";
    const participant = body.participant ? uuid(body.participant) : null;
    if (!participant && !/^[0-9a-f]{64}$/.test(token))
      return fail("Scan a valid MeetMates QR or choose a name.");
    const [p] = await this.db.query<{
      display_name: string;
      checked_in_at: string;
    }>(
      `UPDATE event_participants SET checked_in_at=COALESCE(checked_in_at,$4::timestamptz) WHERE event_id=$1::uuid AND profile_saved AND (( $2::uuid IS NOT NULL AND user_id=$2::uuid) OR qr_token=$3) RETURNING display_name,checked_in_at`,
      [eventId, participant, token, new Date(this.now()).toISOString()],
    );
    if (!p) throw new HttpError(404, "No saved profile found in this event.");
    return { displayName: p.display_name, checkedInAt: p.checked_in_at };
  }
  async checkinSearch(authId: string, eventId: string, value: unknown) {
    await this.organiser(authId, eventId, "");
    this.active(await this.event(eventId));
    const name = text(value, "name search", 80);
    return this.db.query(
      `SELECT user_id AS "participantId",display_name AS "displayName",checked_in_at AS "checkedInAt" FROM event_participants WHERE event_id=$1::uuid AND profile_saved AND position(lower($2) in lower(display_name))>0 ORDER BY display_name LIMIT 30`,
      [eventId, name],
    );
  }
  async resolveQR(authId: string, eventId: string, value: unknown) {
    const caller = await this.member(authId, eventId);
    this.active(await this.event(eventId));
    const token = text(value, "personal QR", 64);
    if (!/^[0-9a-f]{64}$/.test(token)) return fail("Invalid personal QR.");
    // Only an existing conversation can open contact consent. A QR grants no contact access.
    const [row] = await this.db.query<{
      sessionId: string;
      displayName: string;
    }>(
      `SELECT s.id AS "sessionId",p.display_name AS "displayName" FROM event_participants p JOIN sessions s ON s.event_id=p.event_id AND ((s.user_a_id=$2::uuid AND s.user_b_id=p.user_id) OR (s.user_b_id=$2::uuid AND s.user_a_id=p.user_id)) WHERE p.event_id=$1::uuid AND p.qr_token=$3 AND s.started_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM blocks b WHERE b.event_id=p.event_id AND ((b.actor_id=$2::uuid AND b.target_id=p.user_id) OR (b.target_id=$2::uuid AND b.actor_id=p.user_id))) ORDER BY s.created_at DESC LIMIT 1`,
      [eventId, caller.user_id, token],
    );
    if (!row)
      throw new HttpError(
        404,
        "Meet this person first, then scan to follow up.",
      );
    return row;
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
        `INSERT INTO event_participants(event_id,user_id,display_name,goal) VALUES($1::uuid,$2::uuid,$3,$4) ON CONFLICT(event_id,user_id) DO NOTHING`,
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
      'SELECT question_id AS "questionId",option_index AS choice,skipped FROM answers WHERE event_id=$1::uuid AND user_id=$2::uuid',
      [eventId, p.user_id],
    );
    const topics = await this.db.query<{
      type: string;
      topic: string;
      visible: boolean;
    }>(
      "SELECT interest_type AS type,topic,share_consent AS visible FROM user_interests WHERE event_id=$1::uuid AND user_id=$2::uuid ORDER BY interest_type,topic",
      [eventId, p.user_id],
    );
    return {
      event: { id: e.id, name: e.name, code: e.event_code, demo: e.is_demo },
      role: p.role,
      organization: p.organization,
      industry: p.industry,
      introduction: p.introduction,
      photo: p.photo,
      networkingGoals: p.networking_goals,
      profileSaved: p.profile_saved,
      checkedInAt: p.checked_in_at,
      qrToken: p.qr_token,
      interestTags: (
        await this.db.query<{ interest_tags: string[] }>(
          "SELECT interest_tags FROM events WHERE id=$1::uuid",
          [eventId],
        )
      )[0].interest_tags,
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
    const role = text(body.role ?? "", "role", 120, false),
      organization = text(body.organization ?? "", "organization", 160, false),
      industry = text(body.industry ?? "", "industry", 160, false),
      introduction = text(body.introduction ?? "", "introduction", 500, false);
    const photo = text(body.photo ?? "", "photo", 180000, false);
    if (
      photo &&
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(photo)
    )
      return fail("Choose a PNG, JPEG or WebP photo.");
    const goals = body.networkingGoals ?? [];
    const allowed = [
      "Find collaborators",
      "Meet investors",
      "Find customers",
      "Learn from experts",
      "Explore opportunities",
    ];
    if (
      !Array.isArray(goals) ||
      goals.length > 5 ||
      new Set(goals).size !== goals.length ||
      goals.some((g) => !allowed.includes(g))
    )
      return fail("Choose networking goals from the list.");
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
    if (body.networkingGoals !== undefined) {
      const [event] = await this.db.query<{ interest_tags: string[] }>(
        "SELECT interest_tags FROM events WHERE id=$1::uuid",
        [eventId],
      );
      if (
        topics.some(
          (t) =>
            t.type === "interest" && !event.interest_tags.includes(t.topic),
        )
      )
        return fail("Choose interests from this event’s tags.");
    }
    await this.db.transaction(async (db) => {
      const p = await this.member(authId, eventId, db);
      await db.query(
        `UPDATE event_participants SET role=$3,organization=$4,industry=$5,introduction=$6,photo=$7,networking_goals=$8::text[],profile_saved=true,qr_token=COALESCE(qr_token,$9) WHERE event_id=$1::uuid AND user_id=$2::uuid`,
        [
          eventId,
          p.user_id,
          role,
          organization,
          industry,
          introduction,
          photo,
          goals,
          randomBytes(32).toString("hex"),
        ],
      );
      await db.query(
        "UPDATE event_participants SET display_name=$3,goal=$4,field=$5,fun_fact=$6,field_visible=$7,fun_fact_visible=$8 WHERE event_id=$1::uuid AND user_id=$2::uuid",
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
        "DELETE FROM user_interests WHERE event_id=$1::uuid AND user_id=$2::uuid",
        [eventId, p.user_id],
      );
      for (const t of topics)
        await db.query(
          'INSERT INTO user_interests(event_id,user_id,interest_type,topic,share_consent) VALUES($1::uuid,$2::uuid,$3::"InterestType",$4,$5)',
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
          `INSERT INTO answers(event_id,user_id,question_id,option_index,skipped) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5) ON CONFLICT(event_id,user_id,question_id) DO UPDATE SET option_index=EXCLUDED.option_index,skipped=EXCLUDED.skipped`,
          [eventId, p.user_id, a.questionId, a.choice, a.skipped],
        );
      if (complete)
        await db.query(
          "UPDATE event_participants SET setup_complete=true WHERE event_id=$1::uuid AND user_id=$2::uuid",
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
      await db.query("SELECT id FROM events WHERE id=$1::uuid FOR UPDATE", [
        eventId,
      ]);
      const active = await db.query(
        "SELECT 1 FROM sessions WHERE event_id=$1::uuid AND closed_at IS NULL AND $2::uuid IN(user_a_id,user_b_id)",
        [eventId, p.user_id],
      );
      if (active.length) throw new HttpError(409, "Not available right now.");
      await db.query(
        `UPDATE event_participants SET availability_status=$3::"AvailabilityStatus",available_until=$4::timestamptz,opened_at=$5::timestamptz WHERE event_id=$1::uuid AND user_id=$2::uuid`,
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
      `SELECT p.user_id AS id,p.display_name AS "displayName",p.goal,p.available_until AS "openUntil",p.opened_at AS "openedAt",COALESCE((SELECT json_agg(json_build_object('questionId',a.question_id,'choice',a.option_index,'skipped',a.skipped)) FROM answers a WHERE a.event_id=p.event_id AND a.user_id=p.user_id),'[]'::json) AS answers FROM event_participants p WHERE p.event_id=$1::uuid AND (p.user_id=$2::uuid OR (p.checked_in_at IS NOT NULL AND p.availability_status='open' AND p.available_until>$3::timestamptz AND NOT EXISTS(SELECT 1 FROM sessions s WHERE s.event_id=p.event_id AND s.closed_at IS NULL AND p.user_id IN(s.user_a_id,s.user_b_id))))`,
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
      "SELECT CASE WHEN user_a_id=$2::uuid THEN user_b_id ELSE user_a_id END AS other FROM interactions WHERE event_id=$1::uuid AND $2::uuid IN(user_a_id,user_b_id)",
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
      await db.query("SELECT id FROM events WHERE id=$1::uuid FOR UPDATE", [
        eventId,
      ]);
      const p = await this.member(authId, eventId, db);
      const live = await db.query(
        "SELECT 1 FROM sessions WHERE event_id=$1::uuid AND closed_at IS NULL AND $2::uuid IN(user_a_id,user_b_id)",
        [eventId, p.user_id],
      );
      if (live.length) throw new HttpError(409, "Not available right now.");
      await db.query(
        "DELETE FROM event_participants WHERE event_id=$1::uuid AND user_id=$2::uuid",
        [eventId, p.user_id],
      );
    });
    return { left: true };
  }
}
