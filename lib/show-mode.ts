import { randomBytes } from "node:crypto";
import { EntryService, HttpError, text, code, type DB } from "./service";
import { showEventId, showSeedStatements } from "./show-seed";
export class ShowService {
  constructor(
    private db: DB,
    private now: () => number = Date.now,
  ) {}
  private async seed(tx: DB) {
    for (const sql of showSeedStatements) await tx.query(sql);
    const s = new EntryService(tx, this.now);
    s.active(await s.event(showEventId));
  }
  async prepare(auth: string, body: Record<string, unknown>) {
    const email = text(body.email, "email label", 254, false);
    if (Object.keys(body).some((k) => k !== "email"))
      throw new HttpError(400, "Check the sign-in form.");
    await this.db.transaction(async (tx) => {
      await this.seed(tx);
      const id = await new EntryService(tx, this.now).user(auth);
      await tx.query(
        "UPDATE users SET demo_email_label=$2,is_guest=true WHERE id=$1::uuid",
        [id, email],
      );
    });
    return { next: "/join" };
  }
  async event() {
    await this.db.transaction((tx) => this.seed(tx));
    return { id: showEventId, code: "DEMO26", name: "MeetMates Demo" };
  }
  async join(auth: string, body: Record<string, unknown>) {
    if (code(body.code) !== "DEMO26")
      throw new HttpError(400, "Use DEMO26 to enter the show event.");
    await this.db.transaction(async (tx) => {
      await this.seed(tx);
      const s = new EntryService(tx, this.now);
      const userId = await s.user(auth);
      const [u] = await tx.query<{ demo_email_label: string }>(
        "SELECT demo_email_label FROM users WHERE id=$1::uuid",
        [userId],
      );
      const name =
        u.demo_email_label.split("@")[0].trim().slice(0, 80) || "Demo Guest";
      const timestamp = new Date(this.now()).toISOString();
      const inserted = await tx.query(
        `INSERT INTO event_participants(event_id,user_id,display_name,goal,role,profile_saved,setup_complete,checked_in_at,qr_token,availability_status,available_until,opened_at)
        VALUES($1::uuid,$2::uuid,$3,'Explore something new','Attendee',true,true,$4::timestamptz,$5,'open',$6::timestamptz,$4::timestamptz)
        ON CONFLICT(event_id,user_id) DO NOTHING RETURNING user_id`,
        [
          showEventId,
          userId,
          name,
          timestamp,
          randomBytes(32).toString("hex"),
          new Date(this.now() + 15 * 60000).toISOString(),
        ],
      );
      if (inserted.length)
        for (const [type, topic] of [
          ["help", "Ideas"],
          ["learn", "People"],
        ])
          await tx.query(
            `INSERT INTO user_interests(event_id,user_id,interest_type,topic,share_consent) VALUES($1::uuid,$2::uuid,$3::"InterestType",$4,true)`,
            [showEventId, userId, type, topic],
          );
    });
    return new EntryService(this.db, this.now).profile(auth, showEventId);
  }
}
