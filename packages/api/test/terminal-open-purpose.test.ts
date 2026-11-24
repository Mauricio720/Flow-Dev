import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskArtifacts, taskTerminalSessions, tasks } from "../src/infra/database/schema";
import { OPUS_MAX, rejection, T10, T11 } from "./plan-support";
import { cycle, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { seedVersions } from "./task-set-support";
import { cleanupTerminalFolders, openInput } from "./terminal-support";

afterEach(async () => {
  await closeTaskFixture();
  await cleanupTerminalFolders();
});

type World = Awaited<ReturnType<typeof workerWorld>>;
const SONNET_HIGH = { agent: "claude", model: "sonnet", effort: "high" } as const;

async function withSpec(world: World) {
  return seedVersions(world.setup, { path: "docs/specs/login/spec.md", versions: [{ skill: "spec-writer", content: "spec", at: T10 }] });
}

const openGenerating = (world: World, purpose: Record<string, unknown>, extra: Record<string, unknown> = {}) => world.harness.caller.terminal.open({ ...openInput(world.setup, extra), purpose } as never);
const sessionsOf = (world: World) => world.setup.database.select().from(taskTerminalSessions);

describe("tasks.terminal.open to generate tasks", () => {
  it("V-37h opens with the default Opus and Maximum, stores them, and the runtime receives them at start", async () => {
    const world = await workerWorld();
    const spec = await withSpec(world);
    const { sessionId } = await openGenerating(world, { kind: "generate_tasks", specArtifactId: spec.id, choice: OPUS_MAX });
    await cycle(world);
    const [row] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId));
    expect(row).toMatchObject({ purpose: "generate_tasks", agent: "claude", model: "opus", effort: "max", planItemId: null });
    expect(world.runtime.starts[0]).toMatchObject({ sessionId, model: "opus", effort: "max" });
  });

  it("V-37h stores and starts with a changed choice", async () => {
    const world = await workerWorld();
    const spec = await withSpec(world);
    const { sessionId } = await openGenerating(world, { kind: "generate_tasks", specArtifactId: spec.id, choice: SONNET_HIGH });
    await cycle(world);
    expect((await sessionsOf(world))[0]).toMatchObject({ id: sessionId, model: "sonnet", effort: "high" });
    expect(world.runtime.starts[0]).toMatchObject({ model: "sonnet", effort: "high" });
  });

  it("V-37i refuses a spec of another task and a spec.md without a spec-writer version, creating no session", async () => {
    const world = await workerWorld();
    const { setup } = world;
    const otherTaskId = crypto.randomUUID();
    await setup.database.insert(tasks).values({ id: otherTaskId, projectId: setup.project.id, authorUserId: setup.ownerId, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 1, title: "Outra" });
    const [foreign] = await setup.database.insert(taskArtifacts).values({ taskId: otherTaskId, projectId: setup.project.id, relativePath: "docs/specs/outra/spec.md", latestVersion: 0 }).returning();
    const notWritten = await seedVersions(setup, { path: "docs/specs/c/spec.md", versions: [{ skill: "spec-to-tasks", content: "c", at: T11 }] });
    for (const specArtifactId of [foreign!.id, notWritten.id, crypto.randomUUID()]) {
      expect(await rejection(openGenerating(world, { kind: "generate_tasks", specArtifactId, choice: OPUS_MAX }))).toMatchObject({ code: "NOT_FOUND", reason: "spec_not_found" });
    }
    expect(await sessionsOf(world)).toEqual([]);
  });

  it("V-37j refuses a member who is not the operator, and asks to confirm when another session is active", async () => {
    const world = await workerWorld();
    const spec = await withSpec(world);
    const purpose = { kind: "generate_tasks", specArtifactId: spec.id, choice: OPUS_MAX };
    await world.setup.authorize(world.setup.readerId);
    const asMember = world.harness.callerFor(world.setup.readerId).terminal.open({ ...openInput(world.setup), purpose } as never);
    expect(await rejection(asMember)).toMatchObject({ code: "FORBIDDEN", reason: "operator_required" });
    await openGenerating(world, purpose);
    expect(await rejection(openGenerating(world, purpose, { allowAdditional: false }))).toMatchObject({ code: "CONFLICT", reason: "session_already_active" });
    const second = await openGenerating(world, purpose, { allowAdditional: true });
    expect(await sessionsOf(world)).toHaveLength(2);
    expect(second.sessionId).toEqual(expect.any(String));
  });

  it("V-44e refuses the Codex while only the Claude is registered", async () => {
    const world = await workerWorld();
    const spec = await withSpec(world);
    const outcome = await rejection(openGenerating(world, { kind: "generate_tasks", specArtifactId: spec.id, choice: { agent: "codex", model: "gpt-6.1-sol", effort: "high" } }));
    expect(outcome).toMatchObject({ code: "PRECONDITION_FAILED", reason: "agent_unavailable" });
    expect(await sessionsOf(world)).toEqual([]);
  });

  it("V-44f refuses a model of another agent for the Claude", async () => {
    const world = await workerWorld();
    const spec = await withSpec(world);
    const outcome = await rejection(openGenerating(world, { kind: "generate_tasks", specArtifactId: spec.id, choice: { agent: "claude", model: "gpt-6.1-sol", effort: "high" } }));
    expect(outcome).toMatchObject({ code: "BAD_REQUEST", reason: "choice_invalid" });
    expect(await sessionsOf(world)).toEqual([]);
  });

  it("keeps the route open as before: a plain input is a route session without a model", async () => {
    const world = await workerWorld();
    const { sessionId } = await world.harness.caller.terminal.open(openInput(world.setup));
    const [row] = await world.setup.database.select().from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId));
    expect(row).toMatchObject({ purpose: "route", model: "opus", effort: "max" });
  });
});
