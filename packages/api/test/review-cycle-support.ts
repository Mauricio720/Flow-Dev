import { DrizzleReviewCycleDao } from "../src/infra/database/dao/review/drizzleReviewCycleDao";
import { DrizzleTaskSetReadDao } from "../src/infra/database/dao/artifacts/drizzleTaskSetReadDao";
import { DrizzleTerminalExecutionDao } from "../src/infra/database/dao/terminal/drizzleTerminalExecutionDao";
import { TaskSetLoader } from "../src/application/services/tasks-set/taskSetLoader";
import { ReviewCycleService } from "../src/application/services/review/reviewCycleService";
import { HeartbeatSessionServiceStatus } from "../src/application/services/terminal/sessionServiceStatus";
import { TerminalOpenGuard } from "../src/application/services/terminal/terminalOpenGuard";
import { LocalCheckoutService } from "../src/application/services/projects/localCheckoutService";
import { ConsoleTerminalLog } from "../src/application/services/terminal/terminalLaunchLog";
import { PublishedCodexCatalog } from "../src/application/services/terminal/publishedCodexCatalog";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { DrizzleLocalCheckoutDao } from "../src/infra/database/dao/projects/drizzleLocalCheckoutDao";
import { DrizzleProjectDao } from "../src/infra/database/dao/projects/drizzleProjectDao";
import { DrizzleAccessDao } from "../src/infra/database/dao/drizzleAccessDao";
import { ReviewCycleController } from "../src/controllers/reviewCycleController";
import { createTasksRouter } from "../src/routers/tasks";
import type { AgentChoice } from "../src/application/terminal/sessionAgentCatalog";
import type { ReviewStartInput } from "../src/application/services/review/reviewCycleService";
import { taskPlanningDecisions, taskReviewCycles, taskTerminalSessions } from "../src/infra/database/schema";
import { REGISTERED_SESSION_AGENTS } from "../src/infra/registeredSessionAgents";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import { ExecGitCheckoutInspector } from "../src/infra/terminal/execGitCheckoutInspector";
import { readySetup } from "./terminal-open-support";
import { HARNESS_NOW, workAuthorizationFor } from "./terminal-harness";
import { seedTaskSet } from "./plan-support";

export const REVIEWER: AgentChoice = { agent: "claude", model: "opus", effort: "max" };
export const EXECUTOR: AgentChoice = { agent: "claude", model: "sonnet", effort: "high" };
export const CODEX: AgentChoice = { agent: "codex", model: "gpt-5", effort: "medium" };
export const REVIEW_TASK_IDS = Array.from({ length: 7 }, (_value, index) => `task_${String(index + 1).padStart(2, "0")}`);
const REQUEST_KEY = "30000000-0000-4000-8000-000000000001";

export const NO_CODEX_LOGIN = { read: async () => ({ available: false, reason: "Codex não está conectado.", version: null, models: [], refreshedAt: HARNESS_NOW.toISOString() }) };

export function reviewInput(world: Awaited<ReturnType<typeof reviewCycleWorld>>, overrides: Partial<ReviewStartInput> = {}): ReviewStartInput {
  return { taskId: world.setup.taskId, projectId: world.setup.project.id, actorId: world.setup.ownerId, requestKey: REQUEST_KEY, reviewer: REVIEWER, executor: EXECUTOR, partial: false, allowOpenSessions: false, ...overrides };
}

export async function seedReviewTasks(world: Awaited<ReturnType<typeof reviewCycleWorld>>, incompleteIds: string[] = []) {
  const statuses = Object.fromEntries(REVIEW_TASK_IDS.map((id) => [id, incompleteIds.includes(id) ? "pending" : "completed"]));
  await seedTaskSet(world, { ids: REVIEW_TASK_IDS, statuses });
}

export async function seedActiveReviewSessions(world: Awaited<ReturnType<typeof reviewCycleWorld>>, count: number) {
  for (let index = 0; index < count; index++) await world.setup.database.insert(taskTerminalSessions).values({ taskId: world.setup.taskId, projectId: world.setup.project.id, userId: world.setup.ownerId, planningDecisionId: world.decisionId, route: "tech_spec", requestKey: crypto.randomUUID(), checkoutPath: "/work/shop", dirty: false, status: "running" });
}

export async function reviewCycleRows(world: Awaited<ReturnType<typeof reviewCycleWorld>>) {
  return world.setup.database.select().from(taskReviewCycles);
}

export async function reviewCycleContext(world: Awaited<ReturnType<typeof readySetup>>, options: Parameters<typeof readySetup>[0] = {}) {
  const { database } = world.setup;
  const taskSets = new DrizzleTaskSetReadDao(database);
  const hostId = machineIdentity();
  const now = () => HARNESS_NOW;
  const catalog = new HeartbeatSessionServiceStatus({ hosts: new DrizzleSessionHostDao(database), hostId, now });
  const projects = new DrizzleProjectDao(database);
  const checkouts = new DrizzleLocalCheckoutDao(database);
  const verifier = new LocalCheckoutService({ checkouts, inspector: new ExecGitCheckoutInspector(), projects, permissions: new DrizzleAccessDao(database) });
  const missingTools = new Set(options.missingTools ?? []);
  const tools = { has: async (binary: string) => !missingTools.has(binary) };
  const log = new ConsoleTerminalLog();
  const guard = new TerminalOpenGuard({ env: world.harness.env, checkouts, verifier, tools, context: world.harness.context, service: catalog, log, codexProbe: options.codexProbe ?? new PublishedCodexCatalog(catalog, now) });
  const service = new ReviewCycleService({ cycles: new DrizzleReviewCycleDao(database), taskSets: new TaskSetLoader(taskSets), sessions: new DrizzleTerminalExecutionDao(database), projects, guard, agents: REGISTERED_SESSION_AGENTS, catalog, hostId });
  const controller = new ReviewCycleController({ service, repositories: world.setup.repositoryAccess, tasks: taskSets, authorization: workAuthorizationFor(world.setup).workAuthorization, now });
  const router = createTasksRouter(undefined, undefined, { review: controller });
  const reviewCallerFor = (userId: string) => router.createCaller({ principal: { userId, sessionId: world.setup.sessionId }, requestId: "review-test" });
  const [decision] = await database.select().from(taskPlanningDecisions);
  return { ...world, service, reviewCallerFor, decisionId: decision!.id };
}

export async function reviewCycleWorld(options: Parameters<typeof readySetup>[0] = {}) {
  return reviewCycleContext(await readySetup(options), options);
}
