import { spawn } from "node:child_process";
import { hostname, userInfo } from "node:os";
import postgres from "postgres";
import { e2eConfigured, e2eDatabaseUrl } from "./fixtures/environment";
import { e2eServerEnvironment } from "./fixtures/serverEnvironment";

const READY_TIMEOUT_MS = 60_000;
const READY_POLL_MS = 500;
const API_PACKAGE = "../../packages/api";
const E2E_REPOSITORY_OAUTH = { GITHUB_REPOSITORY_CLIENT_ID: "e2e-repository-client-id", GITHUB_REPOSITORY_CLIENT_SECRET: "e2e-repository-client-secret" };

async function waitForHeartbeat(hostId: string) {
  const sql = postgres(e2eDatabaseUrl ?? "", { max: 1 });
  const deadline = Date.now() + READY_TIMEOUT_MS;
  try {
    while (Date.now() < deadline) {
      const rows = await sql`select 1 from terminal_session_hosts where host_id = ${hostId} and heartbeat_at > now() - interval '15 seconds'`;
      if (rows.length > 0) return;
      await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
    }
  } finally {
    await sql.end();
  }
  throw new Error("O serviço de sessões não mandou o primeiro heartbeat a tempo.");
}

export async function startSessionWorker(baseURL: string) {
  if (!e2eConfigured) return undefined;
  const environment = { ...E2E_REPOSITORY_OAUTH, ...process.env, ...e2eServerEnvironment(baseURL), NODE_ENV: "test" };
  const worker = spawn("pnpm", ["--dir", API_PACKAGE, "exec", "tsx", "src/cli/terminalSessionsWorker.ts"], { env: environment as NodeJS.ProcessEnv, stdio: "inherit", detached: true });
  await waitForHeartbeat(`${hostname()}:${userInfo().username}`);
  return async () => {
    if (worker.pid) process.kill(-worker.pid, "SIGTERM");
  };
}
