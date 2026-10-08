import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { taskSpecApprovals, taskSpecAttempts, taskSpecCommands, taskSpecEvents, taskSpecPackages, taskSpecStages } from "../src/infra/database/schema";
import { closeTaskFixture } from "./task-api-support";
import { finalizationRoots } from "./spec-finalization-support";
import { rejection, specCaller, specScope, specTask } from "./spec-support";
import { reviewedStage } from "./spec-recovery-support";
import { seedLoad, startWorkflow } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function observed() {
  const setup = await specTask();
  await setup.authorize(setup.readerId);
  return { setup, admin: specCaller(setup, setup.readerId), author: specCaller(setup) };
}

describe("reader and administrator observation", () => {
  it("IT-132, IT-137 and IT-142 give a not-started result with no provisioning, however often it is read", async () => {
    const { setup, admin } = await observed();
    for (let visit = 0; visit < 10; visit += 1) expect(await admin.byTask(specScope(setup))).toMatchObject({ state: "not_started", specVersion: 0, permissions: { isAuthor: false, canStart: false } });
    expect(await setup.database.select().from(taskSpecAttempts)).toHaveLength(0);
    expect(await setup.database.select().from(taskSpecCommands)).toHaveLength(0);
    expect(await setup.database.select().from(taskSpecApprovals)).toHaveLength(0);
  });

  it("IT-131 rejects a cursor from another work item and IT-133 pages 1,001 events to the last one", async () => {
    const { setup, admin } = await observed();
    const started = await startWorkflow(setup);
    const [otherTask] = await seedLoad(setup, ["failed"]);
    await setup.database.execute(`INSERT INTO task_spec_events (workflow_id, sequence, attempt_id, kind, payload, provider_event_id) SELECT '${started.workflowId}', g, '${started.attemptId}', 'agent_message', '{}'::jsonb, 'e-' || g FROM generate_series(1, 1001) g` as never);
    const { eventCursor } = await specCaller(setup).byTask(specScope(setup));
    expect(await rejection(admin.events({ ...specScope(setup, otherTask), after: eventCursor!, limit: 50 }))).toMatchObject({ code: "BAD_REQUEST", reason: "invalid_cursor" });
    let cursor: string | undefined;
    let last = 0;
    for (let pages = 0; pages < 12; pages += 1) {
      const page = await admin.events({ ...specScope(setup), ...(cursor ? { after: cursor } : {}), limit: 100 });
      last = page.items.at(-1)?.sequence ?? last;
      cursor = page.nextCursor ?? cursor;
      if (!page.hasMore) break;
    }
    expect(last).toBe(1001);
  });

  it("IT-134 and IT-144 deny the next protected page when visibility is withdrawn", async () => {
    const { setup, admin } = await observed();
    const started = await startWorkflow(setup);
    await setup.database.execute(`INSERT INTO task_spec_events (workflow_id, sequence, attempt_id, kind, payload, provider_event_id) SELECT '${started.workflowId}', g, '${started.attemptId}', 'agent_message', '{}'::jsonb, 'e-' || g FROM generate_series(1, 5) g` as never);
    const first = await admin.events({ ...specScope(setup), limit: 2 });
    await setup.database.execute(`DELETE FROM github_repository_authorizations WHERE user_id = '${setup.readerId}'` as never);
    const result = await rejection(admin.events({ ...specScope(setup), after: first.nextCursor!, limit: 2 }));
    expect(result).toMatchObject({ code: "PRECONDITION_FAILED", reason: "repository_authorization_needed" });
  });

  it("IT-138, IT-141 and IT-148 hide absent or foreign packages without starting work", async () => {
    const { setup, admin } = await observed();
    await startWorkflow(setup);
    for (const packageId of [crypto.randomUUID(), crypto.randomUUID()]) expect(await rejection(admin.package({ ...specScope(setup), packageId }))).toMatchObject({ code: "NOT_FOUND", reason: "spec_unavailable" });
    expect(await rejection(admin.document({ ...specScope(setup), packageId: crypto.randomUUID(), documentId: crypto.randomUUID(), limit: 10 }))).toMatchObject({ code: "NOT_FOUND" });
    expect(await setup.database.select().from(taskSpecAttempts)).toHaveLength(1);
  });

  it("IT-139 shows a reader the canceled state and partial package without takeover controls", async () => {
    const { setup, admin } = await observed();
    const started = await startWorkflow(setup);
    await setup.database.execute(`UPDATE task_spec_attempts SET state = 'canceled' WHERE id = '${started.attemptId}'` as never);
    await setup.database.update(taskSpecStages).set({ state: "canceled" }).where(eq(taskSpecStages.stage, "prd"));
    await setup.database.execute(`UPDATE task_spec_workflows SET state = 'canceled'` as never);
    await setup.database.insert(taskSpecPackages).values({ workflowId: started.workflowId, stage: "prd", attemptId: started.attemptId, revision: 1, manifestHash: "a".repeat(64), captureState: "partial", packageIndex: {} });
    const detail = await admin.byTask(specScope(setup));
    expect(detail).toMatchObject({ state: "canceled", permissions: { isAuthor: false, canStart: false } });
    expect((await admin.packages({ ...specScope(setup), limit: 20 })).items[0]).toMatchObject({ captureState: "partial" });
    expect(await rejection(admin.cancel({ ...specScope(setup), requestKey: crypto.randomUUID(), expectedSpecVersion: 1, attemptId: started.attemptId }))).toMatchObject({ code: "FORBIDDEN", reason: "operator_required" });
  });

  it("IT-145 and IT-147 show the administrator the current approval attribution without mutation controls", async () => {
    const context = await reviewedStage();
    await context.setup.authorize(context.setup.readerId);
    await context.caller.approve({ ...context.scope, requestKey: crypto.randomUUID(), expectedSpecVersion: await context.version(), stage: "tech_spec", packageId: context.saved.packageId, manifestHash: context.saved.manifestHash });
    await context.controller.tick();
    const admin = specCaller(context.setup, context.setup.readerId);
    const first = await admin.byTask(context.scope);
    expect(first.stages.find((stage) => stage.stage === "tech_spec")).toMatchObject({ state: "approved", approval: { approverUserId: context.setup.ownerId } });
    expect(first.permissions).toMatchObject({ isAuthor: false, canStart: false });
    expect(await admin.byTask(context.scope)).toEqual(first);
    expect((await context.setup.database.select().from(taskSpecEvents)).length).toBeGreaterThan(0);
  });
});
