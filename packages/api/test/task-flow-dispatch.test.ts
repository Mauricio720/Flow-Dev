import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { closeTaskFixture } from "./task-api-support";
import { ScriptedExecutor, dispatcherFor, flowFixture, flowKey, skillAction, type FlowFixture } from "./task-flow-fixture";

let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

const LEASE_MS = 30_000;

async function startedRun(fixture: FlowFixture) {
  const connectionId = await fixture.connection();
  await fixture.author.savePlan({ ...fixture.scope, actions: [skillAction(connectionId)], expectedRevision: 0, idempotencyKey: flowKey() });
  const plan = (await fixture.author.byTask(fixture.scope)).plan!;
  const run = await fixture.author.startAction({ ...fixture.scope, actionId: plan.actions[0]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() });
  return { connectionId, plan, run };
}

describe("task flow dispatcher", () => {
  it("IT-054 recovers a restarted worker against the same snapshot and run identity", async () => {
    current = await flowFixture();
    const { run } = await startedRun(current);
    let now = new Date();
    const executor = new ScriptedExecutor();
    expect(await dispatcherFor(current, executor, () => now).runOnce()).toBe(true);
    const [before] = (await current.flow.runs.list({ taskId: current.scope.taskId, limit: 5 })).items;
    expect(before).toMatchObject({ id: run.runId, state: "running", leaseFence: 1, runtime: { sessionId: "s1" } });
    expect(await dispatcherFor(current, new ScriptedExecutor(), () => now, "worker-2").runOnce()).toBe(false);
    now = new Date(now.getTime() + LEASE_MS + 1000);
    const restarted = new ScriptedExecutor();
    expect(await dispatcherFor(current, restarted, () => now, "worker-2").runOnce()).toBe(true);
    const [after] = (await current.flow.runs.list({ taskId: current.scope.taskId, limit: 5 })).items;
    expect(after).toMatchObject({ id: run.runId, state: "succeeded", leaseFence: 2, snapshot: before!.snapshot, runtime: { sessionId: "s1" } });
    expect(restarted.requests[0]?.snapshot.runtime.modelId).toBe("gpt-5.6-sol");
    const plan = (await current.author.byTask(current.scope)).plan!;
    expect(plan).toMatchObject({ status: "completed", actions: [{ state: "succeeded" }] });
  });

  it("fences a stale worker out of settling a newer lease", async () => {
    current = await flowFixture();
    const { run } = await startedRun(current);
    const first = await current.flow.runs.claimNext({ owner: "a", now: new Date(), leaseMs: 1 });
    const later = new Date(Date.now() + 5000);
    const second = await current.flow.runs.claimNext({ owner: "b", now: later, leaseMs: LEASE_MS });
    expect([first?.leaseFence, second?.leaseFence, second?.id]).toEqual([1, 2, run.runId]);
    expect(await current.flow.runs.settle({ runId: run.runId, fence: 1, state: "failed", terminalCode: "x", now: later })).toBe(false);
    expect(await current.flow.runs.settle({ runId: run.runId, fence: 2, state: "succeeded", terminalCode: null, now: later })).toBe(true);
  });

  it("IT-088 and IT-103 settle blocked or unknown outcomes truthfully and start nothing else", async () => {
    current = await flowFixture();
    await startedRun(current);
    const now = new Date();
    const executor = new ScriptedExecutor();
    executor.execution = { kind: "unknown" };
    await dispatcherFor(current, executor, () => now).runOnce();
    expect((await current.flow.runs.list({ taskId: current.scope.taskId, limit: 1 })).items[0]).toMatchObject({ state: "reconciling" });
    executor.reconciliation = { state: "failed", code: "model_unavailable" };
    await dispatcherFor(current, executor, () => new Date(now.getTime() + LEASE_MS + 1)).runOnce();
    const [run] = (await current.flow.runs.list({ taskId: current.scope.taskId, limit: 1 })).items;
    expect(run).toMatchObject({ state: "failed", terminalCode: "model_unavailable" });
    expect((await current.author.byTask(current.scope)).plan).toMatchObject({ status: "planned", actions: [{ state: "failed" }] });
    expect((await current.flow.runs.list({ taskId: current.scope.taskId, limit: 10 })).items).toHaveLength(1);
  });

  it("IT-056 and IT-070 keep every attributable run navigable in a long history", async () => {
    current = await flowFixture();
    const { connectionId, plan } = await startedRun(current);
    await current.setup.database.execute(sql`UPDATE task_execution_runs SET state='failed'`);
    const actionId = plan.actions[0]!.id;
    for (let index = 0; index < 55; index++) await current.flow.runs.insert({ actionId, taskId: current.scope.taskId, snapshot: { kind: "create_spec", runtime: { connectionId, providerId: "codex", modelId: `m${index}`, reasoningEffort: null }, connectionLabels: {}, compozyVersion: "v" }, worktreeId: null, connectionIds: [connectionId], isWrite: false, idempotencyKey: flowKey(), requestedBy: current.setup.ownerId });
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await current.reader.runs({ ...current.scope, cursor, limit: 20 });
      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen).toHaveLength(56);
    expect(new Set(seen).size).toBe(56);
  });
});
