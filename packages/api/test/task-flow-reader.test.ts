import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { failureOf } from "./software-support";
import { closeTaskFixture } from "./task-api-support";
import { flowFixture, flowKey, skillAction, type FlowFixture } from "./task-flow-fixture";

const PERSONAL_READ_CACHE_MS = 5200;
let current: FlowFixture | undefined;
afterEach(async () => { await closeTaskFixture(); current = undefined; });

async function runWithHistory(fixture: FlowFixture) {
  const connectionId = await fixture.connection();
  await fixture.author.savePlan({ ...fixture.scope, actions: [skillAction(connectionId)], expectedRevision: 0, idempotencyKey: flowKey() });
  const plan = (await fixture.author.byTask(fixture.scope)).plan!;
  await fixture.author.startAction({ ...fixture.scope, actionId: plan.actions[0]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() });
  return { connectionId, plan };
}

describe("task flow reader visibility", () => {
  it("IT-064, IT-065 and IT-069 show safe stable provenance for renamed, removed and hostile labels", async () => {
    current = await flowFixture();
    const { connectionId } = await runWithHistory(current);
    const hostile = "<img src=x onerror=SPEC_PROVIDER=evil>";
    await current.setup.database.execute(sql`UPDATE software_connections SET label=${hostile}, auth_state='disconnected' WHERE id=${connectionId}`);
    const runs = await current.reader.runs(current.scope);
    expect(runs.items[0]?.bindings[0]).toMatchObject({ connectionId, connectionAvailable: false, providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: "high" });
    expect(runs.items[0]?.bindings[0]?.connectionLabel).toMatch(/^Codex /);
    const serialized = JSON.stringify([runs, await current.reader.byTask(current.scope)]);
    expect(serialized).not.toMatch(/accountFingerprint|auth\.json|token|mountPath|SPEC_PROVIDER=evil\b.*mount/i);
  });

  it("IT-066 and IT-068 show an honest not-selected state and refresh to the current selection without actions", async () => {
    current = await flowFixture();
    expect(await current.reader.byTask(current.scope)).toMatchObject({ flow: "none", plan: null, activeRunId: null });
    expect(await current.reader.runs(current.scope)).toEqual({ items: [], nextCursor: null });
    const connectionId = await current.connection();
    await current.author.savePlan({ ...current.scope, actions: [skillAction(connectionId)], expectedRevision: 0, idempotencyKey: flowKey() });
    await current.author.savePlan({ ...current.scope, actions: [skillAction(connectionId, { reasoningEffort: "low" })], expectedRevision: 1, idempotencyKey: flowKey() });
    expect((await current.reader.byTask(current.scope)).plan).toMatchObject({ revision: 2, actions: [{ bindings: [{ reasoningEffort: "low" }] }] });
    expect(await failureOf(current.reader.startAction({ ...current.scope, actionId: flowKey(), expectedRevision: 2, idempotencyKey: flowKey() }))).toMatchObject({ code: "FORBIDDEN" });
  });

  it("IT-060 and IT-067 stop reads once task access is revoked and expose no Software details", async () => {
    current = await flowFixture();
    await runWithHistory(current);
    await current.setup.database.execute(sql`DELETE FROM project_assignments`);
    await current.setup.database.execute(sql`DELETE FROM admin_designations WHERE github_user_id = '88'`);
    await new Promise((resolve) => setTimeout(resolve, PERSONAL_READ_CACHE_MS));
    expect(await failureOf(current.author.byTask(current.scope))).toMatchObject({ code: "NOT_FOUND", reason: "task_unavailable" });
    expect(await failureOf(current.author.runs(current.scope))).toMatchObject({ code: "NOT_FOUND" });
    expect(await failureOf(current.anonymous.byTask(current.scope))).toMatchObject({ code: "UNAUTHORIZED" });
    const options = await current.reader.options(current.scope);
    expect(options).toMatchObject({ connections: [], viewerCanOperate: false });
  });

  it("IT-063 reports each blocked task while approved content stays available", async () => {
    current = await flowFixture();
    const { plan } = await runWithHistory(current);
    await current.setup.database.execute(sql`UPDATE task_execution_runs SET state='failed'`);
    await current.setup.database.execute(sql`UPDATE task_execution_actions SET state='planned' WHERE plan_id=${plan.id}`);
    current.layers.host = { state: "blocked", reasonCode: "rootless_isolation_unavailable" };
    const result = await failureOf(current.author.startAction({ ...current.scope, actionId: plan.actions[0]!.id, expectedRevision: plan.revision, idempotencyKey: flowKey() }));
    expect(result).toEqual({ code: "PRECONDITION_FAILED", reason: "runtime_incompatible" });
    expect(await current.author.options(current.scope)).toMatchObject({ startReason: "host_not_ready", planningAvailable: true });
    expect((await current.author.byTask(current.scope)).plan?.actions).toHaveLength(1);
  });
});
