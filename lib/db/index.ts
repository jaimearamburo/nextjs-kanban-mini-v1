import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { createDatabase, type Database } from "./client";

const globalForDb = globalThis as unknown as { db?: Database };

function connect(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const { db, pool } = createDatabase(url);
  // Keeps the function alive long enough to close idle pooled connections.
  attachDatabasePool(pool);
  return db;
}

/** The app's database client, on the pooled DATABASE_URL. */
export const db: Database = globalForDb.db ?? connect();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
