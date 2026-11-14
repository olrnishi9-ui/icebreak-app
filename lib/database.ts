import { PrismaClient, type Prisma } from "@prisma/client";
import type { DB } from "./service";
const globalDB = globalThis as unknown as { prisma?: PrismaClient };
function client() {
  return (globalDB.prisma ??= new PrismaClient());
}
function adapter(p: Prisma.TransactionClient): DB {
  return {
    query: (sql, values = []) => p.$queryRawUnsafe(sql, ...values),
    transaction: (fn) => fn(adapter(p)),
  };
}
export const database: DB = {
  query: (sql, values = []) => client().$queryRawUnsafe(sql, ...values),
  transaction: (fn) => client().$transaction((p) => fn(adapter(p))),
};
