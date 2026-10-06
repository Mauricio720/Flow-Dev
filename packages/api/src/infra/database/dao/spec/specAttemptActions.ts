import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { SpecCommandResult, SpecCommandTarget } from "../../../../application/database/dao/taskSpecDao";
import type { SpecAction, SpecRoute, SpecStage } from "../../../../application/services/spec/specContracts";
import { buildSpecInput, specInputHash, type StoredSpecInput } from "../../../../application/services/spec/specInput";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecAttempts, taskSpecStages, taskSpecWorkflows, taskSpecWorkspaces } from "../../schema";
import type { Database } from "../../client";
import { readPlanningProjection } from "../tasks/planningProjection";
import { assertCapacity } from "./specCapacity";
import { assertAuthor, assertVersion, findReplay, lockSpecTask, lockSpecWorkflow, type SpecTask, type SpecWorkflowRow } from "./specCommandHelpers";

export const ACTIVE_ATTEMPT_STATES = ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];
export const TERMINAL_FAILURE_STATES = ["failed", "canceled"];

export type ActionContext = { db: Database; task: SpecTask; workflow: SpecWorkflowRow };
export type ActionInput = SpecCommandTarget & { action: SpecAction; stage?: SpecStage; attemptId?: string; failedAttemptId?: string; packageId?: string; payload: Record<string, unknown> };

export function runAction(database: Database, input: ActionInput, apply: (context: ActionContext) => Promise<SpecCommandResult>): Promise<SpecCommandResult> {
  return database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    const task = await lockSpecTask(db, input);
    assertAuthor(task, input.actorUserId);
    const replay = await findReplay(db, input, input.action);
    if (replay) return replay;
    const workflow = await lockSpecWorkflow(db, task.id);
    if (!workflow) throw new TaskError("spec_unavailable");
    assertVersion(workflow, input.expectedSpecVersion);
    return apply({ db, task, workflow });
  });
}

export async function assertWorkspaceBound(context: ActionContext) {
  const [workspace] = await context.db.select().from(taskSpecWorkspaces).where(eq(taskSpecWorkspaces.workflowId, context.workflow.id));
  if (!workspace || workspace.repositoryGithubId !== context.task.repositoryId || workspace.state !== "ready") throw new TaskError("workspace_unavailable");
}

export async function assertNoActiveAttempt(context: ActionContext) {
  const [active] = await context.db.select({ id: taskSpecAttempts.id }).from(taskSpecAttempts).where(and(eq(taskSpecAttempts.workflowId, context.workflow.id), inArray(taskSpecAttempts.state, ACTIVE_ATTEMPT_STATES))).limit(1);
  if (active) throw new TaskError("attempt_active");
}

export async function assembleInput(context: ActionContext, extras: { stage: SpecStage; reviewedPackageId?: string | null; adjustment?: string | null }): Promise<StoredSpecInput> {
  const { db, task, workflow } = context;
  const projection = await readPlanningProjection(db, task.id);
  const stages = await db.select().from(taskSpecStages).where(eq(taskSpecStages.workflowId, workflow.id));
  const { publication, decision } = projection;
  if (!publication || !decision) throw new TaskError("planning_required");
  return buildSpecInput({ taskId: task.id, projectId: task.projectId, stage: extras.stage, publicationId: publication.attemptId, planningDecisionId: decision.id, selectedRoute: workflow.selectedRoute as SpecRoute, repositoryGithubId: task.repositoryId, publication: { issueNumber: publication.issueNumber, title: publication.title, bodyMarkdown: publication.bodyMarkdown }, planningUncertainties: decision.uncertainties, upstreamPackageIds: stages.filter((row) => row.approvedPackageId).map((row) => row.approvedPackageId!), reviewedPackageId: extras.reviewedPackageId, adjustment: extras.adjustment });
}

export async function queueAttempt(context: ActionContext, spec: { stage: SpecStage; kind: "adjust" | "retry"; sourceAttemptId: string; input: StoredSpecInput }) {
  const { db, workflow } = context;
  await assertCapacity(db);
  const [latest] = await db.select({ number: sql<number>`coalesce(max(${taskSpecAttempts.attemptNumber}), 0)::int` }).from(taskSpecAttempts).where(eq(taskSpecAttempts.workflowId, workflow.id));
  const [attempt] = await db.insert(taskSpecAttempts).values({ workflowId: workflow.id, stage: spec.stage, attemptNumber: (latest?.number ?? 0) + 1, kind: spec.kind, sourceAttemptId: spec.sourceAttemptId, input: spec.input, inputHash: specInputHash(spec.input) }).returning({ id: taskSpecAttempts.id });
  await db.update(taskSpecStages).set({ state: "queued", currentAttemptId: attempt!.id, version: sql`${taskSpecStages.version} + 1`, updatedAt: new Date() }).where(and(eq(taskSpecStages.workflowId, workflow.id), eq(taskSpecStages.stage, spec.stage)));
  return attempt!.id;
}

export async function bumpWorkflow(db: Database, workflowId: string, state?: string) {
  const [row] = await db.update(taskSpecWorkflows).set({ version: sql`${taskSpecWorkflows.version} + 1`, ...(state ? { state } : {}), updatedAt: new Date() }).where(eq(taskSpecWorkflows.id, workflowId)).returning({ version: taskSpecWorkflows.version });
  return row!.version;
}

export async function currentStage(db: Database, workflowId: string, stage: SpecStage) {
  const [row] = await db.select().from(taskSpecStages).where(and(eq(taskSpecStages.workflowId, workflowId), eq(taskSpecStages.stage, stage)));
  if (!row) throw new TaskError("spec_unavailable");
  return row;
}

export async function latestAttemptRow(db: Database, workflowId: string, attemptId: string) {
  const [row] = await db.select().from(taskSpecAttempts).where(and(eq(taskSpecAttempts.workflowId, workflowId), eq(taskSpecAttempts.id, attemptId))).orderBy(desc(taskSpecAttempts.attemptNumber)).limit(1);
  if (!row) throw new TaskError("spec_unavailable");
  return row;
}
