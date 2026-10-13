import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { localMachines, softwareConnections } from "../src/infra/database/schema";
import { failureOf } from "./software-support";
import { closeTaskFixture } from "./task-api-support";
import { flowFixture, flowKey, skillAction, type FlowFixture } from "./task-flow-fixture";

let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

const LOCAL_WORKSPACE = { kind: "local" as const };
const localProject = () => ({ key: `local:${"a".repeat(64)}`, workspaceId: null, safeLabel: "Flow", target: { machineId: crypto.randomUUID(), linkId: crypto.randomUUID(), linkRevision: 3, checkoutHandle: "opaque-handle" } });
const save = (fixture: FlowFixture, actions: unknown[], expectedRevision = 0) => fixture.author.savePlan({ ...fixture.scope, actions: actions as never, expectedRevision, idempotencyKey: flowKey() });
const MODEL_CATALOG = [{ modelId: "gpt-5.6-sol", displayName: "gpt-5.6-sol", selectable: true, unselectableReason: null, reasoningChoices: [null, "high", "low"] }];

async function machineConnection(fixture: FlowFixture, machineId: string) {
  const connectionId = await fixture.connection();
  await fixture.setup.database.insert(localMachines).values({ id: machineId, ownerUserId: fixture.setup.ownerId, label: "Developer machine", credentialHash: "hash", credentialExpiresAt: new Date(Date.now() + 60_000) });
  await fixture.setup.database.update(softwareConnections).set({ executionTarget: "machine", machineId, ownerUserId: fixture.setup.ownerId, modelCatalog: MODEL_CATALOG }).where(sql`${softwareConnections.id} = ${connectionId}`);
  return connectionId;
}

describe("task flow plan on the linked local project", () => {
  it("binds the linked checkout on save and keeps its target out of the client view", async () => {
    const project = localProject();
    current = await flowFixture({ localProject: project });
    const connectionId = await machineConnection(current, project.target.machineId);
    expect(await save(current, [{ ...skillAction(connectionId), workspace: LOCAL_WORKSPACE }])).toEqual({ revision: 1, state: "planned", runId: null });
    expect((await current.flow.plans.find(current.scope.taskId))?.actions[0]?.workspace).toEqual({ kind: "local", target: project.target });
    const view = (await current.author.byTask(current.scope)).plan!;
    expect(view.actions[0]?.workspace).toEqual(LOCAL_WORKSPACE);
    expect((await save(current, [{ ...skillAction(connectionId, { reasoningEffort: "low" }), workspace: view.actions[0]!.workspace }], view.revision)).revision).toBe(2);
  });

  it("refuses the local checkout when no linked project is ready", async () => {
    current = await flowFixture({ localProject: null });
    const connectionId = await machineConnection(current, crypto.randomUUID());
    expect(await failureOf(save(current, [{ ...skillAction(connectionId), workspace: LOCAL_WORKSPACE }]))).toEqual({ code: "PRECONDITION_FAILED", reason: "worktree_not_ready" });
    expect((await current.author.byTask(current.scope)).plan).toBeNull();
  });

  it("offers the local start while the host runtime is unreachable", async () => {
    const project = localProject();
    current = await flowFixture({ localProject: project });
    await machineConnection(current, project.target.machineId);
    current.layers.runtime = { state: "unknown", reasonCode: "runtime_unreachable" };
    expect(await current.author.options(current.scope)).toMatchObject({ startReason: "no_ready_connection", localStartReason: null });
    current.layers.application = { state: "blocked", reasonCode: "software_disabled" };
    expect((await current.author.options(current.scope)).localStartReason).toBe("application_not_ready");
  });

  it("lists the Loops reported by the linked machine once the flow runs on the local checkout", async () => {
    const loop = { name: "implement-tasks", version: "0", source: "marketplace", enabled: true, description: "Implement task files.", inputs: [], runtimeRoles: ["default_runtime"], runtimeLocked: false, requires: [] };
    const project = { ...localProject(), loops: [loop] };
    current = await flowFixture({ localProject: project });
    const connectionId = await machineConnection(current, project.target.machineId);
    expect(await current.author.options(current.scope)).toMatchObject({ loops: [], loopsReason: "workspace_unregistered" });
    await save(current, [{ ...skillAction(connectionId), workspace: LOCAL_WORKSPACE }]);
    expect(await current.author.options(current.scope)).toMatchObject({ loops: [{ name: "implement-tasks", version: "0", offerable: true, reason: null }], loopsReason: null });
  });

  it("says the machine has not reported its Loops instead of offering an empty list silently", async () => {
    const project = localProject();
    current = await flowFixture({ localProject: project });
    const connectionId = await machineConnection(current, project.target.machineId);
    await save(current, [{ ...skillAction(connectionId), workspace: LOCAL_WORKSPACE }]);
    expect(await current.author.options(current.scope)).toMatchObject({ loops: [], loopsReason: "local_loops_unreported" });
  });

  it("prepares a failed local action again so it can be retried, but not one that is still running", async () => {
    const prepare = vi.fn(async () => ({ preparationId: "preparation-1" }));
    const project = localProject();
    current = await flowFixture({ localProject: project, localPrepare: prepare });
    const connectionId = await machineConnection(current, project.target.machineId);
    await save(current, [{ ...skillAction(connectionId), workspace: LOCAL_WORKSPACE }]);
    const plan = (await current.author.byTask(current.scope)).plan!;
    const operator = { ...current.scope, actorId: current.setup.ownerId, sourceSnapshotId: crypto.randomUUID() };
    const request = { actionId: plan.actions[0]!.id, expectedRevision: plan.revision, requestKey: crypto.randomUUID() };
    await current.flow.plans.setActionState(request.actionId, "failed");
    await expect(current.service.prepareLocalAction(operator, request)).resolves.toEqual({ preparationId: "preparation-1" });
    await current.flow.plans.setActionState(request.actionId, "running");
    await expect(current.service.prepareLocalAction(operator, request)).rejects.toMatchObject({ reason: "action_active" });
    expect(prepare).toHaveBeenCalledOnce();
  });
});
