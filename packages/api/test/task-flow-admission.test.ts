import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { failureOf } from "./software-support";
import { closeTaskFixture } from "./task-api-support";
import { flowFixture, flowKey, skillAction, type FlowFixture } from "./task-flow-fixture";
import { assertLocalProviderOwnership } from "../src/application/services/task-flow/taskFlowAdmission";

let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

async function plannedFlow(fixture: FlowFixture) {
  const connectionId = await fixture.connection();
  await fixture.author.savePlan({ ...fixture.scope, actions: [skillAction(connectionId)], expectedRevision: 0, idempotencyKey: flowKey() });
  const plan = (await fixture.author.byTask(fixture.scope)).plan!;
  const start = (key = flowKey()) => fixture.author.startAction({ ...fixture.scope, actionId: plan.actions[0]!.id, expectedRevision: plan.revision, idempotencyKey: key });
  return { connectionId, plan, start };
}

describe("task flow admission", () => {
  it("UT-105 rejects a hosted connection for an explicitly local target", () => {
    const hostConnection = { id: "host-connection", executionTarget: "host", machineId: null, ownerUserId: null } as never;
    expect(() => assertLocalProviderOwnership(new Map([["main", { connection: hostConnection, release: "host" }]]), "machine-2", "operator-1")).toThrowError(expect.objectContaining({ reason: "connection_unavailable" }));
  });

  it("UT-117 does not enqueue preparation when the requested action is not in the eligible plan", async () => {
    const prepare = vi.fn(async () => ({ preparationId: "preparation-1" }));
    current = await flowFixture({ localProject: null, localPrepare: prepare });
    const connectionId = await current.connection();
    await current.author.savePlan({ ...current.scope, actions: [skillAction(connectionId)], expectedRevision: 0, idempotencyKey: flowKey() });
    const plan = (await current.author.byTask(current.scope)).plan!;
    await expect(current.service.prepareLocalAction({ ...current.scope, actorId: current.setup.ownerId, sourceSnapshotId: crypto.randomUUID() }, { actionId: crypto.randomUUID(), expectedRevision: plan.revision, requestKey: crypto.randomUUID() })).rejects.toMatchObject({ reason: "action_unavailable" });
    expect(prepare).not.toHaveBeenCalled();
  });

  it("UT-016, IT-053 and IT-105 resolve duplicate and concurrent starts to one run", async () => {
    current = await flowFixture();
    const { start } = await plannedFlow(current);
    const key = flowKey();
    const [first, second] = await Promise.all([start(key), start(key)]);
    expect(second.runId).toBe(first.runId);
    expect(await start(key)).toMatchObject({ runId: first.runId });
    expect(await failureOf(start(flowKey()))).toEqual({ code: "CONFLICT", reason: "action_already_started" });
    const runs = await current.author.runs(current.scope);
    expect(runs.items).toHaveLength(1);
    expect(runs.items[0]).toMatchObject({ state: "queued", attemptNumber: 1, bindings: [{ role: "main", modelId: "gpt-5.6-sol", reasoningEffort: "high" }] });
  });

  it("IT-051 and IT-054 keep the accepted snapshot when connections or catalogs change later", async () => {
    current = await flowFixture();
    const { connectionId, start } = await plannedFlow(current);
    await start();
    await current.setup.database.execute(sql`UPDATE software_connections SET label='Renomeada', auth_state='disconnected' WHERE id=${connectionId}`);
    current.gateway.models = [];
    const [run] = (await current.author.runs(current.scope)).items;
    expect(run?.bindings[0]).toMatchObject({ connectionLabel: expect.stringMatching(/^Codex /), connectionAvailable: false, modelId: "gpt-5.6-sol" });
    const plan = (await current.author.byTask(current.scope)).plan!;
    expect(plan.actions[0]?.bindings[0]).toMatchObject({ connectionLabel: "Renomeada", connectionAvailable: false, reasoningEffort: "high" });
  });

  it("UT-015 and IT-055 enforce ordering and enable create_tasks without starting it", async () => {
    current = await flowFixture();
    const connectionId = await current.connection();
    const tasks = { ...skillAction(connectionId), kind: "create_tasks" as const };
    await current.author.savePlan({ ...current.scope, actions: [skillAction(connectionId), tasks], expectedRevision: 0, idempotencyKey: flowKey() });
    const plan = (await current.author.byTask(current.scope)).plan!;
    const startTasks = () => current!.author.startAction({ ...current!.scope, actionId: plan.actions[1]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() });
    expect(await failureOf(startTasks())).toEqual({ code: "PRECONDITION_FAILED", reason: "stage_prerequisite" });
    await current.setup.database.execute(sql`UPDATE task_execution_actions SET state='succeeded' WHERE id=${plan.actions[0]!.id}`);
    expect(await failureOf(startTasks())).toEqual({ code: "PRECONDITION_FAILED", reason: "stage_prerequisite" });
    current.approvals.spec = true;
    expect((await current.author.options(current.scope)).actions).toContainEqual({ kind: "create_tasks", available: true });
    expect((await current.author.runs(current.scope)).items).toEqual([]);
    expect(await startTasks()).toMatchObject({ state: "queued" });
  });

  it("IT-033 and IT-035 start only with a connection valid at admission and keep historical choices", async () => {
    current = await flowFixture();
    const { connectionId, start } = await plannedFlow(current);
    const database = current.setup.database;
    const racing = database.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM software_connections WHERE id=${connectionId} FOR UPDATE`);
      await tx.execute(sql`UPDATE software_connections SET auth_state='disconnected', disabled_at=now(), revision=revision+1 WHERE id=${connectionId}`);
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const rejected = await failureOf(start());
    await racing;
    expect(rejected).toEqual({ code: "PRECONDITION_FAILED", reason: "connection_unavailable" });
    expect((await current.author.runs(current.scope)).items).toEqual([]);
    const plan = (await current.author.byTask(current.scope)).plan!;
    expect(plan.actions[0]).toMatchObject({ state: "planned", bindings: [{ connectionId, connectionAvailable: false }] });
    await database.execute(sql`UPDATE software_connections SET auth_state='connected', disabled_at=NULL WHERE id=${connectionId}`);
    expect(await start()).toMatchObject({ state: "queued" });
  });

  it("IT-052, IT-058, IT-061 and IT-062 block unavailable choices and unready layers without side effects", async () => {
    current = await flowFixture();
    const { plan, start } = await plannedFlow(current);
    current.gateway.validateChoice = async () => ({ ok: false, code: "model_unavailable", release: "v0.3.0-beta.29" });
    expect(await failureOf(start())).toEqual({ code: "PRECONDITION_FAILED", reason: "model_unavailable" });
    current.gateway.validateChoice = FakeValidate;
    current.layers.host = { state: "blocked", reasonCode: "rootless_isolation_unavailable" };
    expect(await failureOf(start())).toEqual({ code: "PRECONDITION_FAILED", reason: "runtime_incompatible" });
    current.layers.host = { state: "ready" };
    current.layers.runtime = undefined;
    expect(await failureOf(start())).toMatchObject({ code: "PRECONDITION_FAILED" });
    current.layers.runtime = { state: "ready" };
    expect((await current.author.byTask(current.scope)).plan).toMatchObject({ revision: plan.revision, actions: [{ state: "planned" }] });
    expect(await start()).toMatchObject({ state: "queued" });
  });
});

async function FakeValidate() {
  const { LIVE_MODEL } = await import("./software-support");
  return { ok: true as const, value: LIVE_MODEL, release: "v0.3.0-beta.29" };
}
