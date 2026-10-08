import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { closeTaskFixture } from "./task-api-support";
import { failureOf } from "./software-support";
import { flowFixture, flowKey, skillAction, type FlowFixture } from "./task-flow-fixture";

let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

describe("retrying with a replacement runtime", () => {
  it("keeps the plan and first attempt intact while the new snapshot uses the chosen connection", async () => {
    current = await flowFixture();
    const original = await current.connection();
    const replacement = await current.connection();
    await current.author.savePlan({ ...current.scope, actions: [skillAction(original)], expectedRevision: 0, idempotencyKey: flowKey() });
    const plan = (await current.author.byTask(current.scope)).plan!;
    const actionId = plan.actions[0]!.id;
    const first = await current.author.startAction({ ...current.scope, actionId, expectedRevision: plan.revision, idempotencyKey: flowKey() });
    await current.setup.database.execute(sql`UPDATE task_execution_runs SET state='failed', terminal_code='failed' WHERE id=${first.runId}`);
    await current.setup.database.execute(sql`UPDATE task_execution_actions SET state='failed' WHERE id=${actionId}`);
    const runtimeBindings = { main: { connectionId: replacement, providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: "high" } };
    const retry = (idempotencyKey = flowKey()) => current!.author.retryAction({ ...current!.scope, actionId, expectedRevision: plan.revision, idempotencyKey, runtimeBindings });
    const key = flowKey();
    const second = await retry(key);
    expect(second.runId).not.toBe(first.runId);
    expect((await current.flow.runs.find(second.runId))?.snapshot).toMatchObject({ runtime: runtimeBindings.main });
    expect((await current.flow.runs.find(first.runId))?.snapshot).toMatchObject({ runtime: { connectionId: original } });
    expect((await current.author.byTask(current.scope)).plan?.actions[0]?.bindings[0]?.connectionId).toBe(original);
    expect((await retry(key)).runId).toBe(second.runId);
    const changed = { ...runtimeBindings, main: { ...runtimeBindings.main, connectionId: original } };
    expect(await failureOf(current.author.retryAction({ ...current.scope, actionId, expectedRevision: plan.revision, idempotencyKey: key, runtimeBindings: changed }))).toMatchObject({ reason: "idempotency_key_reused" });
  });
});
