import { AssignedIssueVerifier } from "../src/application/services/assigned-issues/assignedIssueVerifier";
import { WorkAuthorization } from "../src/application/services/assigned-issues/workAuthorization";
import { WorkOperability } from "../src/application/services/assigned-issues/workOperability";
import type { ToolLocator } from "../src/application/terminal/terminalLauncher";
import { TasksController } from "../src/controllers/tasksController";
import { DrizzleIssueClaimDao } from "../src/infra/database/dao/assigned-issues/drizzleIssueClaimDao";
import { DrizzleIssueSourceDao } from "../src/infra/database/dao/assigned-issues/drizzleIssueSourceDao";
import { createArtifactController } from "../src/infra/artifactComposition";
import { createTerminalAttachmentService } from "../src/infra/terminalAttachmentComposition";
import { createTerminalController } from "../src/infra/terminalComposition";
import { createTasksRouter } from "../src/routers/tasks";
import { worldGateway } from "./operator-support";
import type { PlanningSetup } from "./planning-support";
import { FakeLauncher, skillsFolder, temporaryFolder } from "./terminal-support";

export function workAuthorizationFor(setup: PlanningSetup) {
  const githubWrites: string[] = [];
  const gateway = { ...worldGateway(setup.world), setStatus: async () => { githubWrites.push("setStatus"); } };
  const operability = new WorkOperability({ gateway, verifier: new AssignedIssueVerifier(gateway) });
  const workAuthorization = new WorkAuthorization({ repositories: setup.repositoryAccess, sources: new DrizzleIssueSourceDao(setup.database), claims: new DrizzleIssueClaimDao(setup.database), operability });
  return { workAuthorization, githubWrites };
}

export const HARNESS_APP_URL = "http://localhost:3000";

export type HarnessOptions = { missingSkills?: string[]; missingTools?: string[]; enabled?: boolean; fakeLaunchFile?: string; env?: NodeJS.ProcessEnv };

export async function terminalHarness(setup: PlanningSetup, options: HarnessOptions = {}) {
  const launcher = new FakeLauncher();
  const unavailable = new Set(options.missingTools ?? []);
  const tools: ToolLocator = { has: async (binary) => !unavailable.has(binary) };
  const state = await temporaryFolder("state-");
  const home = await temporaryFolder("home-");
  const skills = await skillsFolder(options.missingSkills ?? []);
  const env = { XDG_STATE_HOME: state, HOME: home, BETTER_AUTH_URL: HARNESS_APP_URL, FLOW_DEV_SKILLS_DIR: skills, ...(options.enabled === false ? {} : { FLOW_DEV_TERMINAL_ENABLED: "true" }), ...(options.fakeLaunchFile ? { FLOW_DEV_TERMINAL_FAKE_LAUNCH_FILE: options.fakeLaunchFile, NODE_ENV: "test" } : {}), ...options.env };
  const { workAuthorization, githubWrites } = workAuthorizationFor(setup);
  const controller = createTerminalController(setup.database, { ...(options.fakeLaunchFile ? {} : { launcher, tools }), env, workAuthorization });
  const router = createTasksRouter(new TasksController(setup.taskDao, setup.repositoryAccess), undefined, { terminal: controller, artifacts: createArtifactController(setup.database, setup.repositoryAccess) });
  const callerFor = (userId: string) => router.createCaller({ principal: { userId, sessionId: setup.sessionId }, requestId: "terminal-test" });
  const attachments = createTerminalAttachmentService(setup.database, { env, workAuthorization });
  return { launcher, state, home, skills, env, githubWrites, attachments, caller: callerFor(setup.ownerId), callerFor };
}

