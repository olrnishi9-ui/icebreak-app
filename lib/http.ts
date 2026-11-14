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
export function handler(db: DB, verifyIdentity: Verify = verify) {
  return async (request: Request, path: string[]) => {
    const respond = (v: unknown, status = 200) =>
      Response.json(v, { status, headers: { "Cache-Control": "no-store" } });
    try {
      const s = new EntryService(db),
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
      if (["POST", "PUT"].includes(method)) {
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
      console.error("Entry API operation failed");
      return respond(
        { error: "Could not complete this action. Please try again." },
        500,
      );
    }
  };
}
