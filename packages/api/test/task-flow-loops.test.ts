import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import type { LoopDefinition } from "../src/application/software/compozyControlGateway";
import { failureOf } from "./software-support";
import { closeTaskFixture } from "./task-api-support";
import { LEASE_MS, ScriptedExecutor, dispatcherFor, flowFixture, flowKey, skillAction, type FlowFixture } from "./task-flow-fixture";

let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

const DEFINITION: LoopDefinition = {
  name: "implement-tasks", version: "3", source: "bundled", enabled: true, description: "Implementa as tarefas",
  inputs: [{ name: "focus", kind: "string", required: true, hasDefault: false }],
  runtimeRoles: ["backend_runtime", "frontend_runtime"], runtimeLocked: false, requires: ["tasks_approved"],
};

async function loopFlow(fixture: FlowFixture, overrides: Record<string, unknown> = {}) {
  fixture.gateway.loops = [DEFINITION];
  fixture.approvals.spec = true;
  fixture.approvals.tasks = true;
  const backend = await fixture.connection();
  const frontend = await fixture.connection();
  const runtime = (connectionId: string, effort: string | null) => ({ connectionId, providerId: "codex" as const, modelId: "gpt-5.6-sol", reasoningEffort: effort });
  const loop = { kind: "loop" as const, loopName: "implement-tasks", loopVersion: "3", inputs: { focus: "api" }, runtimeBindings: { backend_runtime: runtime(backend, "high"), frontend_runtime: runtime(frontend, null) }, workspace: { kind: "isolated" as const }, ...overrides };
  const save = (actions: unknown[], expectedRevision = 0) => fixture.author.savePlan({ ...fixture.scope, actions: actions as never, expectedRevision, idempotencyKey: flowKey() });
  return { loop, save, backend, frontend, skill: skillAction(backend) };
}

async function succeed(fixture: FlowFixture, actionId: string) {
  await fixture.setup.database.execute(sql`UPDATE task_execution_actions SET state='succeeded' WHERE id=${actionId}`);
}

