import postgres from "postgres";
import type { TestProject } from "vitest/node";
import { applyBaseMigrations, applyCurrentMigrations } from "./databaseMigrations";
import { configuredServerUrl, createDatabase, databaseUrl, dropDatabasesStartingWith, uniqueDatabaseName } from "./databaseServer";
import { startEphemeralPostgres } from "./ephemeralPostgres";

const RUN_PREFIX = "flow_run_";
const TEMPLATE_SUFFIX = "_template";

export default async function setup(project: TestProject) {
  const prefix = uniqueDatabaseName(RUN_PREFIX);
  const server = await resolveServer(prefix);
  const template = `${prefix}${TEMPLATE_SUFFIX}`;
  await createDatabase(server.url, template);
  await migrateTemplate(databaseUrl(server.url, template));
  project.provide("databaseRun", { serverUrl: server.url, prefix: `${prefix}_`, template });
  return server.stop;
}

async function resolveServer(prefix: string) {
  const url = configuredServerUrl();
  return url ? { url, stop: () => dropDatabasesStartingWith(url, prefix) } : startEphemeralPostgres();
}

async function migrateTemplate(templateUrl: string) {
  const client = postgres(templateUrl, { max: 1, onnotice: () => {} });
  try {
    await applyBaseMigrations(client);
    await applyCurrentMigrations(client);
  } finally {
    await client.end();
  }
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseRun?: { serverUrl: string; prefix: string; template: string };
  }
}
