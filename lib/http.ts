import { ArcService } from "./arc-service";
import { ConnectionService } from "./connection-service";
import { createClient } from "@supabase/supabase-js";
import { EntryService, HttpError, code, uuid } from "./service";
import type { DB } from "./service";
export type Verify = (token: string) => Promise<string | null>;
export async function verify(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new HttpError(503, "Guest access is not configured.");
  const c = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await c.auth.getUser(token);
  return error ? null : (data.user?.id ?? null);
}
export function handler(
  db: DB,
  verifyIdentity: Verify = verify,
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
      const identity = token ? await verifyIdentity(token) : null;
      if (!identity)
        throw new HttpError(
          401,
          "Your guest session is missing or expired. Reopen the event link to try again.",
        );
      let body: Record<string, unknown> = {};
      if (["POST", "PUT", "PATCH"].includes(method)) {
        const raw = await request.text();
        if (raw.length > 20000)
          throw new HttpError(413, "This form is too large.");
        try {
          const v = JSON.parse(raw);
          if (!v || typeof v !== "object" || Array.isArray(v)) throw Error();
          body = v;
        } catch {
          throw new HttpError(400, "Send a valid form.");
        }
      }
      if (path.join("/") === "events" && method === "POST")
        return respond(await s.create(identity, body, url.origin), 201);
      if (path.join("/") === "events/join" && method === "POST")
        return respond(await s.join(identity, body));
      const eventId = () =>
        uuid(url.searchParams.get("eventId") ?? body.eventId);
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
