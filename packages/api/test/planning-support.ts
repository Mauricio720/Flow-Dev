import { expect } from "vitest";
import { eq } from "drizzle-orm";
import { taskDraftRevisions, taskOperations, taskPlanningDecisions, taskPublicationAttempts, tasks } from "../src/infra/database/schema";
import { DrizzleTaskPlanningDao } from "../src/infra/database/dao/tasks/drizzleTaskPlanningDao";
import type { TaskPlanningDao } from "../src/application/database/dao/taskPlanningDao";
import { PlanningService } from "../src/application/services/tasks/planningService";
import { TaskPlanningController } from "../src/controllers/taskPlanningController";
import { TasksController } from "../src/controllers/tasksController";
import { createTasksRouter } from "../src/routers/tasks";
import { TaskError } from "../src/application/services/tasks/taskErrors";
import { seedTask, taskFixture } from "./task-api-support";
import { operatorAuthorization, operatorWorld, seedOperatorClaim } from "./operator-support";

export const PLAN_OPERATION_ID = "00000000-0000-4000-8000-0000000000a1";
export const PUBLISH_OPERATION_ID = "00000000-0000-4000-8000-0000000000a2";
export const ATTEMPT_ID = "00000000-0000-4000-8000-0000000000a3";
export const INPUT_HASH = "a".repeat(64);
export const REVIEW_ASSESSMENT = { recommendedRoute: "tech_spec", selectedRoute: "tech_spec", decisionSource: "AI", complexity: "medium", summary: "Resumo", reasons: ["Motivo"], uncertainties: ["Falta contexto"] };
export type PlanningSetup = Awaited<ReturnType<typeof publishedTask>>;

export async function publishedTask(outcome = "created", version = 7, bodySnapshot = "Corpo") {
  const setup = await taskFixture();
  await seedTask(setup);
  await setup.database.insert(taskOperations).values({ id: PUBLISH_OPERATION_ID, taskId: setup.taskId, kind: "publish", state: "succeeded", initiatedSessionId: setup.sessionId, baseTaskVersion: version });
  await setup.database.insert(taskPublicationAttempts).values({ id: ATTEMPT_ID, taskId: setup.taskId, operationId: PUBLISH_OPERATION_ID, revisionId: setup.revisionId, publisherUserId: setup.ownerId, publisherGithubId: "88", repositoryId: "202", repositoryNodeId: "R_202", approvedOwner: "acme", approvedName: "private", previewHash: "h", titleSnapshot: "Título", bodySnapshot, approvalSessionId: setup.sessionId, outcome, issueId: "4101", issueNodeId: "I_41", issueNumber: 41, issueUrl: "https://github.com/acme/private/issues/41", issueCreatedAt: new Date() });
  await setup.database.update(tasks).set({ status: "published" }).where(eq(tasks.id, setup.taskId));
  if (outcome === "created") await seedOperatorClaim({ database: setup.database, projectId: setup.project.id, taskId: setup.taskId, attemptId: ATTEMPT_ID, operatorId: setup.ownerId }, { title: "Título", body: bodySnapshot });
  return Object.assign(setup, { world: operatorWorld({ body: bodySnapshot }) });
}

export async function seedPlanOperation(setup: PlanningSetup, state: string, id = PLAN_OPERATION_ID, planningStatus: string | null = "in_progress") {
  await setup.database.insert(taskOperations).values({ id, taskId: setup.taskId, kind: "plan", state, initiatedSessionId: setup.sessionId, baseTaskVersion: 7, publicationAttemptId: ATTEMPT_ID, inputHash: INPUT_HASH, lastError: state === "failed" ? "planning_timeout" : null });
  await setup.database.update(tasks).set({ planningStatus, planningOperationId: id, activeOperationId: ["queued", "running"].includes(state) ? id : null }).where(eq(tasks.id, setup.taskId));
}

export async function seedReview(setup: PlanningSetup, overrides: Record<string, unknown> = {}) {
  await seedPlanOperation(setup, "succeeded", PLAN_OPERATION_ID, "review");
  await setup.database.insert(taskPlanningDecisions).values({ taskId: setup.taskId, publicationAttemptId: ATTEMPT_ID, operationId: PLAN_OPERATION_ID, executionId: crypto.randomUUID(), ...REVIEW_ASSESSMENT, ...overrides } as never);
}

