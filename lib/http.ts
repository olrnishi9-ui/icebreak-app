import { ShowService } from "./show-mode";
import { DiscoveryService } from "./discovery-service";
import { ArcService } from "./arc-service";
import { ConnectionService } from "./connection-service";
import { createClient } from "@supabase/supabase-js";
import { EntryService, HttpError, code, uuid } from "./service";
import type { DB } from "./service";
export type Identity = { id: string; anonymous: boolean };
export type Verify = (token: string) => Promise<string | Identity | null>;
export async function verifySession(token: string): Promise<Identity | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new HttpError(503, "Email sign-in is not configured.");
  const c = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await c.auth.getUser(token);
  return error ||
    !data.user ||
    (!data.user.is_anonymous && !data.user.email_confirmed_at)
    ? null
    : { id: data.user.id, anonymous: !!data.user.is_anonymous };
}
// Organiser/email-account verification retains its existing contract.
export async function verify(token: string) {
  const identity = await verifySession(token);
  return identity && !identity.anonymous ? identity.id : null;
}
export function handler(
  db: DB,
  verifyIdentity: Verify = verifySession,
  now: () => number = Date.now,
) {
  return async (request: Request, path: string[]) => {
    const respond = (v: unknown, status = 200) =>
      Response.json(v, { status, headers: { "Cache-Control": "no-store" } });
    try {
      const s = new EntryService(db, now),
        url = new URL(request.url),
        method = request.method;
      if (method === "GET" && path[0] === "events" && path.length === 2)
        return respond(await s.basics(path[1]));
      if (
        method === "GET" &&
        path[0] === "events" &&
        path[2] === "questions" &&
        path.length === 3
      ) {
        const e = await s.event(code(path[1]));
        s.active(e);
        return respond(await s.questions(e.id));
      }
      const token = request.headers
        .get("authorization")
        ?.match(/^Bearer (\S+)$/)?.[1];
      const verified = token ? await verifyIdentity(token) : null;
      const identity = typeof verified === "string" ? verified : verified?.id;
      const anonymous = typeof verified === "object" && verified?.anonymous;
      if (!identity)
        throw new HttpError(
          401,
          "Your session has expired. Sign in with your email code to continue.",
        );
      let body: Record<string, unknown> = {};
      if (["POST", "PUT", "PATCH"].includes(method)) {
        const raw = await request.text();
        if (raw.length > 200000)
          throw new HttpError(413, "This form is too large.");
        try {
          const v = JSON.parse(raw);
          if (!v || typeof v !== "object" || Array.isArray(v)) throw Error();
          body = v;
        } catch {
          throw new HttpError(400, "Send a valid form.");
        }
      }
      if (path[0] === "show") {
        if (!anonymous)
          throw new HttpError(
            403,
            "Use the attendee show sign-in to continue.",
          );
        const show = new ShowService(db, now);
        if (path.length === 2 && path[1] === "entry" && method === "POST")
          return respond(await show.prepare(identity, body));
        if (path.length === 2 && path[1] === "event" && method === "GET")
          return respond(await show.event());
        if (path.length === 2 && path[1] === "join" && method === "POST")
          return respond(await show.join(identity, body));
        throw new HttpError(404, "Route not found.");
      }
      if (anonymous) {
        // Permit the real participant APIs only in DEMO26. Organiser and
        // account-registration operations remain email-account-only.
        const participantRoute = [
          "profile",
          "questionnaire",
          "discover",
          "saved",
          "notifications",
          "sessions",
          "connections",
          "people",
          "feedback",
          "blocks",
          "reports",
          "qr",
        ].includes(path[0]);
        const stationRoute =
          path[0] === "stations" &&
          ((method === "GET" &&
            path.length === 1 &&
            url.searchParams.get("manage") !== "true") ||
            (method === "POST" && path.length === 3 && path[2] === "dismiss"));
        const eventRoute =
          path[0] === "events" &&
          path.length === 3 &&
          ["availability", "open", "membership"].includes(path[2]);
        if (!participantRoute && !stationRoute && !eventRoute)
          throw new HttpError(
            403,
            "Use organiser email sign-in for this action.",
          );
        const e = await s.event(
          uuid(
            eventRoute
              ? path[1]
              : (url.searchParams.get("eventId") ?? body.eventId),
          ),
        );
        if (!e.is_demo || e.event_code !== "DEMO26")
          throw new HttpError(
            403,
            "Show sessions can only access MeetMates Demo.",
          );
        await s.member(identity, e.id);
      }
      if (path.join("/") === "events" && method === "POST")
        return respond(await s.create(identity, body, url.origin), 201);
      if (path.join("/") === "events/join" && method === "POST")
        return respond(await s.join(identity, body));
      if (path.join("/") === "account/resume" && method === "POST")
        return respond(await s.resume(identity, body.code));
      if (path.join("/") === "account/profile" && method === "POST")
        return respond(await s.saveProfile(identity, body));
      const eventId = () =>
        uuid(url.searchParams.get("eventId") ?? body.eventId);
      if (path.join("/") === "qr/resolve" && method === "POST")
        return respond(await s.resolveQR(identity, eventId(), body.token));
      if (path[0] === "events" && path[2] === "check-in" && path.length === 3) {
        if (method === "POST")
          return respond(await s.checkin(identity, uuid(path[1]), body));
        if (method === "GET")
          return respond(
            await s.checkinSearch(
              identity,
              uuid(path[1]),
              url.searchParams.get("name"),
            ),
          );
      }
      const discovery = new DiscoveryService(db, now);
      if (path[0] === "discover" && path.length === 1 && method === "GET")
        return respond(
          await discovery.list(
            identity,
            eventId(),
            url.searchParams.get("tab") ?? "for-you",
            url.searchParams.get("search"),
          ),
        );
      if (
        path[0] === "saved" &&
        path.length === 2 &&
        ["PUT", "DELETE"].includes(method)
      )
        return respond(
          await discovery.save(identity, eventId(), path[1], method === "PUT"),
        );
      if (path[0] === "notifications") {
        if (path.length === 1 && method === "GET")
          return respond(await discovery.notification(identity, eventId()));
        if (path.length === 2 && method === "DELETE")
          return respond(
            await discovery.dismissNotification(identity, eventId(), path[1]),
          );
      }
      if (path[0] === "stations") {
        if (path.length === 1 && method === "GET")
          return respond(
            await discovery.stations(
              identity,
              eventId(),
              url.searchParams.get("manage") === "true",
            ),
          );
        if (path.length === 1 && method === "POST")
          return respond(
            await discovery.stationWrite(identity, eventId(), null, body),
            201,
          );
        if (path.length === 2 && method === "PUT")
          return respond(
            await discovery.stationWrite(identity, eventId(), path[1], body),
          );
        if (path.length === 2 && method === "DELETE")
          return respond(
            await discovery.stationWrite(identity, eventId(), path[1], null),
          );
        if (path.length === 3 && path[2] === "dismiss" && method === "POST")
          return respond(
            await discovery.dismissStation(identity, eventId(), path[1]),
          );
      }
      if (
        path[0] === "sessions" &&
        path.length === 3 &&
        path[2] === "profile" &&
        method === "GET"
      )
        return respond(await discovery.matched(identity, eventId(), path[1]));
      const connect = new ConnectionService(db, now);
      const arc = new ArcService(db, now);
      if (path[0] === "sessions" && path.length === 3 && path[2] === "arc") {
        if (method === "GET")
          return respond(await arc.view(identity, eventId(), path[1]));
        if (method === "POST")
          return respond(await arc.action(identity, eventId(), path[1], body));
      }
      if (
        path[0] === "sessions" &&
        path.length === 3 &&
        path[2] === "note" &&
        ["PUT", "DELETE"].includes(method)
      )
        return respond(
          await arc.note(
            identity,
            eventId(),
            path[1],
            method === "DELETE" ? "" : body.text,
          ),
        );
      if (path.join("/") === "people" && method === "GET")
        return respond(await arc.people(identity, eventId()));
      if (path.join("/") === "feedback" && method === "POST")
        return respond(
          await arc.feedback(identity, eventId(), uuid(body.sessionId), body),
        );
      if (path[0] === "connections") {
        if (path.length === 1 && method === "GET")
          return respond(await connect.state(identity, eventId()));
        if (path.length === 1 && method === "POST")
          return respond(await connect.send(identity, eventId(), body));
        if (path.length === 2 && path[1] === "code" && method === "POST")
          return respond(await connect.send(identity, eventId(), body, true));
        if (path.length === 2 && method === "PATCH")
          return respond(
            await connect.respond(identity, eventId(), path[1], body.action),
          );
      }
      if (path[0] === "sessions" && path.length === 3 && method === "POST")
        return respond(
          await connect.sessionAction(identity, eventId(), path[1], path[2]),
        );
      if (
        ["blocks", "reports"].includes(path[0]) &&
        path.length === 1 &&
        method === "POST"
      )
        return respond(
          await connect.safety(
            identity,
            eventId(),
            body,
            path[0] === "reports",
          ),
        );
      if (
        path[0] === "events" &&
        path[2] === "meeting-points" &&
        path.length === 3 &&
        method === "PUT"
      )
        return respond(await connect.configure(identity, uuid(path[1]), body));
      if (path.join("/") === "profile") {
        if (method === "GET")
          return respond(await s.profile(identity, eventId()));
        if (method === "PUT")
          return respond(await s.update(identity, eventId(), body));
      }
      if (path.join("/") === "questionnaire" && method === "POST")
        return respond(await s.questionnaire(identity, eventId(), body));
      if (path[0] === "events" && path.length === 3) {
        const id = uuid(path[1]);
        if (path[2] === "availability" && method === "PUT")
          return respond(await s.availability(identity, id, body));
        if (path[2] === "open" && method === "GET")
          return respond(await s.open(identity, id));
        if (path[2] === "membership" && method === "DELETE")
          return respond(await s.leave(identity, id));
        if (path[2] === "organiser" && method === "GET")
          return respond(await s.organiser(identity, id, url.origin));
      }
      throw new HttpError(404, "Route not found.");
    } catch (e) {
      if (e instanceof HttpError)
        return respond({ error: e.message }, e.status);
      console.error("Entry API operation failed", e);
      return respond(
        { error: "Could not complete this action. Please try again." },
        500,
      );
    }
  };
}
