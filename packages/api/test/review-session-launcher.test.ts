import { afterEach, describe, expect, it } from "vitest";
import { taskReviewCycles, taskTerminalSessions } from "../src/infra/database/schema";
import { createTerminalLauncher } from "../src/infra/terminalComposition";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { closeTaskFixture } from "./task-api-support";
import { HARNESS_NOW } from "./terminal-harness";
import { readySetup } from "./terminal-open-support";
import { cleanupTerminalFolders } from "./terminal-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const CHOICE = { agent: "claude" as const, model: "sonnet", effort: "high" };
const PROMPT = "Revise docs/specs/login/spec.md e registre a etapa em reviews/etapa.md.";

async function seedCycle(setup: Awaited<ReturnType<typeof readySetup>>["setup"]) {
  const [cycle] = await setup.database.insert(taskReviewCycles).values({ taskId: setup.taskId, projectId: setup.project.id, hostId: machineIdentity(), startedBy: setup.ownerId, requestKey: crypto.randomUUID(), reviewerAgent: "claude", reviewerModel: "sonnet", reviewerEffort: "high", executorAgent: "claude", executorModel: "opus", executorEffort: "max", tasksFolder: "docs/specs/login", partial: false }).returning();
  return cycle!;
}

function launcherFor(world: Awaited<ReturnType<typeof readySetup>>, codexProbe?: { read(): Promise<{ available: boolean; reason: string | null; version: string | null; models: []; refreshedAt: string }> }) {
  return createTerminalLauncher(world.setup.database, { env: world.harness.env, context: world.harness.context, hostId: machineIdentity(), now: () => HARNESS_NOW, tools: { has: async () => true }, codexProbe });
}

describe("SessionLauncher review sessions", () => {
  it("V-05j prepares a review session with its cycle and choice and reuses its request key", async () => {
    const world = await readySetup();
    const cycle = await seedCycle(world.setup);
    const launcher = launcherFor(world);
    const input = { actorId: world.setup.ownerId, taskId: world.setup.taskId, projectId: world.setup.project.id, requestKey: crypto.randomUUID(), purpose: "review" as const, reviewCycleId: cycle.id, choice: CHOICE, prompt: PROMPT };
    const first = await launcher.launch(input);
    const again = await launcher.launch(input);
    const [saved] = await world.setup.database.select().from(taskTerminalSessions);
    expect(first).toMatchObject({ created: true, session: { userId: input.actorId, taskId: input.taskId, projectId: input.projectId, purpose: "review", reviewCycleId: cycle.id, runtime: "flow_dev", permissionMode: "bypass", hostId: machineIdentity(), agent: "claude", model: "sonnet", effort: "high", checkoutPath: world.clone } });
    expect(again).toMatchObject({ created: false, session: { id: first.session.id } });
    expect(saved?.preparedAt).toBeInstanceOf(Date);
    expect(await world.harness.context.readPrompt(first.session.id)).toBe(PROMPT);
  });

  it("V-05j keeps the existing unavailable-agent error and creates no session without Codex login", async () => {
    const world = await readySetup();
    const cycle = await seedCycle(world.setup);
    const probe = { read: async () => ({ available: false, reason: "Codex login required", version: null, models: [], refreshedAt: HARNESS_NOW.toISOString() }) };
    const input = { actorId: world.setup.ownerId, taskId: world.setup.taskId, projectId: world.setup.project.id, requestKey: crypto.randomUUID(), purpose: "review" as const, reviewCycleId: cycle.id, choice: { agent: "codex" as const, model: "gpt-6.1-sol", effort: "high" }, prompt: PROMPT };
    await expect(launcherFor(world, probe).launch(input)).rejects.toMatchObject({ reason: "agent_unavailable" });
    expect(await world.setup.database.select().from(taskTerminalSessions)).toEqual([]);
  });
});
