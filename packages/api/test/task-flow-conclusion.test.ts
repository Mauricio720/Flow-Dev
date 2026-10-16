import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import type { PlannedAction } from "../src/application/database/dao/taskFlowDao";
import { failureOf } from "./software-support";
import { closeTaskFixture } from "./task-api-support";
import { flowFixture, type FlowFixture } from "./task-flow-fixture";
import { fixtureConnection } from "./task-flow-support";

let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

const PLAN_REVISION = 1;
const loop = (position: number, loopName: string): PlannedAction => ({ position, kind: "loop", loopName, loopVersion: "1", inputs: {}, workspace: { kind: "isolated" }, bindings: [] });

async function reviewedFlow(fixture: FlowFixture, states: { implementation: string; review: string }) {
  const { taskId, ownerId, database } = fixture.setup;
  const plan = await fixture.flow.plans.insert({ taskId, actorId: ownerId, revision: PLAN_REVISION });
  const saved = await fixture.flow.plans.replacePlanned({ planId: plan.id, revision: PLAN_REVISION, actions: [loop(1, "implement-tasks"), loop(2, "review-and-fix")] });
  const [implementation, review] = saved.actions;
  await database.execute(sql`UPDATE task_execution_actions SET state=${states.implementation} WHERE id=${implementation!.id}`);
  await database.execute(sql`UPDATE task_execution_actions SET state=${states.review} WHERE id=${review!.id}`);
  return { implementationId: implementation!.id, reviewId: review!.id };
}

describe("concluding a failed review", () => {
  it("IT-263 lets the operator conclude a failed Review, records who did it and completes the flow", async () => {
    current = await flowFixture();
    const { reviewId } = await reviewedFlow(current, { implementation: "succeeded", review: "failed" });
    const input = { ...current.scope, actionId: reviewId, expectedRevision: PLAN_REVISION };
    const concluded = await current.author.concludeReview(input);
    expect(concluded).toMatchObject({ actionId: reviewId, state: "succeeded" });
    const plan = (await current.author.byTask(current.scope)).plan!;
    expect(plan.status).toBe("completed");
    expect(plan.actions.map((action) => [action.state, action.concludedAt !== null])).toEqual([["succeeded", false], ["succeeded", true]]);
    const [row] = await current.setup.database.execute(sql`SELECT concluded_by FROM task_execution_actions WHERE id=${reviewId}`);
    expect(row?.concluded_by).toBe(current.setup.ownerId);
    const replay = await current.author.concludeReview(input);
    expect(replay.concludedAt).toEqual(concluded.concludedAt);
  });

  it("IT-264 refuses readers, other actions, stale revisions and a Review that did not stop", async () => {
    current = await flowFixture();
    const { implementationId, reviewId } = await reviewedFlow(current, { implementation: "succeeded", review: "planned" });
    const input = { ...current.scope, actionId: reviewId, expectedRevision: PLAN_REVISION };
    expect(await failureOf(current.reader.concludeReview(input))).toMatchObject({ code: "FORBIDDEN" });
    expect(await failureOf(current.author.concludeReview({ ...input, actionId: implementationId }))).toMatchObject({ reason: "action_unavailable" });
    expect(await failureOf(current.author.concludeReview(input))).toMatchObject({ reason: "action_unavailable" });
    await current.setup.database.execute(sql`UPDATE task_execution_actions SET state='failed' WHERE id=${reviewId}`);
    expect(await failureOf(current.author.concludeReview({ ...input, expectedRevision: PLAN_REVISION + 1 }))).toMatchObject({ code: "CONFLICT", reason: "plan_version_changed" });
    expect((await current.author.byTask(current.scope)).plan!.actions[1]).toMatchObject({ state: "failed", concludedAt: null });
  });

  it("IT-265 refuses to conclude the Review while the implementation has not succeeded", async () => {
    current = await flowFixture();
    const { reviewId } = await reviewedFlow(current, { implementation: "failed", review: "failed" });
    expect(await failureOf(current.author.concludeReview({ ...current.scope, actionId: reviewId, expectedRevision: PLAN_REVISION }))).toMatchObject({ reason: "stage_prerequisite" });
  });
});

async function directFlow(fixture: FlowFixture, terminalCode: string) {
  const { taskId, ownerId, database } = fixture.setup;
  const connectionId = await fixtureConnection(database);
  const plan = await fixture.flow.plans.insert({ taskId, actorId: ownerId, revision: PLAN_REVISION });
  const direct: PlannedAction = { position: 1, kind: "direct_execute", loopName: null, loopVersion: null, inputs: {}, workspace: { kind: "isolated" }, bindings: [{ role: "main", connectionId, providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: "high" }] };
  const [action] = (await fixture.flow.plans.replacePlanned({ planId: plan.id, revision: PLAN_REVISION, actions: [direct] })).actions;
  const run = await fixture.flow.runs.insert({ actionId: action!.id, taskId, snapshot: { kind: "direct_execute" }, worktreeId: null, connectionIds: [connectionId], isWrite: true, idempotencyKey: crypto.randomUUID(), requestedBy: ownerId });
  await database.execute(sql`UPDATE task_execution_runs SET state='blocked', terminal_code=${terminalCode}, finished_at=now() WHERE id=${run.id}`);
  await database.execute(sql`UPDATE task_execution_actions SET state='blocked' WHERE id=${action!.id}`);
  return { actionId: action!.id, input: { ...fixture.scope, actionId: action!.id, expectedRevision: PLAN_REVISION } };
}

describe("accepting a partial direct execution", () => {
  it("lets the operator accept a direct execution that ended as partial and records who did it", async () => {
    current = await flowFixture();
    const { actionId, input } = await directFlow(current, "direct_partial");
    expect(await failureOf(current.reader.acceptPartialDirect(input))).toMatchObject({ code: "FORBIDDEN" });
    const accepted = await current.author.acceptPartialDirect(input);
    expect(accepted).toMatchObject({ actionId, state: "succeeded" });
    expect((await current.author.byTask(current.scope)).plan!.actions[0]).toMatchObject({ state: "succeeded", concludedAt: expect.anything() });
    expect((await current.author.acceptPartialDirect(input)).concludedAt).toEqual(accepted.concludedAt);
  });

  it("refuses a direct execution that stopped for any reason other than a partial result", async () => {
    current = await flowFixture();
    const { input } = await directFlow(current, "direct_blocked");
    expect(await failureOf(current.author.acceptPartialDirect(input))).toMatchObject({ reason: "action_unavailable" });
    expect(await failureOf(current.author.concludeReview(input))).toMatchObject({ reason: "action_unavailable" });
  });
});
