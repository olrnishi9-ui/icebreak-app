import { EntryService, HttpError, fail, text, uuid, type DB } from "./service";
import {
  discover,
  evidence,
  publicPerson,
  type DiscoveryPerson,
  type Station,
} from "./discovery";
export class DiscoveryService {
  constructor(
    private db: DB,
    private now: () => number = Date.now,
  ) {}
  private async context(auth: string, event: string) {
    const s = new EntryService(this.db, this.now),
      p = await s.member(auth, event);
    s.active(await s.event(event));
    return p;
  }
  async material(auth: string, event: string) {
    const p = await this.context(auth, event);
    const people = await this.db.query<DiscoveryPerson>(
      `SELECT p.user_id AS "participantId",p.display_name AS "displayName",p.role,p.organization,p.industry,p.introduction,p.photo,CASE WHEN p.field_visible THEN p.field ELSE '' END AS expertise,p.goal AS "goalLine",p.networking_goals AS goals,p.checked_in_at AS "checkedInAt",p.opened_at AS "openedAt",
  (p.availability_status='open' AND p.available_until>$3::timestamptz AND NOT EXISTS(SELECT 1 FROM sessions s WHERE s.event_id=p.event_id AND s.closed_at IS NULL AND p.user_id IN(s.user_a_id,s.user_b_id))) AS available,
  EXISTS(SELECT 1 FROM saved_people v WHERE v.event_id=p.event_id AND v.user_id=$2::uuid AND v.person_id=p.user_id) AS saved,
  EXISTS(SELECT 1 FROM interactions i WHERE i.event_id=p.event_id AND ((i.user_a_id=$2::uuid AND i.user_b_id=p.user_id) OR (i.user_b_id=$2::uuid AND i.user_a_id=p.user_id))) AS met,
  COALESCE((SELECT json_agg(json_build_object('questionId',a.question_id,'choice',a.option_index,'skipped',a.skipped)) FROM answers a WHERE a.event_id=p.event_id AND a.user_id=p.user_id),'[]'::json) AS answers,
  ARRAY(SELECT topic FROM user_interests i WHERE i.event_id=p.event_id AND i.user_id=p.user_id AND i.share_consent AND i.interest_type='interest' ORDER BY topic) AS tags,
  ARRAY(SELECT topic FROM user_interests i WHERE i.event_id=p.event_id AND i.user_id=p.user_id AND i.share_consent AND i.interest_type='help' ORDER BY topic) AS offers,
  ARRAY(SELECT topic FROM user_interests i WHERE i.event_id=p.event_id AND i.user_id=p.user_id AND i.share_consent AND i.interest_type='learn' ORDER BY topic) AS seeks
  FROM event_participants p WHERE p.event_id=$1::uuid AND (p.user_id=$2::uuid OR (p.checked_in_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM blocks b WHERE b.event_id=p.event_id AND ((b.actor_id=$2::uuid AND b.target_id=p.user_id) OR (b.target_id=$2::uuid AND b.actor_id=p.user_id)))))`,
      [event, p.user_id, new Date(this.now()).toISOString()],
    );
    for (const b of people) {
      if (b.checkedInAt) b.checkedInAt = new Date(b.checkedInAt).toISOString();
      if (b.openedAt) b.openedAt = new Date(b.openedAt).toISOString();
    }
    return {
      p,
      people,
      caller: people.find((b) => b.participantId === p.user_id)!,
    };
  }
  async list(auth: string, event: string, mode: unknown, search: unknown) {
    if (!["for-you", "all", "saved"].includes(String(mode)))
      return fail("Choose a Discover tab.");
    const q = text(search ?? "", "search", 160, false),
      { caller, people } = await this.material(auth, event);
    if (!caller.checkedInAt) return [];
    return discover(caller, people, String(mode), q);
  }
  async save(auth: string, event: string, person: string, save: boolean) {
    uuid(person);
    const { caller, people } = await this.material(auth, event);
    if (
      !people.some(
        (b) =>
          b.participantId === person &&
          b.checkedInAt &&
          person !== caller.participantId,
      )
    )
      throw new HttpError(404, "Participant not found.");
    if (save)
      await this.db.query(
        "INSERT INTO saved_people(event_id,user_id,person_id) VALUES($1::uuid,$2::uuid,$3::uuid) ON CONFLICT DO NOTHING",
        [event, caller.participantId, person],
      );
    else
      await this.db.query(
        "DELETE FROM saved_people WHERE event_id=$1::uuid AND user_id=$2::uuid AND person_id=$3::uuid",
        [event, caller.participantId, person],
      );
    return { ok: true };
  }
  async matched(auth: string, event: string, id: string) {
    uuid(id);
    const { caller, people } = await this.material(auth, event);
    const [s] = await this.db.query<{
      partner: string;
      createdAt: string;
      startedAt: string | null;
      meetingPoint: unknown;
      duration: number;
    }>(
      `SELECT CASE WHEN user_a_id=$3::uuid THEN user_b_id ELSE user_a_id END AS partner,created_at AS "createdAt",started_at AS "startedAt",meeting_point AS "meetingPoint",duration FROM sessions WHERE event_id=$1::uuid AND id=$2::uuid AND $3::uuid IN(user_a_id,user_b_id)`,
      [event, id, caller.participantId],
    );
    const other = s && people.find((b) => b.participantId === s.partner);
    if (!other) throw new HttpError(404, "Introduction not found.");
    return {
      person: publicPerson(caller, other),
      meetingPoint: s.meetingPoint,
      duration: s.duration,
      createdAt: new Date(s.createdAt).toISOString(),
      startedAt: s.startedAt ? new Date(s.startedAt).toISOString() : null,
    };
  }
  async stations(auth: string, event: string, manage = false) {
    const entry = new EntryService(this.db, this.now);
    if (manage) await entry.organiser(auth, event, "");
    const { caller } = await this.material(auth, event);
    const rows = await this.db.query<Station>(
      `SELECT id,name,description,tags,location_note AS "locationNote" FROM stations s WHERE event_id=$1::uuid ${manage ? "" : `AND NOT EXISTS(SELECT 1 FROM station_dismissals d WHERE d.event_id=s.event_id AND d.station_id=s.id AND d.user_id=$2::uuid)`} ORDER BY name,id`,
      manage ? [event] : [event, caller.participantId],
    );
    if (manage) return rows;
    if (!caller.checkedInAt) return [];
    const fields = [
      ...caller.seeks,
      ...caller.offers,
      ...caller.goals,
      caller.goalLine,
      ...caller.tags,
    ];
    return rows
      .map((s) => ({ s, hits: fields.filter((v) => s.tags.includes(v)) }))
      .filter((v) => v.hits.length)
      .sort(
        (a, b) =>
          b.hits.length - a.hits.length || a.s.name.localeCompare(b.s.name),
      )
      .slice(0, 10)
      .map(({ s, hits }) => ({
        ...s,
        reason: `From your profile: “${hits[0]}” · station tag: “${hits[0]}”.`,
      }));
  }
  async stationWrite(
    auth: string,
    event: string,
    id: string | null,
    body: Record<string, unknown> | null,
  ) {
    const entry = new EntryService(this.db, this.now);
    await entry.organiser(auth, event, "");
    entry.active(await entry.event(event));
    if (id) uuid(id);
    if (!body) {
      await this.db.query(
        "DELETE FROM stations WHERE event_id=$1::uuid AND id=$2::uuid",
        [event, id],
      );
      return { ok: true };
    }
    const name = text(body.name, "station name", 80),
      description = text(body.description ?? "", "description", 500, false),
      location = text(body.locationNote ?? "", "location note", 240, false);
    if (!Array.isArray(body.tags) || !body.tags.length || body.tags.length > 20)
      return fail("Choose 1–20 station tags.");
    const tags = [...new Set(body.tags.map((v) => text(v, "tag", 200)))];
    if (id) {
      const rows = await this.db.query(
        "UPDATE stations SET name=$3,description=$4,tags=$5::text[],location_note=$6 WHERE event_id=$1::uuid AND id=$2::uuid RETURNING id",
        [event, id, name, description, tags, location],
      );
      if (!rows.length) throw new HttpError(404, "Station not found.");
    } else
      await this.db.query(
        "INSERT INTO stations(event_id,name,description,tags,location_note) VALUES($1::uuid,$2,$3,$4::text[],$5)",
        [event, name, description, tags, location],
      );
    return { ok: true };
  }
  async dismissStation(auth: string, event: string, id: string) {
    uuid(id);
    const p = await this.context(auth, event);
    const [s] = await this.db.query(
      "SELECT id FROM stations WHERE event_id=$1::uuid AND id=$2::uuid",
      [event, id],
    );
    if (!s) throw new HttpError(404, "Station not found.");
    await this.db.query(
      "INSERT INTO station_dismissals VALUES($1::uuid,$2::uuid,$3::uuid) ON CONFLICT DO NOTHING",
      [event, p.user_id, id],
    );
    return { ok: true };
  }
  async notification(auth: string, event: string) {
    const { caller, people } = await this.material(auth, event);
    if (!caller.checkedInAt) return null;
    const seen = await this.db.query<{ person_id: string }>(
      "SELECT person_id FROM discovery_dismissals WHERE event_id=$1::uuid AND user_id=$2::uuid",
      [event, caller.participantId],
    );
    const candidates = people.filter(
      (b) =>
        b.checkedInAt &&
        b.checkedInAt > caller.checkedInAt! &&
        evidence(caller, b).eligible &&
        !seen.some((v) => v.person_id === b.participantId),
    );
    return discover(caller, candidates, "for-you")[0] ?? null;
  }
  async dismissNotification(auth: string, event: string, person: string) {
    uuid(person);
    const { caller, people } = await this.material(auth, event);
    if (
      !people.some(
        (b) => b.participantId === person && person !== caller.participantId,
      )
    )
      throw new HttpError(404, "Participant not found.");
    await this.db.query(
      "INSERT INTO discovery_dismissals VALUES($1::uuid,$2::uuid,$3::uuid) ON CONFLICT DO NOTHING",
      [event, caller.participantId, person],
    );
    return { ok: true };
  }
}
