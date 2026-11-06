import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

export type Database = PrismaClient;

/**
 * A Prisma client on the generic Postgres driver adapter, so any Postgres
 * provider works without code changes (ADR-0006).
 */
export function createDatabase(connectionString: string): {
  db: Database;
  pool: Pool;
} {
  const pool = new Pool({ connectionString });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  return { db, pool };
}
