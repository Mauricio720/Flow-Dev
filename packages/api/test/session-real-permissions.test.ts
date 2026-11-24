import { afterEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { HARNESS_NOW } from "./terminal-harness";
import { cleanupTerminalFolders, openInput } from "./terminal-support";
import { closeTaskFixture } from "./task-api-support";
import { REAL_CLAUDE, REAL_TIMEOUT_MS, assistantTexts, drive, realWorld, requestsOf, sessionOf, type RealWorld } from "./session-real-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

const COMMAND_PROMPT = "Rode exatamente `pnpm --version` com a ferramenta Bash e me diga só a saída.";
const SETTINGS = ".claude/settings.local.json";
const RULE = "Bash(pnpm --version)";
const HEARTBEAT_AGE_MS = 5_000;

async function runUntilAnswered(input: { world: RealWorld; workerId: string; sessionId: string; decide: boolean }) {
  const { world, workerId, sessionId, decide } = input;
  const worker = world.workerFor(workerId);
  let suggestedRule: string | null = null;
  const reached = await drive(worker, async () => {
    const [pending] = (await requestsOf(world, sessionId)).filter((request) => request.status === "pending");
    if (pending && decide) {
      suggestedRule = (pending.payload as { suggestedRule: string | null }).suggestedRule;
      await world.harness.caller.session.decidePermission({ projectId: world.setup.project.id, taskId: world.setup.taskId, requestId: pending.id, decision: "allow_always" });
    }
    return (await sessionOf(world, sessionId)).status === "waiting" && (await assistantTexts(world, sessionId)).length > 0;
  });
  await worker.registry.abandonAll();
  return { reached, suggestedRule };
}

async function start(world: RealWorld) {
  await world.harness.hosts.beat({ hostId: machineIdentity(), workerId: "harness", heartbeatAt: new Date(HARNESS_NOW.getTime() - HEARTBEAT_AGE_MS) });
  return world.harness.caller.terminal.open(openInput(world.setup, { prompt: COMMAND_PROMPT, permissionMode: "accept_edits" }));
}

describe.skipIf(!REAL_CLAUDE)("V-31b with the real Claude Code", () => {
  it("records Permitir sempre in the clone and the next session runs the command without asking", async () => {
    const world = await realWorld();
    const first = await runUntilAnswered({ world, workerId: "worker-real-1", sessionId: (await start(world)).sessionId, decide: true });
    expect(first).toEqual({ reached: true, suggestedRule: RULE });
    expect(JSON.parse(await readFile(join(world.clone, SETTINGS), "utf8")).permissions.allow).toContain(RULE);
    const second = await start(world);
    expect((await runUntilAnswered({ world, workerId: "worker-real-2", sessionId: second.sessionId, decide: false })).reached).toBe(true);
    expect(await requestsOf(world, second.sessionId)).toEqual([]);
  }, REAL_TIMEOUT_MS + 60_000);

  it("B-26 finding: Claude Code does not write the rule when settings.local.json is tracked in git", async () => {
    const world = await realWorld({ [SETTINGS]: "{}\n" });
    const outcome = await runUntilAnswered({ world, workerId: "worker-real-1", sessionId: (await start(world)).sessionId, decide: true });
    expect(outcome).toEqual({ reached: true, suggestedRule: RULE });
    expect(await readFile(join(world.clone, SETTINGS), "utf8")).toBe("{}\n");
    expect(execFileSync("git", ["status", "--porcelain"], { cwd: world.clone, encoding: "utf8" })).toBe("");
  }, REAL_TIMEOUT_MS + 60_000);
});
