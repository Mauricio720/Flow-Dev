import { afterEach, describe, expect, it } from "vitest";
import { failureOf } from "./software-support";
import { flowFixture, flowKey, skillAction, type FlowFixture } from "./task-flow-fixture";
import { closeTaskFixture } from "./task-api-support";

let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

const save = (fixture: FlowFixture, actions: unknown[], expectedRevision = 0, idempotencyKey = flowKey()) => fixture.author.savePlan({ ...fixture.scope, actions: actions as never, expectedRevision, idempotencyKey });

describe("task flow plan", () => {
  it("IT-043, IT-045 and IT-059 list ready choices, explain absence and keep planning readable", async () => {
    current = await flowFixture();
    const empty = await current.author.options(current.scope);
    expect(empty).toMatchObject({ planningAvailable: true, startReason: "no_ready_connection", connections: [], viewerCanOperate: true });
    expect(await current.author.byTask(current.scope)).toMatchObject({ flow: "none", plan: null });
    const connectionId = await current.connection();
    const options = await current.author.options(current.scope);
    expect(options.connections[0]).toMatchObject({ id: connectionId, ready: true, models: [{ modelId: "gpt-5.6-sol", reasoningChoices: [null, "low", "high"] }] });
    expect(options.startReason).toBeNull();
    expect(options.actions).toEqual([{ kind: "create_spec", available: true }, { kind: "create_tasks", available: false }]);
  });

  it("IT-044 rejects unknown profiles, mismatched providers and stale models with the current choices", async () => {
    current = await flowFixture();
    const connectionId = await current.connection();
    expect(await failureOf(save(current, [skillAction(flowKey())]))).toEqual({ code: "PRECONDITION_FAILED", reason: "connection_unavailable" });
    expect(await failureOf(save(current, [skillAction(connectionId, { providerId: "claude" })]))).toMatchObject({ reason: "invalid_input" });
    current.gateway.models = [{ ...current.gateway.models[0]!, selectable: false, unselectableReason: "catalog_stale", reasoningChoices: [] }];
    current.gateway.validateChoice = async () => ({ ok: false, code: "catalog_stale", release: "v0.3.0-beta.29" });
    expect(await failureOf(save(current, [skillAction(connectionId)]))).toEqual({ code: "PRECONDITION_FAILED", reason: "catalog_stale" });
    expect(await current.author.byTask(current.scope)).toMatchObject({ plan: null });
  });

  it("IT-046 denies readers, non-author administrators and expired sessions", async () => {
    current = await flowFixture();
    const connectionId = await current.connection();
    const plan = { ...current.scope, actions: [skillAction(connectionId)] as never, expectedRevision: 0, idempotencyKey: flowKey() };
    expect(await failureOf(current.reader.savePlan(plan))).toMatchObject({ code: "FORBIDDEN", reason: "operator_required" });
    expect(await failureOf(current.anonymous.savePlan(plan))).toMatchObject({ code: "UNAUTHORIZED" });
    expect(await current.reader.options(current.scope)).toMatchObject({ viewerCanOperate: false, planningAvailable: false, connections: [] });
  });

  it("IT-047, IT-048 and UT-016 apply CAS, replay a lost response and never start a run", async () => {
    current = await flowFixture();
    const connectionId = await current.connection();
    const key = flowKey();
    const first = await save(current, [skillAction(connectionId)], 0, key);
    expect(first).toEqual({ revision: 1, state: "planned", runId: null });
    expect(await save(current, [skillAction(connectionId)], 0, key)).toEqual(first);
    expect(await failureOf(save(current, [skillAction(connectionId, { reasoningEffort: "low" })], 0, flowKey()))).toEqual({ code: "CONFLICT", reason: "plan_version_changed" });
    expect(await failureOf(save(current, [skillAction(connectionId, { reasoningEffort: null })], 0, key))).toMatchObject({ reason: "idempotency_key_reused" });
    const second = await save(current, [skillAction(connectionId, { reasoningEffort: "low" })], 1);
    expect(second.revision).toBe(2);
    const view = await current.author.byTask(current.scope);
    expect(view.plan?.actions).toHaveLength(1);
    expect(view.plan?.actions[0]?.bindings[0]).toMatchObject({ reasoningEffort: "low", connectionAvailable: true });
    expect((await current.author.runs(current.scope)).items).toEqual([]);
  });

  it("persists the selected artifact language and defaults older clients to pt-BR", async () => {
    current = await flowFixture();
    const connectionId = await current.connection();
    await save(current, [{ ...skillAction(connectionId), language: "en" }]);
    expect((await current.author.byTask(current.scope)).plan?.actions[0]?.inputs).toEqual({ language: "en" });
  });

  it("IT-049 refuses unplannable tasks and changes to a selection whose run already started", async () => {
    current = await flowFixture();
    const connectionId = await current.connection();
    await save(current, [skillAction(connectionId)]);
    const plan = (await current.author.byTask(current.scope)).plan!;
    await current.author.startAction({ ...current.scope, actionId: plan.actions[0]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() });
    expect(await failureOf(save(current, [skillAction(connectionId, { reasoningEffort: "low" })], plan.revision))).toEqual({ code: "CONFLICT", reason: "action_already_started" });
    await current.setup.database.execute((await import("drizzle-orm")).sql`UPDATE tasks SET status='draft_ready', planning_status=NULL WHERE id=${current.scope.taskId}`);
    expect(await failureOf(save(current, [skillAction(connectionId)], plan.revision))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "publication_required" });
  });

  it("rejects malformed plans before any write", async () => {
    current = await flowFixture();
    const connectionId = await current.connection();
    expect(await failureOf(save(current, []))).toMatchObject({ code: "BAD_REQUEST" });
    expect(await failureOf(save(current, [skillAction(connectionId), skillAction(connectionId)]))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_input" });
    expect(await failureOf(save(current, [{ ...skillAction(connectionId), runtime: { connectionId, providerId: "codex", modelId: "", reasoningEffort: null } }]))).toMatchObject({ code: "BAD_REQUEST" });
    expect(await failureOf(save(current, [{ kind: "loop", loopName: "implement-tasks", loopVersion: "1", inputs: {}, runtimeBindings: {}, workspace: { kind: "isolated" } }]))).toMatchObject({ reason: "loop_unavailable" });
  });
});