export function planningCaller(setup: PlanningSetup, userId: string | null = setup.ownerId, configured = true, planningDao: TaskPlanningDao = new DrizzleTaskPlanningDao(setup.database)) {
  const planning = new TaskPlanningController(new PlanningService(planningDao), operatorAuthorization(setup.database, setup.repositoryAccess, setup.world), configured ? () => {} : requireMissing);
  const tasksController = new TasksController(setup.taskDao, setup.repositoryAccess);
  return createTasksRouter(tasksController, undefined, planning).createCaller({ principal: userId ? { userId, sessionId: setup.sessionId } : null, requestId: "planning-test" });
}

export function planningBase(setup: PlanningSetup, version = 7, taskId = setup.taskId) {
  return { projectId: setup.project.id, taskId, requestKey: crypto.randomUUID(), expectedVersion: version };
}

export async function reviewState(setup: PlanningSetup) {
  const detail = await planningCaller(setup).byId({ projectId: setup.project.id, taskId: setup.taskId });
  return { version: detail.task.version, decision: detail.planning.decision! };
}

export async function currentTask(setup: PlanningSetup) {
  return (await setup.database.select().from(tasks).where(eq(tasks.id, setup.taskId)))[0]!;
}

export function expectRejected(results: PromiseSettledResult<unknown>[], code: string, reason: string) {
  expect(results.every((result) => result.status === "rejected" && result.reason.code === code && result.reason.cause?.reason === reason)).toBe(true);
}

export const rejection = (promise: Promise<unknown>) => promise.then(() => null, (error: { code: string; cause?: { reason: string; retryAfterSeconds?: number } }) => ({ code: error.code, reason: error.cause?.reason, retryAfterSeconds: error.cause?.retryAfterSeconds }));

function requireMissing() {
  throw new TaskError("planning_unconfigured");
}

export async function addPublishedTask(setup: PlanningSetup, snapshot: { title?: string; body?: string; authorId?: string; operatorId?: string } = {}) {
  const authorId = snapshot.authorId ?? setup.ownerId;
  const taskId = crypto.randomUUID();
  const attemptId = crypto.randomUUID();
  const publishId = crypto.randomUUID();
  const revisionId = crypto.randomUUID();
  const draft = { title: "t", context: "c", objective: "o", constraints: [], relevantContext: [], productConsiderations: [], references: [] };
  await setup.database.insert(tasks).values({ id: taskId, projectId: setup.project.id, authorUserId: authorId, repositoryId: "202", repositoryNodeId: "R_202", status: "draft_ready", version: 3, title: "Adicional" });
  await setup.database.insert(taskDraftRevisions).values({ id: revisionId, taskId, revisionNumber: 1, canonicalDraft: draft, createdByUserId: setup.ownerId });
  await setup.database.insert(taskOperations).values({ id: publishId, taskId, kind: "publish", state: "succeeded", initiatedSessionId: setup.sessionId, baseTaskVersion: 3 });
  await setup.database.insert(taskPublicationAttempts).values({ id: attemptId, taskId, operationId: publishId, revisionId, publisherUserId: setup.ownerId, publisherGithubId: "88", repositoryId: "202", repositoryNodeId: "R_202", approvedOwner: "acme", approvedName: "private", previewHash: "h", titleSnapshot: snapshot.title ?? "Outro título", bodySnapshot: snapshot.body ?? "Outro corpo", approvalSessionId: setup.sessionId, outcome: "created", issueId: attemptId, issueNodeId: `I_${attemptId}`, issueNumber: 7, issueUrl: "https://github.com/acme/private/issues/7", issueCreatedAt: new Date() });
  await setup.database.update(tasks).set({ status: "published" }).where(eq(tasks.id, taskId));
  await seedOperatorClaim({ database: setup.database, projectId: setup.project.id, taskId, attemptId, operatorId: snapshot.operatorId ?? snapshot.authorId ?? setup.ownerId, world: setup.world }, { title: snapshot.title ?? "Outro título", body: snapshot.body ?? "Outro corpo" });
  return taskId;
}

export async function startPlanning(setup: PlanningSetup, taskId = setup.taskId, version = 7) {
  return planningCaller(setup).planning.start({ projectId: setup.project.id, taskId, requestKey: crypto.randomUUID(), expectedVersion: version });
}

export async function readPlanning(setup: PlanningSetup, taskId = setup.taskId) {
  return (await planningCaller(setup).byId({ projectId: setup.project.id, taskId })).planning;
}
