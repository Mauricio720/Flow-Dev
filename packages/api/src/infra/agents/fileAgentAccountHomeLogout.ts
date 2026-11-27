import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { promisify } from "node:util";
import { buildAgentEnvironment, credentialEnvironment } from "./agentEnvironment";

const run = promisify(execFile);
const LOGOUT_TIMEOUT_MS = 10_000;

export async function removeAccountHome(source: NodeJS.ProcessEnv, home: string, provider: "claude" | "codex") {
  const command = provider === "claude" ? "claude" : "codex";
  const args = provider === "claude" ? ["auth", "logout"] : ["logout"];
  let logout: "ok" | "failed" = "ok";
  try {
    await run(command, args, { env: buildAgentEnvironment(source, credentialEnvironment(provider, home)), shell: false, timeout: LOGOUT_TIMEOUT_MS });
  } catch {
    logout = "failed";
  }
  await rm(home, { recursive: true, force: true });
  return { logout };
}
