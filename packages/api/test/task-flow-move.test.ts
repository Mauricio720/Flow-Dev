import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { localMachines, softwareConnections } from "../src/infra/database/schema";
import { failureOf } from "./software-support";
import { closeTaskFixture } from "./task-api-support";
import { flowFixture, flowKey, skillAction, type FlowFixture } from "./task-flow-fixture";

let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

const LOCAL_WORKSPACE = { kind: "local" as const };
const FAILED_STATE = "failed";
const MODEL_CATALOG = [{ modelId: "gpt-5.6-sol", displayName: "gpt-5.6-sol", selectable: true, unselectableReason: null, reasoningChoices: [null, "high"] }];
const localProject = () => ({ key: `local:${"a".repeat(64)}`, workspaceId: null, safeLabel: "Flow", target: { machineId: crypto.randomUUID(), linkId: crypto.randomUUID(), linkRevision: 3, checkoutHandle: "opaque-handle" } });
const runtimeOf = (connectionId: string) => ({ main: skillAction(connectionId).runtime });

async function failedHostAction(fixture: FlowFixture) {
  const hostConnectionId = await fixture.connection();
  await fixture.author.savePlan({ ...fixture.scope, actions: [skillAction(hostConnectionId)], expectedRevision: 0, idempotencyKey: flowKey() });
  const plan = (await fixture.author.byTask(fixture.scope)).plan!;
  await fixture.flow.plans.setActionState(plan.actions[0]!.id, FAILED_STATE);
  return { hostConnectionId, actionId: plan.actions[0]!.id, expectedRevision: plan.revision };
}

async function machineConnection(fixture: FlowFixture, machineId: string) {
  const connectionId = await fixture.connection();
  await fixture.setup.database.insert(localMachines).values({ id: machineId, ownerUserId: fixture.setup.ownerId, label: "Developer machine", credentialHash: "hash", credentialExpiresAt: new Date(Date.now() + 60_000) });
  await fixture.setup.database.update(softwareConnections).set({ executionTarget: "machine", machineId, ownerUserId: fixture.setup.ownerId, modelCatalog: MODEL_CATALOG }).where(sql`${softwareConnections.id} = ${connectionId}`);
  return connectionId;
}

describe("moving a failed action to another checkout", () => {
  it("moves a failed host action to the linked local project with the machine runtime", async () => {
    const project = localProject();
    current = await flowFixture({ localProject: project });
    const failed = await failedHostAction(current);
    const localConnectionId = await machineConnection(current, project.target.machineId);
    const move = { ...current.scope, actionId: failed.actionId, expectedRevision: failed.expectedRevision, workspace: LOCAL_WORKSPACE, runtimeBindings: runtimeOf(localConnectionId) };
    expect(await current.author.moveAction(move)).toEqual({ revision: failed.expectedRevision + 1 });
    const stored = (await current.flow.plans.find(current.scope.taskId))!;
    expect(stored.actions[0]).toMatchObject({ state: FAILED_STATE, workspace: { kind: "local", target: project.target }, bindings: [{ role: "main", connectionId: localConnectionId }] });
    expect((await current.author.byTask(current.scope)).plan?.actions[0]?.workspace).toEqual(LOCAL_WORKSPACE);
  });

  it("keeps the action where it is when the chosen runtime belongs to the other checkout", async () => {
    const project = localProject();
    current = await flowFixture({ localProject: project });
    const failed = await failedHostAction(current);
    const move = { ...current.scope, actionId: failed.actionId, expectedRevision: failed.expectedRevision, workspace: LOCAL_WORKSPACE, runtimeBindings: runtimeOf(failed.hostConnectionId) };
    expect(await failureOf(current.author.moveAction(move))).toMatchObject({ reason: "connection_unavailable" });
    expect((await current.flow.plans.find(current.scope.taskId))?.actions[0]?.workspace).toEqual({ kind: "isolated" });
  });

  it("refuses to move an action that has not failed or that would stay in the same checkout", async () => {
    const project = localProject();
    current = await flowFixture({ localProject: project });
    const failed = await failedHostAction(current);
    const same = { ...current.scope, actionId: failed.actionId, expectedRevision: failed.expectedRevision, workspace: { kind: "isolated" as const }, runtimeBindings: runtimeOf(failed.hostConnectionId) };
    expect(await failureOf(current.author.moveAction(same))).toMatchObject({ reason: "invalid_input" });
    await current.flow.plans.setActionState(failed.actionId, "planned");
    expect(await failureOf(current.author.moveAction({ ...same, workspace: LOCAL_WORKSPACE }))).toMatchObject({ reason: "action_unavailable" });
  });
});
