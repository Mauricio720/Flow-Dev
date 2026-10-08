import { and, eq, sql } from "drizzle-orm";
import type { SpecCommandPayload, SpecCommandResult, SpecCommandTarget } from "../../../../application/database/dao/taskSpecDao";
import type { SpecAction, SpecRoute, SpecStage } from "../../../../application/services/spec/specContracts";
import { assertStagePrerequisite } from "../../../../application/services/spec/specStages";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecAttempts, taskSpecInteractions, taskSpecPackages, taskSpecStages, taskSpecWorkflows } from "../../schema";
import type { Database } from "../../client";
import { assertApprovable } from "./specApproveGate";
import { assertOperator, assertVersion, findReplay, lockSpecTask, lockSpecWorkflow, saveCommand, type SpecWorkflowRow } from "./specCommandHelpers";

const APPROVED_STATE = "approved";

type AcceptInput = SpecCommandTarget & SpecCommandPayload & { action: Exclude<SpecAction, "spec.start"> };

export function acceptSpecCommand(database: Database, input: AcceptInput): Promise<SpecCommandResult> {
  return database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    const task = await lockSpecTask(db, input);
    await assertOperator(db, task, input.actorUserId);
    const replay = await findReplay(db, input, input.action);
    if (replay) return replay;
    const workflow = await lockSpecWorkflow(db, task.id);
    if (!workflow) throw new TaskError("spec_unavailable");
    assertVersion(workflow, input.expectedSpecVersion);
    const targets = await resolveTargets(db, workflow, input);
    const [bumped] = await db.update(taskSpecWorkflows).set({ version: sql`${taskSpecWorkflows.version} + 1`, updatedAt: new Date() }).where(eq(taskSpecWorkflows.id, workflow.id)).returning({ version: taskSpecWorkflows.version });
    return saveCommand(db, { target: input, action: input.action, workflowId: workflow.id, specVersion: bumped!.version, payload: input.payload, ...targets });
  });
}

async function resolveTargets(db: Database, workflow: SpecWorkflowRow, input: AcceptInput) {
  if (input.stage) await assertStageOpen(db, workflow, input.stage);
  if (input.action === "spec.approve" && input.stage && input.packageId) await assertApprovable(db, workflow, { action: input.action, stage: input.stage, packageId: input.packageId, manifestHash: input.payload.manifestHash });
  const attemptId = await findAttempt(db, workflow.id, input.attemptId ?? input.failedAttemptId);
  const packageId = await findPackage(db, workflow.id, input);
  if (input.interactionId) await assertInteraction(db, { workflowId: workflow.id, attemptId, interactionId: input.interactionId });
  return { attemptId, packageId };
}

async function findAttempt(db: Database, workflowId: string, attemptId: string | undefined) {
  if (!attemptId) return null;
  const [row] = await db.select({ id: taskSpecAttempts.id }).from(taskSpecAttempts).where(and(eq(taskSpecAttempts.workflowId, workflowId), eq(taskSpecAttempts.id, attemptId))).limit(1);
  if (!row) throw new TaskError("spec_unavailable");
  return row.id;
}

async function findPackage(db: Database, workflowId: string, input: AcceptInput) {
  if (!input.packageId) return null;
  const [row] = await db.select().from(taskSpecPackages).where(and(eq(taskSpecPackages.workflowId, workflowId), eq(taskSpecPackages.id, input.packageId))).limit(1);
  if (!row) throw new TaskError("spec_unavailable");
  if (input.payload.manifestHash !== undefined && input.payload.manifestHash !== row.manifestHash) throw new TaskError("spec_conflict");
  return row.id;
}

async function assertInteraction(db: Database, scope: { workflowId: string; attemptId: string | null; interactionId: string }) {
  const { workflowId, attemptId, interactionId } = scope;
  const [row] = await db.select({ status: taskSpecInteractions.status }).from(taskSpecInteractions).where(and(eq(taskSpecInteractions.workflowId, workflowId), eq(taskSpecInteractions.attemptId, attemptId ?? ""), eq(taskSpecInteractions.id, interactionId))).limit(1);
  if (!row) throw new TaskError("spec_unavailable");
  if (row.status !== "pending") throw new TaskError("interaction_resolved");
}

async function assertStageOpen(db: Database, workflow: SpecWorkflowRow, stage: SpecStage) {
  const rows = await db.select().from(taskSpecStages).where(eq(taskSpecStages.workflowId, workflow.id));
  const approved = rows.filter((row) => row.state === APPROVED_STATE).map((row) => row.stage as SpecStage);
  assertStagePrerequisite({ route: workflow.selectedRoute as SpecRoute, stage, approved });
  if (approved.includes(stage)) throw new TaskError("stage_approved");
}
