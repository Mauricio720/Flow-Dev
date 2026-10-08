import { desc, eq } from "drizzle-orm";
import { selectionSource } from "../../../../application/services/tasks/planningRules";
import { assertApprovable, assertSelectable, isApprovalReplay } from "../../../../application/services/tasks/planningTransitions";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import type { PlanningCommandResult, PlanningCommandTarget } from "../../../../application/database/dao/taskPlanningDao";
import type { PlanningRoute } from "../../../../application/services/tasks/planningContracts";
import { taskPlanningDecisions, tasks } from "../../schema";
import type { Database } from "../../client";
import { findPlanningReplay, findPlanningTask, savePlanningReceipt } from "./planningReceiptHelpers";
import { requirePlanningOperator } from "./planningOperatorGuard";
import { assertDecisionCurrent } from "./planningDecisionCurrent";

type ReviewTarget = PlanningCommandTarget & { expectedVersion: number; expectedDecisionVersion: number; decisionId: string };

export function savePlanningRoute(database: Database, input: ReviewTarget & { selectedRoute: PlanningRoute }): Promise<PlanningCommandResult> {
  return database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    const task = await findPlanningTask(db, input);
    await requirePlanningOperator(db, { taskId: task.id, actorUserId: input.actorUserId });
    const replay = await findPlanningReplay(db, input, "planning.selectRoute");
    if (replay) return { ...replay, replayed: true };
    const decision = await findDecision(db, { ...input, pointer: task.planningDecisionId });
    if (decision) await assertDecisionCurrent(db, decision);
    assertSelectable(task, decision && asState(decision), input);
    if (!decision) throw new TaskError("planning_not_ready");
    const changed = decision.selectedRoute !== input.selectedRoute;
    const version = changed ? decision.version + 1 : decision.version;
    if (changed) await tx.update(taskPlanningDecisions).set({ selectedRoute: input.selectedRoute, decisionSource: selectionSource(decision.recommendedRoute as PlanningRoute, input.selectedRoute), version }).where(eq(taskPlanningDecisions.id, decision.id));
    const receipt = { taskId: task.id, operationId: task.planningOperationId, decisionId: decision.id, version: changed ? task.version + 1 : task.version, decisionVersion: version };
    if (changed) await tx.update(tasks).set({ version: receipt.version, updatedAt: new Date() }).where(eq(tasks.id, task.id));
    await savePlanningReceipt(db, input, "planning.selectRoute", receipt);
    return { ...receipt, replayed: false };
  });
}

export function approvePlanningRoute(database: Database, input: ReviewTarget & { reviewedRoute: PlanningRoute }): Promise<PlanningCommandResult> {
  return database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    const task = await findPlanningTask(db, input);
    await requirePlanningOperator(db, { taskId: task.id, actorUserId: input.actorUserId });
    const replay = await findPlanningReplay(db, input, "planning.approve");
    if (replay) return { ...replay, replayed: true };
    const decision = await findDecision(db, { ...input, pointer: task.planningDecisionId });
    if (decision && decision.status === "review") await assertDecisionCurrent(db, decision);
    if (decision && isApprovalReplay(asState(decision), input)) return { ...await approvedReceipt(db, input, task, decision), replayed: false };
    assertApprovable(task, decision && asState(decision), input);
    if (!decision) throw new TaskError("planning_not_ready");
    const at = new Date();
    await tx.update(taskPlanningDecisions).set({ status: "approved", approvedByUserId: input.actorUserId, approvedAt: at }).where(eq(taskPlanningDecisions.id, decision.id));
    const receipt = { taskId: task.id, operationId: task.planningOperationId, decisionId: decision.id, version: task.version + 1, decisionVersion: decision.version };
    await tx.update(tasks).set({ planningStatus: "approved", version: receipt.version, updatedAt: at }).where(eq(tasks.id, task.id));
    await savePlanningReceipt(db, input, "planning.approve", receipt);
    return { ...receipt, replayed: false };
  });
}

async function findDecision(database: Database, input: { taskId: string; decisionId: string; pointer: string | null }) {
  const where = input.pointer ? eq(taskPlanningDecisions.id, input.pointer) : eq(taskPlanningDecisions.taskId, input.taskId);
  const decision = (await database.select().from(taskPlanningDecisions).where(where).orderBy(desc(taskPlanningDecisions.createdAt)).limit(1).for("update"))[0] ?? null;
  if (decision && decision.id !== input.decisionId) throw new TaskError("decision_unavailable");
  return decision;
}

function asState(decision: typeof taskPlanningDecisions.$inferSelect) {
  return { id: decision.id, version: decision.version, status: decision.status, selectedRoute: decision.selectedRoute as PlanningRoute };
}

async function approvedReceipt(database: Database, input: PlanningCommandTarget, task: Awaited<ReturnType<typeof findPlanningTask>>, decision: typeof taskPlanningDecisions.$inferSelect) {
  const receipt = { taskId: task.id, operationId: task.planningOperationId, decisionId: decision.id, version: task.version, decisionVersion: decision.version };
  await savePlanningReceipt(database, input, "planning.approve", receipt);
  return receipt;
}
