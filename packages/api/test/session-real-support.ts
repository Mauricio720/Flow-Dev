import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { taskTerminalMessages, taskTerminalRequests, taskTerminalSessions } from "../src/infra/database/schema";
import { createSessionWorker } from "../src/infra/sessionWorkerComposition";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { approvedWork, gitClone, linkClone } from "./terminal-support";
import { terminalHarness } from "./terminal-harness";

export const REAL_CLAUDE = process.env.FLOW_DEV_REAL_CLAUDE === "1";
export const REAL_TIMEOUT_MS = 600_000;
const POLL_MS = 500;
const REAL_SKILLS = fileURLToPath(new URL("../../../.claude/skills", import.meta.url));

export async function realWorld(trackedFiles: Record<string, string> = {}) {
  const setup = await approvedWork();
  const clone = await gitClone();
  for (const [path, content] of Object.entries(trackedFiles)) {
    await mkdir(dirname(join(clone, path)), { recursive: true });
    await writeFile(join(clone, path), content);
  }
  const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=Smoke", "-c", "user.email=smoke@example.com", ...args], { cwd: clone, stdio: "ignore" });
  git("add", "-A", "-f");
  git("commit", "-q", "--allow-empty", "-m", "base");
  await linkClone(setup, clone);
  const harness = await terminalHarness(setup, { env: { FLOW_DEV_SKILLS_DIR: REAL_SKILLS } });
  const env = { ...process.env, XDG_STATE_HOME: harness.env.XDG_STATE_HOME } as NodeJS.ProcessEnv;
  const workerFor = (workerId: string) => createSessionWorker(setup.database, { env, hostId: machineIdentity(), workerId });
  const scope = (sessionId: string) => ({ projectId: setup.project.id, taskId: setup.taskId, sessionId });
  return { setup, clone, harness, workerFor, scope, git };
}

export type RealWorld = Awaited<ReturnType<typeof realWorld>>;

export async function drive(worker: { supervisor: { tick(): Promise<void> } }, until: () => Promise<boolean>, timeoutMs = REAL_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await worker.supervisor.tick();
    if (await until()) return true;
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  return false;
}

export const sessionOf = async (world: RealWorld, id: string) => (await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, id)))[0]!;
export const requestsOf = (world: RealWorld, id: string) => world.setup.database.select().from(taskTerminalRequests).where(eq(taskTerminalRequests.sessionId, id)).orderBy(taskTerminalRequests.createdAt);
export const assistantTexts = async (world: RealWorld, id: string) => (await world.setup.database.select().from(taskTerminalMessages).where(eq(taskTerminalMessages.sessionId, id))).filter((row) => row.role === "assistant").map((row) => row.content);
