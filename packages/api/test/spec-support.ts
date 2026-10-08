import { operatorAuthorization } from "./operator-support";
import { eq } from "drizzle-orm";
import { taskPlanningDecisions, tasks } from "../src/infra/database/schema";
import { DrizzleTaskSpecDao } from "../src/infra/database/dao/spec/drizzleTaskSpecDao";
import type { TaskSpecDao } from "../src/application/database/dao/taskSpecDao";
import { SpecLifecycleService } from "../src/application/services/spec/specLifecycleService";
import { TaskSpecController } from "../src/controllers/taskSpecController";
import { createTaskSpecRouter } from "../src/routers/taskSpec";
import { publishedTask, seedReview, type PlanningSetup } from "./planning-support";
import { seedTask, taskFixture } from "./task-api-support";

export type SpecSetup = PlanningSetup;
export const rejection = (promise: Promise<unknown>) => promise.then(() => null, (error: { code: string; cause?: { reason: string; retryAfterSeconds?: number }; message: string }) => ({ code: error.code, reason: error.cause?.reason, retryAfterSeconds: error.cause?.retryAfterSeconds, message: error.message }));

export async function specTask(route: "prd" | "tech_spec" | "direct_execution" = "prd", approve = true, body = "Corpo"): Promise<SpecSetup> {
  const setup = await publishedTask("created", 7, body);
  await seedReview(setup, { recommendedRoute: route, selectedRoute: route, uncertainties: ["Falta definir retenção"] });
  if (approve) await approvePlanning(setup);
  return setup;
}

export async function approvePlanning(setup: SpecSetup) {
  await setup.database.update(taskPlanningDecisions).set({ status: "approved", approvedByUserId: setup.ownerId, approvedAt: new Date() }).where(eq(taskPlanningDecisions.taskId, setup.taskId));
  await setup.database.update(tasks).set({ planningStatus: "approved" }).where(eq(tasks.id, setup.taskId));
}

export function specRouter(setup: SpecSetup, dao: TaskSpecDao = new DrizzleTaskSpecDao(setup.database)) {
  return createTaskSpecRouter(new TaskSpecController(operatorAuthorization(setup.database, setup.repositoryAccess, setup.world), dao, new SpecLifecycleService(dao), setup.repositoryAccess));
}

export function specCaller(setup: SpecSetup, userId: string | null = setup.ownerId, dao: TaskSpecDao = new DrizzleTaskSpecDao(setup.database)) {
  return specRouter(setup, dao).createCaller({ principal: userId ? { userId, sessionId: setup.sessionId } : null, requestId: "spec-test" });
}

export function specScope(setup: SpecSetup, taskId = setup.taskId) {
  return { projectId: setup.project.id, taskId };
}

export function startInput(setup: SpecSetup, overrides: Record<string, unknown> = {}) {
  return { ...specScope(setup), requestKey: crypto.randomUUID(), expectedSpecVersion: 0, stage: "prd" as const, ...overrides };
}

export async function unpublishedTask() {
  const setup = await taskFixture();
  await seedTask(setup);
  return setup as unknown as SpecSetup;
}
