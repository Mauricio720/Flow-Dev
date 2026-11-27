import { taskSessionPlanRuns } from "../src/infra/database/schema";
import { createPlanRunService } from "../src/infra/planRunComposition";
import { createPlanController } from "../src/infra/planComposition";
import { PlanRunController } from "../src/controllers/planRunController";
import { createTasksRouter } from "../src/routers/tasks";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import type { PlanLog } from "../src/application/services/tasks-set/planLog";
import { seedStoredPlan, seedTaskSet } from "./plan-support";
import { HARNESS_NOW, workAuthorizationFor } from "./terminal-harness";
import { readySetup } from "./terminal-open-support";

export const RUN_KEY = "40000000-0000-4000-8000-000000000001";

export const silentLog: PlanLog = { manifestInvalid: () => undefined, saved: () => undefined, conflict: () => undefined, itemStarted: () => undefined, runStarted: () => undefined, runSessionStarted: () => undefined, runPaused: () => undefined, runResumed: () => undefined, runCompleted: () => undefined };

export async function planRunWorld(options: Parameters<typeof readySetup>[0] = {}) {
  const world = await readySetup(options);
  const tools = { has: async () => true };
  const service = createPlanRunService(world.setup.database, { env: world.harness.env, context: world.harness.context, tools, hostId: machineIdentity(), now: () => HARNESS_NOW, log: silentLog });
  const { workAuthorization } = workAuthorizationFor(world.setup);
  const plan = createPlanController(world.setup.database, { repositories: world.setup.repositoryAccess, workAuthorization, log: silentLog });
  const router = createTasksRouter(undefined, undefined, { plan, planRun: new PlanRunController({ service, authorization: workAuthorization }) });
  const planCallerFor = (userId: string) => router.createCaller({ principal: { userId, sessionId: world.setup.sessionId }, requestId: "plan-run-test" }).plan;
  return { ...world, service, planCallerFor };
}

export type PlanRunWorld = Awaited<ReturnType<typeof planRunWorld>>;

export async function seedTwoSessionPlan(world: PlanRunWorld, items: { taskIds: string[] }[] = [{ taskIds: ["task_01"] }, { taskIds: ["task_02"] }]) {
  await seedTaskSet(world, { ids: ["task_01", "task_02"], edges: [["task_01", "task_02"]] });
  return seedStoredPlan(world, { items });
}

export function startInput(world: PlanRunWorld, requestKey = RUN_KEY) {
  return { projectId: world.setup.project.id, taskId: world.setup.taskId, actorId: world.setup.ownerId, requestKey };
}

export function runRows(world: PlanRunWorld) {
  return world.setup.database.select().from(taskSessionPlanRuns);
}