describe("loop actions", () => {
  it("IT-099, IT-114 and IT-105 offer live Loops, pass every declared runtime and accept one run for duplicate starts", async () => {
    current = await flowFixture({ runtimeControl: true });
    const { loop, save, skill } = await loopFlow(current);
    const options = await current.author.options(current.scope);
    expect(options.loops).toEqual([expect.objectContaining({ name: "implement-tasks", version: "3", offerable: true, runtimeRoles: ["backend_runtime", "frontend_runtime"] })]);
    await save([skill, { ...skill, kind: "create_tasks" }, loop]);
    const plan = (await current.author.byTask(current.scope)).plan!;
    await succeed(current, plan.actions[0]!.id);
    await succeed(current, plan.actions[1]!.id);
    const key = flowKey();
    const start = () => current!.author.startAction({ ...current!.scope, actionId: plan.actions[2]!.id, expectedRevision: plan.revision, idempotencyKey: key });
    const [first, second] = await Promise.all([start(), start()]);
    expect(second.runId).toBe(first.runId);
    const dispatcher = dispatcherFor(current, current.loopExecutor as never, () => new Date());
    await dispatcher.runOnce();
    expect(current.gateway.loopStarts).toHaveLength(1);
    expect(current.gateway.loopStarts[0]).toMatchObject({ name: "implement-tasks", version: "3", inputs: { focus: "api" } });
    expect(current.gateway.loopStarts[0]?.inputs.backend_runtime).toMatchObject({ model: "gpt-5.6-sol", reasoning: "high", provider: expect.stringMatching(/^codex-[0-9a-f]{8}$/) });
    expect(current.gateway.loopStarts[0]?.inputs.frontend_runtime).toEqual({ provider: expect.stringMatching(/^codex-[0-9a-f]{8}$/), model: "gpt-5.6-sol" });
  });

  it("IT-100, IT-101 and IT-115 refuse changed, disabled, unsafe or role-invalid Loops before any run exists", async () => {
    current = await flowFixture({ runtimeControl: true });
    const { loop, save, skill } = await loopFlow(current);
    const failure = (overrides: Record<string, unknown>) => failureOf(save([skill, { ...skill, kind: "create_tasks" }, { ...loop, ...overrides }]));
    expect(await failure({ loopVersion: "2" })).toEqual({ code: "PRECONDITION_FAILED", reason: "loop_version_changed" });
    expect(await failure({ inputs: { focus: "api", sudo: "x" } })).toMatchObject({ reason: "loop_input_invalid" });
    expect(await failure({ runtimeBindings: { backend_runtime: loop.runtimeBindings.backend_runtime } })).toMatchObject({ reason: "loop_runtime_binding_missing" });
    expect(await failure({ runtimeBindings: { ...loop.runtimeBindings, extra_runtime: loop.runtimeBindings.backend_runtime } })).toMatchObject({ reason: "loop_runtime_binding_invalid" });
    current.gateway.loops = [{ ...DEFINITION, enabled: false }, { ...DEFINITION, name: "locked", runtimeLocked: true }];
    const options = await current.author.options(current.scope);
    expect(options.loops.map((item) => [item.name, item.offerable, item.reason])).toEqual([["implement-tasks", false, "loop_disabled"], ["locked", false, "runtime_not_overridable"]]);
    expect(await failure({})).toMatchObject({ reason: "loop_unavailable" });
    expect((await current.author.runs(current.scope)).items).toEqual([]);
  });

  it("IT-102 blocks implementation before tasks are approved and keeps earlier artifacts", async () => {
    current = await flowFixture({ runtimeControl: true });
    const { loop, save, skill } = await loopFlow(current);
    current.approvals.tasks = false;
    await save([skill, { ...skill, kind: "create_tasks" }, loop]);
    const plan = (await current.author.byTask(current.scope)).plan!;
    await succeed(current, plan.actions[0]!.id);
    await succeed(current, plan.actions[1]!.id);
    expect(await failureOf(current.author.startAction({ ...current.scope, actionId: plan.actions[2]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() }))).toEqual({ code: "PRECONDITION_FAILED", reason: "stage_prerequisite" });
    expect((await current.author.byTask(current.scope)).plan?.actions.map((action) => action.state)).toEqual(["succeeded", "succeeded", "planned"]);
  });

  it("UT-020 adopts a run the daemon already created instead of starting a second one", async () => {
    current = await flowFixture({ runtimeControl: true });
    const { loop, save, skill } = await loopFlow(current);
    await save([skill, { ...skill, kind: "create_tasks" }, loop]);
    const plan = (await current.author.byTask(current.scope)).plan!;
    await succeed(current, plan.actions[0]!.id);
    await succeed(current, plan.actions[1]!.id);
    const started = await current.author.startAction({ ...current.scope, actionId: plan.actions[2]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() });
    let now = new Date();
    current.gateway.loopStartResult = { ok: false, code: "outcome_unknown", release: "v0.3.0-beta.29" };
    await dispatcherFor(current, current.loopExecutor as never, () => now).runOnce();
    const request = current.gateway.loopStarts[0]!;
    current.gateway.liveLoopRuns = [{ runId: "loop-run-9", state: "running", terminalReason: null, definitionVersion: 3, createdAt: "2999-01-01T00:00:00.000Z", inputs: request.inputs }];
    now = new Date(now.getTime() + LEASE_MS + 1000);
    await dispatcherFor(current, current.loopExecutor as never, () => now).runOnce();
    expect(current.gateway.loopStarts).toHaveLength(1);
    expect(await current.flow.runs.find(started.runId)).toMatchObject({ state: "running", runtime: { runId: "loop-run-9" } });
  });

  it("UT-020, IT-103, IT-108 and IT-110 reconcile unknown starts, show real outcomes, cancel and retry with a fresh run", async () => {
    current = await flowFixture({ runtimeControl: true });
    const { loop, save, skill } = await loopFlow(current);
    await save([skill, { ...skill, kind: "create_tasks" }, loop]);
    const plan = (await current.author.byTask(current.scope)).plan!;
    await succeed(current, plan.actions[0]!.id);
    await succeed(current, plan.actions[1]!.id);
    const startInput = () => ({ ...current!.scope, actionId: plan.actions[2]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() });
    const first = await current.author.startAction(startInput());
    let now = new Date();
    current.gateway.loopStartResult = { ok: false, code: "outcome_unknown", release: "v0.3.0-beta.29" };
    await dispatcherFor(current, current.loopExecutor as never, () => now).runOnce();
    expect((await current.flow.runs.find(first.runId))?.state).toBe("reconciling");
    current.gateway.loopStartResult = { ok: true, value: { runId: "loop-run-1", state: "running", terminalReason: null, definitionVersion: 3, createdAt: "2999-01-01T00:00:00.000Z", inputs: {} }, release: "v0.3.0-beta.29" };
    now = new Date(now.getTime() + LEASE_MS + 1000);
    await dispatcherFor(current, current.loopExecutor as never, () => now).runOnce();
    expect(await current.flow.runs.find(first.runId)).toMatchObject({ state: "running", runtime: { runId: "loop-run-1" } });
    expect(current.gateway.loopStarts).toHaveLength(2);
    expect(current.gateway.loopStarts[0]?.requestId).toBe(current.gateway.loopStarts[1]?.requestId);
    expect(await failureOf(current.author.retryAction(startInput()))).toEqual({ code: "CONFLICT", reason: "action_active" });
    const canceled = await current.author.cancelRun({ ...current.scope, runId: first.runId, idempotencyKey: flowKey() });
    expect(canceled).toMatchObject({ state: "canceled", terminalCode: "canceled_by_author" });
    expect((await current.author.byTask(current.scope)).plan?.actions[2]?.state).toBe("canceled");
    const retried = await current.author.retryAction(startInput());
    expect(retried.runId).not.toBe(first.runId);
    expect((await current.flow.runs.find(retried.runId))?.attemptNumber).toBe(2);
    expect(await failureOf(current.author.cancelRun({ ...current.scope, runId: flowKey(), idempotencyKey: flowKey() }))).toEqual({ code: "NOT_FOUND", reason: "run_unavailable" });
  });
});
