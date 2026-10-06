import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskOperations, taskPlanningDecisions, taskPublicationAttempts, tasks } from "../src/infra/database/schema";
import { closeTaskFixture, seedTask, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

const PLAN_OPERATION_ID = "00000000-0000-4000-8000-0000000000a1";
const PUBLISH_OPERATION_ID = "00000000-0000-4000-8000-0000000000a2";
const ATTEMPT_ID = "00000000-0000-4000-8000-0000000000a3";
const INPUT_HASH = "a".repeat(64);
const assessment = { recommendedRoute: "tech_spec", selectedRoute: "tech_spec", decisionSource: "AI", complexity: "medium", summary: "Resumo", reasons: ["Motivo"], uncertainties: [] };

async function publishedTask(outcome = "created") {
  const setup = await taskFixture();
  await seedTask(setup);
  await setup.database.insert(taskOperations).values({ id: PUBLISH_OPERATION_ID, taskId: setup.taskId, kind: "publish", state: "succeeded", initiatedSessionId: setup.sessionId, baseTaskVersion: 7 });
  await setup.database.insert(taskPublicationAttempts).values({ id: ATTEMPT_ID, taskId: setup.taskId, operationId: PUBLISH_OPERATION_ID, revisionId: setup.revisionId, publisherUserId: setup.ownerId, publisherGithubId: "88", repositoryId: "202", repositoryNodeId: "R_202", approvedOwner: "acme", approvedName: "private", previewHash: "h", titleSnapshot: "Título", bodySnapshot: "Corpo", approvalSessionId: setup.sessionId, outcome, issueId: "4101", issueNodeId: "I_41", issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", issueCreatedAt: new Date() });
  await setup.database.update(tasks).set({ status: "published" }).where(eq(tasks.id, setup.taskId));
  return setup;
}

async function queuePlan(setup: Awaited<ReturnType<typeof publishedTask>>, id = PLAN_OPERATION_ID) {
  await setup.database.insert(taskOperations).values({ id, taskId: setup.taskId, kind: "plan", state: "running", initiatedSessionId: setup.sessionId, baseTaskVersion: 7, publicationAttemptId: ATTEMPT_ID, inputHash: INPUT_HASH });
  await setup.database.update(tasks).set({ planningStatus: "in_progress", planningOperationId: id }).where(eq(tasks.id, setup.taskId));
}

async function insertDecision(setup: Awaited<ReturnType<typeof publishedTask>>, overrides: Record<string, unknown> = {}) {
  await setup.database.insert(taskPlanningDecisions).values({ taskId: setup.taskId, publicationAttemptId: ATTEMPT_ID, operationId: PLAN_OPERATION_ID, executionId: crypto.randomUUID(), ...assessment, ...overrides } as never);
}

const sqlText = (error: unknown) => String((error as { cause?: { message?: string } }).cause?.message ?? error);

describe("planning persistence with PostgreSQL", () => {
  it("IT-001 keeps the historical published task and publication unchanged", async () => {
    const setup = await publishedTask();
    const before = { task: await setup.database.select().from(tasks), publication: await setup.database.select().from(taskPublicationAttempts) };
    expect(before.task[0]).toMatchObject({ status: "published", planningStatus: null, planningOperationId: null });
    await queuePlan(setup);
    const after = { task: await setup.database.select().from(tasks), publication: await setup.database.select().from(taskPublicationAttempts) };
    expect(after.publication).toEqual(before.publication);
    expect(after.task[0]).toMatchObject({ id: before.task[0]?.id, authorUserId: before.task[0]?.authorUserId, repositoryId: "202", status: "published" });
  });

  it("IT-047 rejects a second decision and cross-task associations", async () => {
    const setup = await publishedTask();
    await queuePlan(setup);
    await insertDecision(setup);
    await expect(insertDecision(setup)).rejects.toThrow();
    await expect(insertDecision(setup, { operationId: crypto.randomUUID() })).rejects.toThrow();
    await expect(insertDecision(setup, { publicationAttemptId: crypto.randomUUID() })).rejects.toThrow();
  });

  it("IT-048 rejects changes to the original review assessment", async () => {
    const setup = await publishedTask();
    await queuePlan(setup);
    await insertDecision(setup);
    for (const change of [{ recommendedRoute: "prd", selectedRoute: "prd" }, { reasons: ["Outro"] }, { executionId: crypto.randomUUID() }, { summary: "Outro" }]) {
      await expect(setup.database.update(taskPlanningDecisions).set(change).where(eq(taskPlanningDecisions.taskId, setup.taskId))).rejects.toThrow();
    }
  });

  it("IT-049 freezes an approved decision", async () => {
    const setup = await publishedTask();
    await queuePlan(setup);
    await insertDecision(setup);
    await setup.database.update(taskPlanningDecisions).set({ status: "approved", approvedByUserId: setup.ownerId, approvedAt: new Date() }).where(eq(taskPlanningDecisions.taskId, setup.taskId));
    await expect(setup.database.update(taskPlanningDecisions).set({ selectedRoute: "prd", decisionSource: "HUMAN_OVERRIDE", version: 2 }).where(eq(taskPlanningDecisions.taskId, setup.taskId))).rejects.toThrow();
    await expect(setup.database.update(taskPlanningDecisions).set({ approvedAt: new Date() }).where(eq(taskPlanningDecisions.taskId, setup.taskId))).rejects.toThrow();
    await expect(setup.database.delete(taskPlanningDecisions).where(eq(taskPlanningDecisions.taskId, setup.taskId))).rejects.toThrow();
  });

  it("IT-050 rejects invalid planning schema states", async () => {
    const setup = await taskFixture();
    await seedTask(setup);
    await expect(setup.database.update(tasks).set({ planningStatus: "review" }).where(eq(tasks.id, setup.taskId))).rejects.toThrow();
    const published = await publishedTask();
    await queuePlan(published);
    await expect(insertDecision(published, { selectedRoute: "prd" })).rejects.toThrow();
    await expect(insertDecision(published, { recommendedRoute: "unknown", selectedRoute: "unknown" })).rejects.toThrow();
    await expect(insertDecision(published, { approvedByUserId: published.ownerId })).rejects.toThrow();
    await expect(insertDecision(published, { status: "approved" })).rejects.toThrow();
  });

  it("IT-078 rejects uncertain publications and non-plan producing operations", async () => {
    const uncertain = await publishedTask("uncertain");
    expect(sqlText(await queuePlan(uncertain).catch((error) => error))).toMatch(/confirmed publication/);
    await closeTaskFixture();
    const setup = await publishedTask();
    await setup.database.insert(taskOperations).values({ id: PLAN_OPERATION_ID, taskId: setup.taskId, kind: "generate", state: "succeeded", initiatedSessionId: setup.sessionId, baseTaskVersion: 7 });
    await setup.database.update(tasks).set({ planningStatus: "in_progress", planningOperationId: PLAN_OPERATION_ID }).where(eq(tasks.id, setup.taskId));
    expect(sqlText(await insertDecision(setup).catch((error) => error))).toMatch(/planning operation/);
  });
});
