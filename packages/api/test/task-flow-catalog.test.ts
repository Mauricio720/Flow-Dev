import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { localMachines, softwareConnections } from "../src/infra/database/schema";
import { LIVE_MODEL, failureOf } from "./software-support";
import { closeTaskFixture } from "./task-api-support";
import { ScriptedExecutor, dispatcherFor, flowFixture, flowKey, skillAction, type FlowFixture } from "./task-flow-fixture";

let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

const save = (fixture: FlowFixture, actions: unknown[], expectedRevision = 0) => fixture.author.savePlan({ ...fixture.scope, actions: actions as never, expectedRevision, idempotencyKey: flowKey() });

describe("runtime catalog choices", () => {
  it("UT-104 omits a foreign owner's machine connection and model metadata", async () => {
    const ownMachineId = crypto.randomUUID();
    current = await flowFixture({ localProject: { key: `local:${"a".repeat(64)}`, workspaceId: null, safeLabel: "Flow", target: { machineId: ownMachineId, linkId: crypto.randomUUID(), linkRevision: 1, checkoutHandle: "opaque-handle" } } });
    const foreignMachineId = crypto.randomUUID();
    const foreignRuntimeId = `local-${foreignMachineId}-codex`;
    await current.setup.database.insert(localMachines).values({ id: foreignMachineId, ownerUserId: current.setup.readerId, label: "Other user's machine", credentialHash: "foreign-hash", credentialExpiresAt: new Date(Date.now() + 60_000) });
    const [foreignConnection] = await current.setup.database.insert(softwareConnections).values({ label: `Foreign ${foreignMachineId.slice(0, 6)}`, providerKind: "codex", runtimeProviderId: foreignRuntimeId, executionTarget: "machine", machineId: foreignMachineId, ownerUserId: current.setup.readerId, authState: "connected", createdBy: current.setup.ownerId, modelCatalog: [{ modelId: "private-model-canary", displayName: "Private model", selectable: true, unselectableReason: null, reasoningChoices: ["high"] }] }).returning();
    const options = await current.author.options(current.scope);
    expect(options.connections.some((connection) => connection.id === foreignConnection!.id)).toBe(false);
    expect(JSON.stringify(options)).not.toContain("private-model-canary");
  });

  it("IT-085 and IT-087 offer only advertised models and efforts, with provider default when none are advertised", async () => {
    current = await flowFixture();
    const connectionId = await current.connection();
    current.gateway.models = [LIVE_MODEL, { ...LIVE_MODEL, modelId: "plain", displayName: "plain", reasoningChoices: [null] }];
    const options = await current.author.options(current.scope);
    expect(options.connections[0]?.models.map((model) => [model.modelId, model.reasoningChoices])).toEqual([["gpt-5.6-sol", [null, "low", "high"]], ["plain", [null]]]);
    expect(await failureOf(save(current, [skillAction(connectionId, { modelId: "plain", reasoningEffort: "low" })]))).toEqual({ code: "PRECONDITION_FAILED", reason: "reasoning_effort_unsupported" });
    expect(await save(current, [skillAction(connectionId, { modelId: "plain", reasoningEffort: null })])).toMatchObject({ revision: 1 });
  });

  it("IT-086 never offers guessed models when the catalog is stale, empty or unavailable", async () => {
    current = await flowFixture();
    const connectionId = await current.connection();
    current.gateway.models = [{ ...LIVE_MODEL, selectable: false, unselectableReason: "catalog_stale", reasoningChoices: [] }];
    expect((await current.author.options(current.scope)).connections[0]).toMatchObject({ ready: false, reason: "catalog_stale" });
    current.gateway.models = [];
    expect((await current.author.options(current.scope)).connections[0]).toMatchObject({ ready: false, models: [] });
    expect(await failureOf(save(current, [skillAction(connectionId)]))).toEqual({ code: "PRECONDITION_FAILED", reason: "model_unavailable" });
    expect((await current.author.options(current.scope)).startReason).toBe("no_ready_connection");
  });

  it("does not use the hosted provider catalog for a machine connection", async () => {
    const machineId = crypto.randomUUID();
    const linkId = crypto.randomUUID();
    current = await flowFixture({ localProject: { key: `local:${"a".repeat(64)}`, workspaceId: null, safeLabel: "Flow", target: { machineId, linkId, linkRevision: 1, checkoutHandle: "opaque-handle" } } });
    const connectionId = await current.connection();
    const [machine] = await current.setup.database.insert(localMachines).values({
      id: machineId,
      ownerUserId: current.setup.ownerId,
      label: "Developer machine",
      credentialHash: "hash",
      credentialExpiresAt: new Date(Date.now() + 60_000),
    }).returning();
    await current.setup.database.update(softwareConnections).set({
      executionTarget: "machine",
      machineId: machine!.id,
      ownerUserId: current.setup.ownerId,
    }).where(sql`${softwareConnections.id} = ${connectionId}`);
    const listModels = current.gateway.listModels;
    current.gateway.listModels = async () => { throw new Error("machine catalog must not query host"); };

    expect((await current.author.options(current.scope)).connections[0]).toMatchObject({
      executionTarget: "machine",
      machineId: machine!.id,
      ready: false,
      reason: "catalog_stale",
      models: [],
    });

    current.gateway.listModels = listModels;
  });

  it("IT-089 and IT-091 let the author update an unbound choice and reject replayed or malformed identifiers", async () => {
    current = await flowFixture();
    const connectionId = await current.connection();
    await save(current, [skillAction(connectionId)]);
    const plan = (await current.author.byTask(current.scope)).plan!;
    current.gateway.models = [{ ...LIVE_MODEL, modelId: "gpt-next", displayName: "gpt-next" }];
    const start = () => current!.author.startAction({ ...current!.scope, actionId: plan.actions[0]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() });
    expect(await failureOf(start())).toEqual({ code: "PRECONDITION_FAILED", reason: "model_unavailable" });
    expect((await save(current, [skillAction(connectionId, { modelId: "gpt-next" })], plan.revision)).revision).toBe(2);
    const bad = (override: Record<string, unknown>) => failureOf(save(current!, [skillAction(connectionId, override)], 2));
    expect(await bad({ modelId: "" })).toMatchObject({ code: "BAD_REQUEST" });
    expect(await bad({ reasoningEffort: "x".repeat(80) })).toMatchObject({ code: "BAD_REQUEST" });
    expect(await bad({ connectionId: "not-a-uuid" })).toMatchObject({ code: "BAD_REQUEST" });
    expect(await bad({ providerId: "other" })).toMatchObject({ code: "BAD_REQUEST" });
    expect((await current.author.byTask(current.scope)).plan?.revision).toBe(2);
  });

  it("IT-088 and IT-090 settle a rejected first prompt as blocked, keep its provenance and block the next action until reconfirmed", async () => {
    current = await flowFixture();
    const connectionId = await current.connection();
    await save(current, [skillAction(connectionId), { ...skillAction(connectionId), kind: "create_tasks" }]);
    const plan = (await current.author.byTask(current.scope)).plan!;
    const executor = new ScriptedExecutor();
    executor.execution = { kind: "blocked", code: "model_unavailable" };
    await current.author.startAction({ ...current.scope, actionId: plan.actions[0]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() });
    await dispatcherFor(current, executor, () => new Date()).runOnce();
    const [run] = (await current.author.runs(current.scope)).items;
    expect(run).toMatchObject({ state: "blocked", terminalCode: "model_unavailable", bindings: [{ modelId: "gpt-5.6-sol", reasoningEffort: "high" }] });
    expect((await current.author.byTask(current.scope)).plan?.actions.map((action) => action.state)).toEqual(["blocked", "planned"]);
    current.approvals.spec = true;
    await current.setup.database.execute(sql`UPDATE task_execution_actions SET state='succeeded' WHERE id=${plan.actions[0]!.id}`);
    current.gateway.models = [];
    expect(await failureOf(current.author.startAction({ ...current.scope, actionId: plan.actions[1]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() }))).toEqual({ code: "PRECONDITION_FAILED", reason: "model_unavailable" });
    expect((await current.author.runs(current.scope)).items[0]?.bindings[0]?.modelId).toBe("gpt-5.6-sol");
  });
});
