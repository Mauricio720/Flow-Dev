import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { prepareE2eDatabase } from "./e2eDatabase";

const E2E_ENV_FILE = new URL("../../../../apps/web/.env.e2e", import.meta.url);
const SECRET_BYTES = 32;
const DEFAULT_BASE_URL = "http://127.0.0.1:3100";
const DEFAULT_FAKE_GITHUB_PORT = "3199";

function previousEnvironment(): Record<string, string | undefined> {
  return existsSync(E2E_ENV_FILE) ? parseEnv(readFileSync(E2E_ENV_FILE, "utf8")) : {};
}

function secret() {
  return randomBytes(SECRET_BYTES).toString("base64url");
}

function e2eEnvironment(databaseUrl: string) {
  const previous = previousEnvironment();
  return {
    E2E_DATABASE_URL: databaseUrl,
    E2E_AUTH_SECRET: previous.E2E_AUTH_SECRET ?? secret(),
    E2E_REPOSITORY_TOKEN_KEY: previous.E2E_REPOSITORY_TOKEN_KEY ?? secret(),
    E2E_BASE_URL: previous.E2E_BASE_URL ?? DEFAULT_BASE_URL,
    E2E_FAKE_GITHUB_PORT: previous.E2E_FAKE_GITHUB_PORT ?? DEFAULT_FAKE_GITHUB_PORT,
  };
}

async function main() {
  const databaseUrl = await prepareE2eDatabase();
  const environment = e2eEnvironment(databaseUrl);
  const lines = Object.entries(environment).map(([name, value]) => `${name}=${value}`);
  writeFileSync(E2E_ENV_FILE, `${lines.join("\n")}\n`, { mode: 0o600 });
  console.log(`Banco E2E recriado e migrado: ${new URL(databaseUrl).pathname.slice(1)}`);
  console.log(`Ambiente escrito em ${fileURLToPath(E2E_ENV_FILE)}`);
  console.log("Rode: pnpm --dir apps/web test:e2e [arquivo.spec.ts]");
}

await main();
