import { desc, eq } from "drizzle-orm";
import { assertReplannable, type ReplanFacts } from "../../../../application/services/tasks/planningReplanRules";
import { decisionMatchesSource } from "../../../../application/services/tasks/planningSourceInput";
import { assertVersion } from "../../../../application/services/tasks/planningTransitions";
import { taskIssueSources, taskPlanningDecisions } from "../../schema";
import type { Database } from "../../client";
import { loadSource } from "../assigned-issues/sourceRecords";
import { acceptPlanning, type AcceptInput, type PlanningTaskRow } from "./planningStart";

export function acceptPlanningReplan(database: Database, input: AcceptInput) {
  return acceptPlanning(database, input, { action: "planning.replan", prepare: async (task, db) => {
    assertVersion(task, input);
    assertReplannable(await replanFacts(db, task));
  } });
}

async function replanFacts(db: Database, task: PlanningTaskRow): Promise<ReplanFacts> {
  const decision = await currentDecision(db, task);
  const source = await loadSource(db, eq(taskIssueSources.taskId, task.id));
  const current = source && { snapshotId: source.snapshot.id, publicationAttemptId: source.snapshot.publicationAttemptId };
  const sourceChanged = Boolean(decision && current && !decisionMatchesSource(decision, current));
  return { planningStatus: task.planningStatus, activeOperationId: task.activeOperationId, sourceChanged };
}

async function currentDecision(db: Database, task: PlanningTaskRow) {
  const where = task.planningDecisionId ? eq(taskPlanningDecisions.id, task.planningDecisionId) : eq(taskPlanningDecisions.taskId, task.id);
  return (await db.select().from(taskPlanningDecisions).where(where).orderBy(desc(taskPlanningDecisions.createdAt)).limit(1))[0];
}
