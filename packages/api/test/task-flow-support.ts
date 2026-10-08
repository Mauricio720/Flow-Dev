import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { softwareConnections } from "../src/infra/database/schema";
import type { Database } from "../src/infra/database/client";

const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

export async function fixtureConnection(database: Database, label = "Codex") {
  const [row] = await database.insert(softwareConnections).values({ label, providerKind: "codex", runtimeProviderId: `codex-${crypto.randomUUID().slice(0, 8)}`, authState: "connected" }).returning();
  return row!.id;
}

export async function runMigrationFile(database: Database, name: string) {
  const text = await readFile(new URL(`../drizzle/${name}.sql`, import.meta.url), "utf8");
  for (const statement of text.split(STATEMENT_BREAKPOINT)) if (statement.trim()) await database.execute(sql.raw(statement));
}

export async function dumpTables(database: Database, tables: string[]) {
  const dump: Record<string, unknown> = {};
  for (const table of tables) dump[table] = await database.execute(sql.raw(`SELECT * FROM ${table} ORDER BY 1`));
  return JSON.stringify(dump);
}

export const FLOW_STATES = { ready: { state: "ready" }, blocked: (reasonCode: string) => ({ state: "blocked", reasonCode }) } as const;
