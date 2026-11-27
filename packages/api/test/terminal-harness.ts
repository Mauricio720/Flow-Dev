import { AssignedIssueVerifier } from "../src/application/services/assigned-issues/assignedIssueVerifier";
import { WorkAuthorization } from "../src/application/services/assigned-issues/workAuthorization";
import { WorkOperability } from "../src/application/services/assigned-issues/workOperability";
import type { ToolLocator } from "../src/application/terminal/toolLocator";
import type { CodexCatalogProbe } from "../src/application/terminal/codexCatalogProbe";
import { TasksController } from "../src/controllers/tasksController";
import { DrizzleIssueClaimDao } from "../src/infra/database/dao/assigned-issues/drizzleIssueClaimDao";
import { DrizzleIssueSourceDao } from "../src/infra/database/dao/assigned-issues/drizzleIssueSourceDao";
import { DrizzleSessionHostDao } from "../src/infra/database/dao/terminal/drizzleSessionHostDao";
import { createArtifactController } from "../src/infra/artifactComposition";
import { createPlanController } from "../src/infra/planComposition";
import { createTaskSetController } from "../src/infra/taskSetComposition";
import { createSessionControllers } from "../src/infra/sessionInteractionComposition";
import { createTerminalAttachmentService } from "../src/infra/terminalAttachmentComposition";
import { createTerminalController } from "../src/infra/terminalComposition";
import { createWorktreeController } from "../src/infra/worktreeComposition";
import { machineIdentity } from "../src/infra/terminal/machineIdentity";
import type { SecretAnswerSender } from "../src/application/terminal/secretAnswerTransport";
import { createTasksRouter } from "../src/routers/tasks";
import { worldGateway } from "./operator-support";
import type { PlanningSetup } from "./planning-support";
import { FailableContext, skillsFolder, temporaryFolder } from "./terminal-support";

export function workAuthorizationFor(setup: PlanningSetup) {
  const githubWrites: string[] = [];
  const gateway = { ...worldGateway(setup.world), setStatus: async () => { githubWrites.push("setStatus"); } };
  const operability = new WorkOperability({ gateway, verifier: new AssignedIssueVerifier(gateway) });
  const workAuthorization = new WorkAuthorization({ repositories: setup.repositoryAccess, sources: new DrizzleIssueSourceDao(setup.database), claims: new DrizzleIssueClaimDao(setup.database), operability });
  return { workAuthorization, githubWrites };
}

export const HARNESS_APP_URL = "http://localhost:3000";
export const HARNESS_NOW = new Date("2026-11-23T14:32:00Z");
const SERVICE_BEAT_AGE_MS = 5_000;

export type HarnessOptions = { missingSkills?: string[]; missingTools?: string[]; enabled?: boolean; serviceRunning?: boolean; env?: NodeJS.ProcessEnv; secretAnswers?: SecretAnswerSender; secretAnswersFactory?: (setup: PlanningSetup) => SecretAnswerSender; codexProbe?: CodexCatalogProbe };

export async function terminalHarness(setup: PlanningSetup, options: HarnessOptions = {}) {
  const unavailable = new Set(options.missingTools ?? []);
  const tools: ToolLocator = { has: async (binary) => !unavailable.has(binary) };
  const state = await temporaryFolder("state-");
  const home = await temporaryFolder("home-");
  const skills = await skillsFolder(options.missingSkills ?? []);
  const env = { XDG_STATE_HOME: state, HOME: home, BETTER_AUTH_URL: HARNESS_APP_URL, FLOW_DEV_SKILLS_DIR: skills, ...(options.enabled === false ? {} : { FLOW_DEV_TERMINAL_ENABLED: "true" }), ...options.env };
  const { workAuthorization, githubWrites } = workAuthorizationFor(setup);
  const context = new FailableContext(env);
  const hosts = new DrizzleSessionHostDao(setup.database);
  if (options.serviceRunning !== false) await hosts.beat({ hostId: machineIdentity(), workerId: "worker-test", heartbeatAt: new Date(HARNESS_NOW.getTime() - SERVICE_BEAT_AGE_MS) });
  const controller = createTerminalController(setup.database, { tools, env, context, now: () => HARNESS_NOW, workAuthorization, codexProbe: options.codexProbe });
  const secretAnswers = options.secretAnswersFactory?.(setup) ?? options.secretAnswers;
  const router = createTasksRouter(new TasksController(setup.taskDao, setup.repositoryAccess), undefined, { terminal: controller, artifacts: createArtifactController(setup.database, setup.repositoryAccess), taskSet: createTaskSetController(setup.database, setup.repositoryAccess), plan: createPlanController(setup.database, { repositories: setup.repositoryAccess, workAuthorization }), session: createSessionControllers(setup.database, { workAuthorization, repositories: setup.repositoryAccess, secretAnswers, now: () => HARNESS_NOW }), worktree: createWorktreeController(setup.database, { workAuthorization, now: () => HARNESS_NOW }) });
  const callerFor = (userId: string) => router.createCaller({ principal: { userId, sessionId: setup.sessionId }, requestId: "terminal-test" });
  const attachments = createTerminalAttachmentService(setup.database, { env, workAuthorization });
  return { context, hosts, state, home, skills, env, githubWrites, attachments, caller: callerFor(setup.ownerId), callerFor };
}

