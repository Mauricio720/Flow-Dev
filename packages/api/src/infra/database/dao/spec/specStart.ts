import { and, eq, sql } from "drizzle-orm";
import type { SpecCommandResult, SpecCommandTarget } from "../../../../application/database/dao/taskSpecDao";
import type { SpecStage } from "../../../../application/services/spec/specContracts";
import { specEligibility } from "../../../../application/services/spec/specEligibility";
import { buildSpecInput } from "../../../../application/services/spec/specInput";
import { assertStagePrerequisite } from "../../../../application/services/spec/specStages";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecAttempts, taskSpecStages, taskSpecWorkspaces } from "../../schema";
import type { Database } from "../../client";
import { readPlanningProjection } from "../tasks/planningProjection";
import { assertOperator, assertVersion, findReplay, lockSpecTask, lockSpecWorkflow, type SpecTask, type SpecWorkflowRow } from "./specCommandHelpers";
import { assertCapacity } from "./specCapacity";
import { persistSpecStart } from "./specStartPersist";

const START_ACTION = "spec.start";
const ACTIVE_ATTEMPT_STATES = ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];

type StartTarget = SpecCommandTarget & { stage: SpecStage };

export function acceptSpecStart(database: Database, target: StartTarget): Promise<SpecCommandResult> {
  return database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    const task = await lockSpecTask(db, target);
    await assertOperator(db, task, target.actorUserId);
    const replay = await findReplay(db, target, START_ACTION);
    if (replay) return replay;
    const workflow = await lockSpecWorkflow(db, task.id);
    assertVersion(workflow, target.expectedSpecVersion);
    return admit(db, { target, task, workflow });
  });
}

async function admit(db: Database, context: { target: StartTarget; task: SpecTask; workflow: SpecWorkflowRow | null }) {
  const { target, task, workflow } = context;
  const projection = await readPlanningProjection(db, task.id);
  const { publication, decision } = projection;
  const eligibility = specEligibility({ taskStatus: projection.taskStatus, publication, planning: decision && { status: decision.status, selectedRoute: decision.selectedRoute } });
  if (!eligibility.canStart || !publication || !decision) throw new TaskError(eligibility.reason ?? "planning_required");
  const stages = workflow ? await db.select().from(taskSpecStages).where(eq(taskSpecStages.workflowId, workflow.id)) : [];
  const approved = stages.filter((row) => row.approvedPackageId);
  assertStagePrerequisite({ route: eligibility.route!, stage: target.stage, approved: approved.map((row) => row.stage as SpecStage) });
  await assertStageStartable(db, workflow, stages.find((row) => row.stage === target.stage));
  if (workflow) await assertWorkspaceMatches(db, workflow.id, task.repositoryId);
  await assertCapacity(db);
  const input = buildSpecInput({ taskId: task.id, projectId: task.projectId, stage: target.stage, publicationId: publication.attemptId, planningDecisionId: decision.id, selectedRoute: eligibility.route!, repositoryGithubId: task.repositoryId, publication: { issueNumber: publication.issueNumber, title: publication.title, bodyMarkdown: publication.bodyMarkdown }, planningUncertainties: decision.uncertainties, upstreamPackageIds: approved.map((row) => row.approvedPackageId!) });
  return persistSpecStart(db, { target, task, workflow, input, route: eligibility.route!, publicationId: publication.attemptId, decisionId: decision.id });
}

async function assertStageStartable(db: Database, workflow: SpecWorkflowRow | null, stage: typeof taskSpecStages.$inferSelect | undefined) {
  if (!workflow || !stage || stage.state === "not_started") return;
  if (stage.state === "approved") throw new TaskError("stage_approved");
  const [active] = await db.select({ id: taskSpecAttempts.id }).from(taskSpecAttempts).where(and(eq(taskSpecAttempts.workflowId, workflow.id), sql`${taskSpecAttempts.state} in (${sql.join(ACTIVE_ATTEMPT_STATES.map((state) => sql`${state}`), sql`, `)})`)).limit(1);
  throw new TaskError(active ? "attempt_active" : "spec_conflict");
}

async function assertWorkspaceMatches(db: Database, workflowId: string, repositoryId: string) {
  const [workspace] = await db.select({ repositoryGithubId: taskSpecWorkspaces.repositoryGithubId }).from(taskSpecWorkspaces).where(eq(taskSpecWorkspaces.workflowId, workflowId));
  if (workspace && workspace.repositoryGithubId !== repositoryId) throw new TaskError("workspace_unavailable");
}
