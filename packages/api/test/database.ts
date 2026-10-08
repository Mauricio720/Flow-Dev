import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { inject } from "vitest";
import * as schema from "../src/infra/database/schema";
import { applyBaseMigrations, applyCurrentMigrations } from "./databaseMigrations";
import { createDatabase, databaseUrl, dropDatabase, requiredServerUrl, uniqueDatabaseName } from "./databaseServer";

export { applyMigration, applyMigrationsAfter } from "./databaseMigrations";

const STANDALONE_PREFIX = "flow_test_";

export async function testDatabase(legacy = false, stopBefore?: string) {
  const run = inject("databaseRun");
  const serverUrl = run?.serverUrl ?? requiredServerUrl();
  const name = run ? `${run.prefix}${randomUUID().slice(0, 8)}${randomUUID().slice(0, 8)}` : uniqueDatabaseName(STANDALONE_PREFIX);
  const template = legacy || stopBefore ? undefined : run?.template;
  await createDatabase(serverUrl, name, template);
  const url = databaseUrl(serverUrl, name);
  const client = postgres(url, { max: 5, onnotice: () => {} });
  if (!template) await migrate(client, legacy, stopBefore);
  const close = async () => { await client.end(); await dropDatabase(serverUrl, name); };
  return { client, database: drizzle(client, { schema }), close, url };
}

async function migrate(client: postgres.Sql, legacy: boolean, stopBefore?: string) {
  await applyBaseMigrations(client);
  if (legacy) return;
  await applyCurrentMigrations(client, stopBefore);
}
