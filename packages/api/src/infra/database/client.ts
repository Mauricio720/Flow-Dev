import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
export const sql = databaseUrl ? postgres(databaseUrl, { max: 5 }) : null;
export const db = sql ? drizzle(sql, { schema }) : null;
export type Database = NonNullable<typeof db>;

export function requireDatabase() {
  if (!db) throw new Error("DATABASE_URL is required for database operations");
  return db;
}
