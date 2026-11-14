import { database } from "../../../lib/database";
import { handler } from "../../../lib/http";
export const runtime = "nodejs";
const run = handler(database);
async function route(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return run(request, (await context.params).path);
}
export { route as GET, route as POST, route as PUT, route as DELETE };
