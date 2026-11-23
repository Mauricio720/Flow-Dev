import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { projectLocalCheckouts, taskIssueSnapshots, taskOperations, taskPlanningDecisions, tasks } from "../src/infra/database/schema";
import { FLOW_DEV_SKILLS } from "../src/application/terminal/sessionContext";
import type { TerminalCommand, TerminalLauncher } from "../src/application/terminal/terminalLauncher";
import { INPUT_HASH, PLAN_OPERATION_ID, REVIEW_ASSESSMENT, publishedTask, seedReview, type PlanningSetup } from "./planning-support";

export const PROJECT_REMOTE = "git@github.com:acme/private.git";
const folders: string[] = [];

export async function cleanupTerminalFolders() {
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
}

export async function temporaryFolder(prefix: string) {
  const folder = await mkdtemp(join(tmpdir(), prefix));
  folders.push(folder);
  return folder;
}

export class FakeLauncher implements TerminalLauncher {
  commands: TerminalCommand[] = [];
  failure: Error | null = null;

  async launch(command: TerminalCommand) {
    if (this.failure) throw this.failure;
    this.commands.push(command);
  }
}

export async function gitClone(remote = PROJECT_REMOTE) {
  const root = join(await temporaryFolder("clone-"), "Área de trabalho", "shop");
  await mkdir(root, { recursive: true });
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["remote", "add", "origin", remote], { cwd: root });
  return root;
}

export async function skillsFolder(missing: string[]) {
  const skills = await temporaryFolder("skills-");
  for (const skill of FLOW_DEV_SKILLS.filter((name) => !missing.includes(name))) {
    await mkdir(join(skills, skill), { recursive: true });
    await writeFile(join(skills, skill, "SKILL.md"), `---\nname: ${skill}\n---\n`);
  }
  return skills;
}

async function seedSnapshotReview(setup: PlanningSetup, snapshotId: string) {
  const operation = { id: PLAN_OPERATION_ID, taskId: setup.taskId, kind: "plan", state: "succeeded", initiatedSessionId: setup.sessionId, baseTaskVersion: 7, sourceFormatVersion: 2, sourceSnapshotId: snapshotId, requesterUserId: setup.ownerId, inputHash: INPUT_HASH };
  await setup.database.insert(taskOperations).values(operation as never);
  await setup.database.update(tasks).set({ planningStatus: "review", planningOperationId: PLAN_OPERATION_ID }).where(eq(tasks.id, setup.taskId));
  const decision = { taskId: setup.taskId, operationId: PLAN_OPERATION_ID, executionId: crypto.randomUUID(), sourceFormatVersion: 2, sourceSnapshotId: snapshotId, requesterUserId: setup.ownerId, ...REVIEW_ASSESSMENT };
  await setup.database.insert(taskPlanningDecisions).values(decision as never);
}

export async function approvedWork(body = "Corpo", sourceFormatVersion: 1 | 2 = 2) {
  const setup = await publishedTask("created", 7, body);
  const [snapshot] = await setup.database.select().from(taskIssueSnapshots).where(eq(taskIssueSnapshots.taskId, setup.taskId));
  if (sourceFormatVersion === 2) await seedSnapshotReview(setup, snapshot!.id);
  else await seedReview(setup);
  const [decision] = await setup.database.select().from(taskPlanningDecisions);
  const approval = { status: "approved", approvedByUserId: setup.ownerId, approvedAt: new Date() };
  await setup.database.update(taskPlanningDecisions).set(approval).where(eq(taskPlanningDecisions.id, decision!.id));
  await setup.database.update(tasks).set({ planningStatus: "approved", planningDecisionId: decision!.id }).where(eq(tasks.id, setup.taskId));
  return setup;
}

export async function linkClone(setup: PlanningSetup, path: string, userId = setup.ownerId) {
  await setup.database.insert(projectLocalCheckouts).values({ userId, projectId: setup.project.id, path, verifiedAt: new Date() });
}

export function openInput(setup: PlanningSetup, overrides: Record<string, unknown> = {}) {
  return { projectId: setup.project.id, taskId: setup.taskId, prompt: "/flow-dev:direct-executor faça", requestKey: crypto.randomUUID(), attachmentIds: [], issueImageIds: [], allowAdditional: true, ...overrides };
}
