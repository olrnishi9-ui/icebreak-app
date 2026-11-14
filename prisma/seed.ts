import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
const prisma = new PrismaClient();
async function main() {
  if (process.env.ALLOW_DEMO_SEED !== "true") throw new Error("Set ALLOW_DEMO_SEED=true only for a demo/development database.");
  const sql = await readFile(new URL("./seed.sql", import.meta.url), "utf8");
  const statements = sql.replace(/^--.*$/gm, "").split(";").map(s => s.trim()).filter(Boolean);
  await prisma.$transaction(statements.map(statement => prisma.$executeRawUnsafe(statement)));
  console.log("Demo seed complete: HELLO26, six fictional participants, six questions.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
