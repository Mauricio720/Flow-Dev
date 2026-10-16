import { and, desc, eq, isNull } from "drizzle-orm";
import { assertReplannable, type ReplanAction, type ReplanFacts } from "../../../../application/services/tasks/planningReplanRules";
import { decisionMatchesSource } from "../../../../application/services/tasks/planningSourceInput";
import { assertVersion } from "../../../../application/services/tasks/planningTransitions";
import { taskExecutionActions, taskExecutionPlans, taskIssueSources, taskPlanningDecisions } from "../../schema";
import type { Database } from "../../client";
import { loadSource } from "../assigned-issues/sourceRecords";
import { acceptPlanning, type AcceptInput, type PlanningTaskRow } from "./planningStart";

const PLANNED_PLAN_STATUS = "planned";

type LockedPlan = { id: string; revision: number } | null;

export function acceptPlanningReplan(database: Database, input: AcceptInput) {
  return acceptPlanning(database, input, { action: "planning.replan", prepare: async (task, db) => {
    assertVersion(task, input);
    const plan = await lockFlowPlan(db, task.id);
    assertReplannable(await replanFacts(db, task));
    await supersedeFlowActions(db, plan);
  } });
}

export function readFlowActions(database: Database, taskId: string): Promise<ReplanAction[]> {
  return database.select({ kind: taskExecutionActions.kind, state: taskExecutionActions.state }).from(taskExecutionActions).where(and(eq(taskExecutionActions.taskId, taskId), isNull(taskExecutionActions.supersededAt)));
}

async function lockFlowPlan(db: Database, taskId: string): Promise<LockedPlan> {
  const [plan] = await db.select({ id: taskExecutionPlans.id, revision: taskExecutionPlans.revision }).from(taskExecutionPlans).where(eq(taskExecutionPlans.taskId, taskId)).for("update");
  return plan ?? null;
}

async function replanFacts(db: Database, task: PlanningTaskRow): Promise<ReplanFacts> {
  const decision = await currentDecision(db, task);
  const source = await loadSource(db, eq(taskIssueSources.taskId, task.id));
  const current = source && { snapshotId: source.snapshot.id, publicationAttemptId: source.snapshot.publicationAttemptId };
  const sourceChanged = Boolean(decision && current && !decisionMatchesSource(decision, current));
  return { planningStatus: task.planningStatus, activeOperationId: task.activeOperationId, selectedRoute: decision?.selectedRoute ?? null, sourceChanged, actions: await readFlowActions(db, task.id) };
}

async function currentDecision(db: Database, task: PlanningTaskRow) {
  const where = task.planningDecisionId ? eq(taskPlanningDecisions.id, task.planningDecisionId) : eq(taskPlanningDecisions.taskId, task.id);
  return (await db.select().from(taskPlanningDecisions).where(where).orderBy(desc(taskPlanningDecisions.createdAt)).limit(1))[0];
}

async function supersedeFlowActions(db: Database, plan: LockedPlan) {
  if (!plan) return;
  const now = new Date();
  await db.update(taskExecutionActions).set({ supersededAt: now, updatedAt: now }).where(and(eq(taskExecutionActions.planId, plan.id), isNull(taskExecutionActions.supersededAt)));
  await db.update(taskExecutionPlans).set({ status: PLANNED_PLAN_STATUS, revision: plan.revision + 1, updatedAt: now }).where(eq(taskExecutionPlans.id, plan.id));
}
