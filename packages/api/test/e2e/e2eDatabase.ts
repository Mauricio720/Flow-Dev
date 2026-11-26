import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import postgres from "postgres";
import { applyBaseMigrations, applyCurrentMigrations } from "../databaseMigrations";
import { databaseUrl } from "../databaseServer";

const ROOT_ENV_FILE = new URL("../../../../.env", import.meta.url);
const SERVER_URL_VARIABLE = "E2E_DATABASE_SERVER_URL";
const DEFAULT_DATABASE_NAME = "flow_dev_e2e";
const DOCKER_HOST = "127.0.0.1";
const MAINTENANCE_DATABASE = "postgres";

export function e2eDatabaseName() {
  return process.env.E2E_DATABASE_NAME ?? DEFAULT_DATABASE_NAME;
}

export function e2eServerUrl() {
  const configured = process.env[SERVER_URL_VARIABLE];
  if (configured) return configured;
  if (!existsSync(ROOT_ENV_FILE)) throw new Error(`Defina ${SERVER_URL_VARIABLE} ou crie o .env da raiz com POSTGRES_USER, POSTGRES_PASSWORD e POSTGRES_PORT.`);
  const env = parseEnv(readFileSync(ROOT_ENV_FILE, "utf8"));
  const user = encodeURIComponent(env.POSTGRES_USER ?? "");
  const password = encodeURIComponent(env.POSTGRES_PASSWORD ?? "");
  return `postgres://${user}:${password}@${DOCKER_HOST}:${env.POSTGRES_PORT}/${MAINTENANCE_DATABASE}`;
}

async function recreateDatabase(serverUrl: string, name: string) {
  const server = postgres(serverUrl, { max: 1, onnotice: () => {} });
  try {
    await server`DROP DATABASE IF EXISTS ${server(name)} WITH (FORCE)`;
    await server`CREATE DATABASE ${server(name)}`;
  } catch (error) {
    throw new Error(`Não consegui recriar o banco ${name} em ${new URL(serverUrl).host}. O container do Postgres está de pé (docker compose up -d)?`, { cause: error });
  } finally {
    await server.end();
  }
}

export async function prepareE2eDatabase() {
  const serverUrl = e2eServerUrl();
  const name = e2eDatabaseName();
  await recreateDatabase(serverUrl, name);
  const url = databaseUrl(serverUrl, name);
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await applyBaseMigrations(client);
    await applyCurrentMigrations(client);
  } finally {
    await client.end();
  }
  return url;
}
