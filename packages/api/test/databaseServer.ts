import { randomUUID } from "node:crypto";
import postgres from "postgres";

const SERVER_URL_VARIABLE = "TEST_DATABASE_URL";
const PARALLEL_DROPS = 4;

export function configuredServerUrl() {
  return process.env[SERVER_URL_VARIABLE];
}

export function requiredServerUrl() {
  const url = configuredServerUrl();
  if (!url) throw new Error(`${SERVER_URL_VARIABLE} must point to a disposable PostgreSQL server`);
  return url;
}

export function uniqueDatabaseName(prefix: string) {
  return `${prefix}${randomUUID().replaceAll("-", "")}`;
}

export function databaseUrl(serverUrl: string, name: string) {
  const target = new URL(serverUrl);
  target.pathname = `/${name}`;
  return target.toString();
}

export async function createDatabase(serverUrl: string, name: string, template?: string) {
  await withServer(serverUrl, (server) => template
    ? server`CREATE DATABASE ${server(name)} TEMPLATE ${server(template)}`
    : server`CREATE DATABASE ${server(name)}`);
}

export async function dropDatabase(serverUrl: string, name: string) {
  await withServer(serverUrl, (server) => server`DROP DATABASE ${server(name)}`);
}

export async function dropDatabasesStartingWith(serverUrl: string, prefix: string) {
  const server = postgres(serverUrl, { max: PARALLEL_DROPS, onnotice: () => {} });
  try {
    const rows = await server<{ datname: string }[]>`SELECT datname FROM pg_database WHERE starts_with(datname, ${prefix})`;
    await Promise.all(rows.map((row) => server`DROP DATABASE IF EXISTS ${server(row.datname)}`));
  } finally {
    await server.end();
  }
}

async function withServer(serverUrl: string, run: (server: postgres.Sql) => Promise<unknown>) {
  const server = postgres(serverUrl, { max: 1, onnotice: () => {} });
  try {
    await run(server);
  } finally {
    await server.end();
  }
}
