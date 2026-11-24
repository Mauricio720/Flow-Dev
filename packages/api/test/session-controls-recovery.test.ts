import { afterEach, describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ScriptedSessionRuntime } from "../src/infra/terminal/scriptedSessionRuntime";
import { taskArtifactVersions, taskArtifacts } from "../src/infra/database/schema";
import { insertFlowDevSession, requestsOf, sessionRowOf } from "./session-interaction-support";
import { brokerWorld, cycle, scopeOf, workerWorld } from "./session-worker-support";
import { closeTaskFixture } from "./task-api-support";
import { cleanupTerminalFolders } from "./terminal-support";
import { DrizzleSessionStatusDao } from "../src/infra/database/dao/terminal/drizzleSessionStatusDao";
import { eq } from "drizzle-orm";
import { taskTerminalSessions } from "../src/infra/database/schema";

afterEach(async () => { await closeTaskFixture(); await cleanupTerminalFolders(); });

const QUESTION = [{ question: "Qual?", header: "Q", multiSelect: false, options: [{ label: "A", description: "a" }, { label: "B", description: "b" }] }];
const SPEC_PATH = "docs/specs/x/spec.md";

describe("session controls after restart", () => {
  it("ends an interrupted same-host session without resume and captures its artifact", async () => {
    const holder = { clone: "" };
    const skill = { hook_event_name: "PostToolUse", tool_name: "Skill", tool_input: { skill: "flow-dev:spec-writer" } };
    const edit = { hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: join(holder.clone, SPEC_PATH) } };
    const world = await workerWorld({ script: [{ kind: "hook", payload: skill }, { kind: "hook", payload: edit }] }, { permissions: undefined });
    holder.clone = world.clone;
    await mkdir(dirname(join(world.clone, SPEC_PATH)), { recursive: true });
    await writeFile(join(world.clone, SPEC_PATH), "# Capturado após restart\n");
    const id = await world.open();
    await cycle(world);
    await world.worker.registry.abandonAll();
    const current = await sessionRowOf(world.setup, id);
    const foreign = await insertFlowDevSession(world.setup, current.planningDecisionId, { hostId: "outra-maquina:ana", status: "interrupted", endRequestedAt: world.clock.now() });
    await world.harness.caller.session.end(scopeOf(world, id));
    const restartedRuntime = new ScriptedSessionRuntime();
    const restarted = world.build({ runtimes: { claude: restartedRuntime }, workerId: "worker-2" });
    await restarted.supervisor.tick();
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "ended", endRequestedAt: null });
    expect(restartedRuntime.resumes).toEqual([]);
    expect(await sessionRowOf(world.setup, foreign.id)).toMatchObject({ status: "interrupted", endRequestedAt: world.clock.now() });
    const [artifact] = await world.setup.database.select().from(taskArtifacts);
    const [version] = await world.setup.database.select().from(taskArtifactVersions);
    expect(artifact).toMatchObject({ relativePath: SPEC_PATH, latestVersion: 1 });
    expect(version).toMatchObject({ content: "# Capturado após restart\n", trigger: "session_end" });
  });

  it("interrupts a question opened after end_turn and resolves the pending request", async () => {
    const world = await brokerWorld([{ kind: "end_turn" }, { kind: "ask", questions: QUESTION }]);
    const id = await world.open();
    await cycle(world);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "asking" });
    await world.harness.caller.session.interrupt(scopeOf(world, id));
    await cycle(world);
    expect((await requestsOf(world.setup, id)).map((request) => request.status)).toEqual(["cancelled"]);
    expect(world.runtime.runnerOf(id).outcomes).toEqual([{ behavior: "deny", message: "Interrompido pela pessoa" }]);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "waiting", interruptRequestedAt: null });
  });

  it("keeps a pending question interruptible when Stop arrives after the question", async () => {
    const world = await brokerWorld([{ kind: "ask", questions: QUESTION }]);
    const id = await world.open();
    await cycle(world);
    const handlers = world.runtime.starts[0]!.handlers;
    handlers.onHook({ hook_event_name: "Stop" });
    await world.worker.flush();
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "waiting" });
    await world.harness.caller.session.interrupt(scopeOf(world, id));
    await cycle(world);
    expect((await requestsOf(world.setup, id)).map((request) => request.status)).toEqual(["cancelled"]);
    expect(world.runtime.runnerOf(id).interrupts).toBe(1);
    expect(world.runtime.runnerOf(id).outcomes).toEqual([{ behavior: "deny", message: "Interrompido pela pessoa" }]);
  });

  it("does not claim resume when end arrives after listing interrupted sessions", async () => {
    const world = await workerWorld({ script: [{ kind: "wait_message" }] });
    const id = await world.open();
    await cycle(world);
    await world.worker.registry.abandonAll();
    await world.setup.database.update(taskTerminalSessions).set({ status: "interrupted", claudeSessionId: "claude-queued" }).where(eq(taskTerminalSessions.id, id));
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "interrupted", claudeSessionId: "claude-queued" });
    await world.harness.caller.session.send({ ...scopeOf(world, id), content: "mensagem aguardando", requestKey: crypto.randomUUID() });
    const listed = await new DrizzleSessionStatusDao(world.setup.database).listInterrupted(world.worker.hostId);
    expect(listed.map((session) => session.id)).toContain(id);
    await world.harness.caller.session.end(scopeOf(world, id));
    const claim = await new DrizzleSessionStatusDao(world.setup.database).claimResume({ sessionId: id, workerId: "worker-race" });
    expect(claim).toBeNull();
    expect(world.runtime.resumes).toEqual([]);
    await cycle(world);
    expect(await sessionRowOf(world.setup, id)).toMatchObject({ status: "ended", endRequestedAt: null });
  });
});
