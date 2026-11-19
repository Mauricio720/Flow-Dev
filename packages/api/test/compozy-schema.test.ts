import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { taskCompozyExecutions, taskCompozySpecReviews, taskOperations, taskPlanningDecisions, taskPublicationAttempts, tasks } from "../src/infra/database/schema";
import { applyMigration, testDatabase } from "./database";
import { closeTaskFixture, seedTask, taskFixture } from "./task-api-support";

afterEach(closeTaskFixture);

const assessment = { recommendedRoute: "direct_execution", selectedRoute: "direct_execution", decisionSource: "AI", complexity: "low", summary: "Resumo", reasons: ["Motivo"], uncertainties: [] };

async function approvedDecision() {
  const setup = await taskFixture();
  await seedTask(setup);
  const [publish, plan, attempt] = [randomUUID(), randomUUID(), randomUUID()];
  await setup.database.insert(taskOperations).values({ id: publish, taskId: setup.taskId, kind: "publish", state: "succeeded", initiatedSessionId: setup.sessionId, baseTaskVersion: 7 });
  await setup.database.insert(taskPublicationAttempts).values({ id: attempt, taskId: setup.taskId, operationId: publish, revisionId: setup.revisionId, publisherUserId: setup.ownerId, publisherGithubId: "88", repositoryId: "202", repositoryNodeId: "R_202", approvedOwner: "acme", approvedName: "private", previewHash: "h", titleSnapshot: "Título", bodySnapshot: "Corpo", approvalSessionId: setup.sessionId, outcome: "created", issueId: "4101", issueNodeId: "I_41", issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", issueCreatedAt: new Date() });
  await setup.database.update(tasks).set({ status: "published" }).where(eq(tasks.id, setup.taskId));
  await setup.database.insert(taskOperations).values({ id: plan, taskId: setup.taskId, kind: "plan", state: "running", initiatedSessionId: setup.sessionId, baseTaskVersion: 7, publicationAttemptId: attempt, inputHash: "a".repeat(64) });
  await setup.database.update(tasks).set({ planningStatus: "in_progress", planningOperationId: plan }).where(eq(tasks.id, setup.taskId));
  const [decision] = await setup.database.insert(taskPlanningDecisions).values({ taskId: setup.taskId, publicationAttemptId: attempt, operationId: plan, executionId: randomUUID(), ...assessment } as never).returning();
  return { setup, decisionId: decision!.id };
}

function execution(context: Awaited<ReturnType<typeof approvedDecision>>, overrides: Partial<typeof taskCompozyExecutions.$inferInsert> = {}) {
  return context.setup.database.insert(taskCompozyExecutions).values({ taskId: context.setup.taskId, planningDecisionId: context.decisionId, route: "direct_execution", state: "in_progress", attempt: 1, idempotencyKey: randomUUID(), compozyWorkspaceId: "ws_1", branch: "flow-dev/APP-1-12345678", startedBy: context.setup.ownerId, ...overrides }).returning();
}

describe("0045 compozy execution schema", () => {
  it("keeps one active execution per task and unique attempts and requests", async () => {
    const context = await approvedDecision();
    const [first] = await execution(context);
    await expect(execution(context, { attempt: 2 })).rejects.toThrow();
    await expect(execution(context, { attempt: 2, state: "failed", idempotencyKey: first!.idempotencyKey })).rejects.toThrow();
    await expect(execution(context, { state: "failed" })).rejects.toThrow();
    await expect(execution(context, { attempt: 2, state: "failed" })).resolves.toHaveLength(1);
    await expect(execution(context, { attempt: 3, state: "running" })).rejects.toThrow();
  });

  it("records one spec decision per round with a bounded note", async () => {
    const context = await approvedDecision();
    const [row] = await execution(context, { route: "tech_spec", state: "spec_review", specRound: 1 });
    const review = (overrides: Partial<typeof taskCompozySpecReviews.$inferInsert> = {}) => context.setup.database.insert(taskCompozySpecReviews).values({ executionId: row!.id, round: 1, decision: "approve", actorId: context.setup.ownerId, idempotencyKey: randomUUID(), ...overrides });
    await expect(review({ decision: "request_changes" })).rejects.toThrow();
    await expect(review({ decision: "request_changes", note: "x".repeat(4001) })).rejects.toThrow();
    await review({ decision: "request_changes", note: "Inclua a regra de CEP." });
    await expect(review()).rejects.toThrow();
  });

  it("rolls back and reapplies cleanly", async () => {
    const db = await testDatabase();
    const tableNames = () => db.client`SELECT to_regclass('task_compozy_executions')::text AS executions, to_regclass('task_compozy_spec_reviews')::text AS reviews, to_regclass('project_compozy_bindings')::text AS bindings`;
    try {
      await applyMigration(db.client, "0045_compozy_execution_rollback");
      expect(await tableNames()).toEqual([{ executions: null, reviews: null, bindings: null }]);
      await applyMigration(db.client, "0045_compozy_execution");
      expect(await tableNames()).toEqual([{ executions: "task_compozy_executions", reviews: "task_compozy_spec_reviews", bindings: "project_compozy_bindings" }]);
    } finally { await db.close(); }
  });
});
