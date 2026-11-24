import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskSessionPlanItems, taskTerminalSessions } from "../src/infra/database/schema";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { closeTaskFixture } from "./task-api-support";
import { seedTaskSet } from "./plan-support";
import { workerWorld } from "./session-worker-support";
import { seedVersions } from "./task-set-support";
import { cleanupTerminalFolders, openInput } from "./terminal-support";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });
const CHOICE = { agent: "codex" as const, model: "gpt-6.1-sol", effort: "high" };
const STATUS = { available: true, reason: null, version: "0.159.3", refreshedAt: new Date().toISOString(), models: [{ id: CHOICE.model, label: "GPT", isDefault: true, efforts: [CHOICE.effort], defaultEffort: CHOICE.effort }] };

describe("Codex purpose selection", () => {
  it("V-54a preflights and opens route, generation and plan sessions with the selected Codex", async () => {
    const probe = { read: async () => STATUS };
    const world = await workerWorld({}, {}, { codexProbe: probe });
    const hosts = new DrizzleSessionHostDao(world.setup.database);
    await hosts.publishCodexStatus({ hostId: machineIdentity(), status: STATUS });
    const route = await world.harness.caller.terminal.preflight({ projectId: world.setup.project.id, taskId: world.setup.taskId, purpose: { kind: "route", choice: CHOICE } });
    expect(route.choice).toEqual(CHOICE);
    const routeOpen = await world.harness.caller.terminal.open({ ...openInput(world.setup), purpose: { kind: "route", choice: CHOICE } });
    const spec = await seedVersions(world.setup, { path: "docs/specs/login/spec.md", versions: [{ skill: "spec-writer", content: "Spec", at: new Date() }] });
    const generation = await world.harness.caller.terminal.preflight({ projectId: world.setup.project.id, taskId: world.setup.taskId, purpose: { kind: "generate_tasks", specArtifactId: spec.id } });
    expect(generation.prompt).toContain("/flow-dev:spec-to-tasks");
    const generationOpen = await world.harness.caller.terminal.open({ ...openInput(world.setup), purpose: { kind: "generate_tasks", specArtifactId: spec.id, choice: CHOICE } });
    await seedTaskSet(world, { ids: ["task_01"] });
    await world.harness.caller.plan.save({ projectId: world.setup.project.id, taskId: world.setup.taskId, version: 0, items: [{ taskIds: ["task_01"], choice: CHOICE }] });
    const [item] = await world.setup.database.select().from(taskSessionPlanItems);
    const plan = await world.harness.caller.terminal.preflight({ projectId: world.setup.project.id, taskId: world.setup.taskId, purpose: { kind: "plan_item", planItemId: item!.id } });
    expect(plan).toMatchObject({ choice: CHOICE });
    expect(plan.prompt).not.toContain("/flow-dev:");
    const planOpen = await world.harness.caller.terminal.open({ ...openInput(world.setup), purpose: { kind: "plan_item", planItemId: item!.id } });
    const sessions = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.taskId, world.setup.taskId));
    expect(sessions.filter((session) => [routeOpen.sessionId, generationOpen.sessionId, planOpen.sessionId].includes(session.id))).toHaveLength(3);
    expect(sessions.filter((session) => [routeOpen.sessionId, generationOpen.sessionId, planOpen.sessionId].includes(session.id)).map(({ agent, model, effort }) => [agent, model, effort])).toEqual([["codex", CHOICE.model, CHOICE.effort], ["codex", CHOICE.model, CHOICE.effort], ["codex", CHOICE.model, CHOICE.effort]]);
  });
});
