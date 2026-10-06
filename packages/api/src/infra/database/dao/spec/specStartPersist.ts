import { and, eq, sql } from "drizzle-orm";
import type { SpecCommandResult, SpecCommandTarget } from "../../../../application/database/dao/taskSpecDao";
import type { SpecRoute, SpecStage } from "../../../../application/services/spec/specContracts";
import { specInputHash, type StoredSpecInput } from "../../../../application/services/spec/specInput";
import { routeStages } from "../../../../application/services/spec/specStages";
import { taskSpecAttempts, taskSpecStages, taskSpecWorkflows } from "../../schema";
import type { Database } from "../../client";
import { saveCommand, type SpecTask, type SpecWorkflowRow } from "./specCommandHelpers";

type Context = { target: SpecCommandTarget & { stage: SpecStage }; task: SpecTask; workflow: SpecWorkflowRow | null; input: StoredSpecInput; route: SpecRoute; publicationId: string; decisionId: string };

export async function persistSpecStart(db: Database, context: Context): Promise<SpecCommandResult> {
  const workflow = context.workflow ? await advanceWorkflow(db, context) : await createWorkflow(db, context);
  const attemptId = await insertAttempt(db, workflow.id, context);
  await db.update(taskSpecStages).set({ state: "queued", currentAttemptId: attemptId, version: sql`${taskSpecStages.version} + 1`, updatedAt: new Date() }).where(and(eq(taskSpecStages.workflowId, workflow.id), eq(taskSpecStages.stage, context.target.stage)));
  return saveCommand(db, { target: context.target, action: "spec.start", workflowId: workflow.id, specVersion: workflow.version, payload: { stage: context.target.stage }, attemptId });
}

async function createWorkflow(db: Database, context: Context) {
  const { task, route } = context;
  const [workflow] = await db.insert(taskSpecWorkflows).values({ taskId: task.id, projectId: task.projectId, authorUserId: task.authorUserId, publicationId: context.publicationId, planningDecisionId: context.decisionId, selectedRoute: route, currentStage: context.target.stage }).returning();
  await db.insert(taskSpecStages).values(routeStages(route).map((stage) => ({ workflowId: workflow!.id, stage })));
  return workflow!;
}

async function advanceWorkflow(db: Database, context: Context) {
  const [workflow] = await db.update(taskSpecWorkflows).set({ version: sql`${taskSpecWorkflows.version} + 1`, currentStage: context.target.stage, state: "queued", updatedAt: new Date() }).where(eq(taskSpecWorkflows.id, context.workflow!.id)).returning();
  return workflow!;
}

async function insertAttempt(db: Database, workflowId: string, context: Context) {
  const [latest] = await db.select({ number: sql<number>`coalesce(max(${taskSpecAttempts.attemptNumber}), 0)::int` }).from(taskSpecAttempts).where(eq(taskSpecAttempts.workflowId, workflowId));
  const [attempt] = await db.insert(taskSpecAttempts).values({ workflowId, stage: context.target.stage, attemptNumber: (latest?.number ?? 0) + 1, kind: "generate", input: context.input, inputHash: specInputHash(context.input) }).returning({ id: taskSpecAttempts.id });
  return attempt!.id;
}
