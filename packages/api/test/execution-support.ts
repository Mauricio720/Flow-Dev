import { eq } from "drizzle-orm";
import { projectCompozyBindings, taskPlanningDecisions } from "../src/infra/database/schema";
import { createTaskExecutionController } from "../src/infra/executionComposition";
import { createTaskExecutionRouter } from "../src/routers/taskExecution";
import type { PlanningRoute } from "../src/application/services/tasks/planningContracts";
import type { WorkAuthorization } from "../src/application/services/assigned-issues/workAuthorization";
import { FakeCompozyGateway } from "./compozy-fake-gateway";
import { publishedTask, seedReview } from "./planning-support";
import { closeTaskFixture } from "./task-api-support";

const TEST_RUNTIME = { provider: "codex", model: "gpt-6-luna", reasoningEffort: "medium" };

export async function executionFixture(route: PlanningRoute = "direct_execution") {
  const setup = await publishedTask();
  await seedReview(setup, { selectedRoute: route, recommendedRoute: route, uncertainties: [] });
  const [decision] = await setup.database.select().from(taskPlanningDecisions).where(eq(taskPlanningDecisions.taskId, setup.taskId));
  await setup.database.update(taskPlanningDecisions).set({ status: "approved", approvedByUserId: setup.ownerId, approvedAt: new Date() }).where(eq(taskPlanningDecisions.id, decision.id));
  await setup.database.insert(projectCompozyBindings).values({ projectId: setup.project.id, checkoutPath: "/tmp/repository", compozyWorkspaceId: "workspace", state: "ready", defaultBranch: "main", checkedAt: new Date(), updatedBy: setup.ownerId });
  const gateway = new FakeCompozyGateway();
  const authorization = { assess: async () => ({ reason: null }), requireRead: async () => ({}) } as unknown as WorkAuthorization;
  const controller = createTaskExecutionController(setup.database, { gateway, runtime: () => TEST_RUNTIME, authorization });
  const router = createTaskExecutionRouter(controller);
  const caller = router.createCaller({ principal: { userId: setup.ownerId }, requestId: "execution-test" });
  const input = { projectId: setup.project.id, taskId: setup.taskId, decisionId: decision.id, expectedDecisionVersion: decision.version, idempotencyKey: crypto.randomUUID() };
  return { ...setup, gateway, caller, input, decision, close: closeTaskFixture };
}
