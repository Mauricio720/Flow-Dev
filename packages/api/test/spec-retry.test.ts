import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { taskSpecAttempts } from "../src/infra/database/schema";
import { SpecLifecycleService } from "../src/application/services/spec/specLifecycleService";
import { TaskError } from "../src/application/services/tasks/taskErrors";
import { DrizzleTaskSpecDao } from "../src/infra/database/dao/spec/drizzleTaskSpecDao";
import { TaskSpecController } from "../src/controllers/taskSpecController";
import { createTaskSpecRouter } from "../src/routers/taskSpec";
import { closeTaskFixture } from "./task-api-support";
import { finalizationRoots } from "./spec-finalization-support";
import { httpProcedure } from "./spec-calls";
import { rejection } from "./spec-support";
import { attempts, failAdjustment, reviewedStage, stageRow, type Reviewed } from "./spec-recovery-support";
import { seedInteraction, seedLoad } from "./spec-seed";

beforeEach(() => vi.stubEnv("TASK_CURSOR_SECRET", "spec-test-cursor-secret"));
afterEach(async () => { await closeTaskFixture(); await Promise.all(finalizationRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

const callerWith = (context: Reviewed, admission: { assertReady(): Promise<void> }) => {
  const dao = new DrizzleTaskSpecDao(context.setup.database);
  const controller = new TaskSpecController(context.setup.taskDao, dao, new SpecLifecycleService(dao, admission), context.setup.repositoryAccess);
  return createTaskSpecRouter(controller).createCaller({ principal: { userId: context.setup.ownerId, sessionId: context.setup.sessionId }, requestId: "retry" });
};
async function failedStage() {
  const context = await reviewedStage();
  const { receipt } = await failAdjustment(context);
  return { context, failedId: receipt.attemptId! };
}

describe("taskSpec.retry", () => {
  it("IT-163 and IT-117 accept one new attempt for a confirmed failure and replay the original receipt", async () => {
    const { context, failedId } = await failedStage();
    const input = await context.retry(failedId);
    const receipt = await context.caller.retry(input);
    expect(receipt).toMatchObject({ status: "accepted" });
    expect(await context.caller.retry(input)).toEqual(receipt);
    expect((await attempts(context.setup)).filter((attempt) => attempt.kind === "retry")).toHaveLength(1);
    const retried = (await attempts(context.setup)).find((attempt) => attempt.id === receipt.attemptId)!;
    expect(retried).toMatchObject({ sourceAttemptId: failedId, state: "queued" });
    expect(retried.input).toMatchObject({ adjustment: "Clarify retention", reviewedPackageId: context.saved.packageId, retryContext: { executablePermissions: [] } });
  });
  it("IT-112 and IT-075 retain saved answers and disclose answers that were never saved", async () => {
    const { context, failedId } = await failedStage();
    const answered = await seedInteraction(context.setup, { workflowId: context.started.workflowId, attemptId: failedId }, { attemptState: "failed" });
    await context.setup.database.execute(`UPDATE task_spec_interactions SET status = 'resolved', response = '{"value":"Thirty days"}'::jsonb WHERE id = '${answered.id}'` as never);
    await seedInteraction(context.setup, { workflowId: context.started.workflowId, attemptId: failedId }, { attemptState: "failed", description: "Q2 nunca respondida" });
    const receipt = await context.caller.retry(await context.retry(failedId));
    const input = (await attempts(context.setup)).find((attempt) => attempt.id === receipt.attemptId)!.input as { retryContext: { answers: { answer: string }[]; unavailable: { question: string }[] } };
    expect(input.retryContext.answers).toEqual([expect.objectContaining({ answer: "Thirty days" })]);
    expect(input.retryContext.unavailable).toEqual([expect.objectContaining({ question: "Q2 nunca respondida" })]);
  });
  it("IT-111 conflicts for a superseded attempt and IT-108 and IT-185 report an unsettled stop as outcome_unknown", async () => {
    const { context, failedId } = await failedStage();
    await context.setup.database.execute(`UPDATE task_spec_attempts SET state = 'stopping' WHERE id = '${failedId}'` as never);
    expect(await rejection(context.caller.retry(await context.retry(failedId)))).toMatchObject({ code: "CONFLICT", reason: "outcome_unknown" });
    await context.setup.database.update(taskSpecAttempts).set({ state: "failed" }).where(eq(taskSpecAttempts.id, failedId));
    expect(await rejection(context.caller.retry(await context.retry(context.started.attemptId)))).toMatchObject({ code: "CONFLICT", reason: "spec_conflict" });
  });
  it("IT-115 admits one retry when two race for the same failed attempt and IT-184 blocks a later one", async () => {
    const { context, failedId } = await failedStage();
    const results = await Promise.allSettled([context.caller.retry(await context.retry(failedId)), context.caller.retry(await context.retry(failedId))]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await attempts(context.setup)).filter((attempt) => attempt.kind === "retry")).toHaveLength(1);
    expect(await rejection(context.caller.retry(await context.retry(failedId)))).toMatchObject({ code: "CONFLICT" });
  });
  it("IT-116 finds the original attempt through submission when the response was lost", async () => {
    const { context, failedId } = await failedStage();
    const input = await context.retry(failedId);
    const receipt = await context.caller.retry(input);
    expect(await context.caller.submission({ ...context.scope, action: "spec.retry", requestKey: input.requestKey })).toEqual({ status: "known", receipt });
  });
  it("IT-118 rejects a payload that tries to change the stage", async () => {
    const { context, failedId } = await failedStage();
    expect(await httpProcedure(context.setup, "retry", await context.retry(failedId, { stage: "prd" }))).toEqual({ status: 400, reason: "invalid_input" });
    expect((await stageRow(context.setup)).stage).toBe("tech_spec");
  });
  it("IT-180, IT-181 and IT-182 block retry for an unconfigured or incompatible runtime and a missing workspace", async () => {
    const { context, failedId } = await failedStage();
    const unconfigured = callerWith(context, { assertReady: async () => { throw new TaskError("runtime_unconfigured"); } });
    expect(await rejection(unconfigured.retry(await context.retry(failedId)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "runtime_unconfigured" });
    const incompatible = callerWith(context, { assertReady: async () => { throw new TaskError("runtime_incompatible"); } });
    expect(await rejection(incompatible.retry(await context.retry(failedId)))).toMatchObject({ reason: "runtime_incompatible" });
    await context.setup.database.execute(`UPDATE task_spec_workflows SET workspace_id = NULL` as never);
    await context.setup.database.execute(`DELETE FROM task_spec_finalizations` as never);
    await context.setup.database.execute(`DELETE FROM task_spec_workspaces` as never);
    expect(await rejection(context.caller.retry(await context.retry(failedId)))).toMatchObject({ code: "PRECONDITION_FAILED", reason: "workspace_unavailable" });
  });
  it("IT-183 returns spec_capacity for a retry and an adjustment when the queue is full", async () => {
    const { context, failedId } = await failedStage();
    await seedLoad(context.setup, [...Array(2).fill("running"), ...Array(20).fill("queued")]);
    expect(await rejection(context.caller.retry(await context.retry(failedId)))).toMatchObject({ code: "TOO_MANY_REQUESTS", reason: "spec_capacity", retryAfterSeconds: 30 });
    await context.setup.database.execute(`UPDATE task_spec_stages SET state = 'review' WHERE stage = 'tech_spec'` as never);
    expect(await rejection(context.caller.adjust(await context.adjust()))).toMatchObject({ code: "TOO_MANY_REQUESTS", reason: "spec_capacity" });
  });
});
