import { and, eq } from "drizzle-orm";
import type { ApprovedPlanning } from "../../../../application/database/dao/terminalSessionDao";
import type { PlanningComplexity, PlanningRoute } from "../../../../application/services/tasks/planningContracts";
import type { Database } from "../../client";
import { taskIssueSnapshots, taskIssueSources, taskPlanningDecisions, taskPublicationAttempts, tasks } from "../../schema";
import { DrizzleRouteSwitchDao } from "./drizzleRouteSwitchDao";
import { effectiveRoute } from "../../../../application/services/tasks/routeSwitchRules";

const APPROVED_STATUS = "approved";
type Decision = typeof taskPlanningDecisions.$inferSelect;

async function readSnapshotIssue(database: Database, snapshotId: string) {
  const [row] = await database
    .select({ number: taskIssueSources.issueNumber, url: taskIssueSources.issueUrl, title: taskIssueSnapshots.title, body: taskIssueSnapshots.bodyMarkdown })
    .from(taskIssueSnapshots)
    .innerJoin(taskIssueSources, eq(taskIssueSources.id, taskIssueSnapshots.sourceId))
    .where(eq(taskIssueSnapshots.id, snapshotId))
    .limit(1);
  return row ?? null;
}

async function readAttemptIssue(database: Database, attemptId: string) {
  const [row] = await database.select().from(taskPublicationAttempts).where(eq(taskPublicationAttempts.id, attemptId)).limit(1);
  if (!row || row.issueNumber === null || row.issueUrl === null) return null;
  return { number: row.issueNumber, url: row.issueUrl, title: row.titleSnapshot, body: row.bodySnapshot };
}

function readIssue(database: Database, decision: Decision) {
  if (decision.sourceSnapshotId) return readSnapshotIssue(database, decision.sourceSnapshotId);
  return decision.publicationAttemptId ? readAttemptIssue(database, decision.publicationAttemptId) : Promise.resolve(null);
}

export async function readApprovedPlanning(database: Database, taskId: string): Promise<ApprovedPlanning | null> {
  const [task] = await database.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task || task.planningStatus !== APPROVED_STATUS || !task.planningDecisionId) return null;
  const filter = and(eq(taskPlanningDecisions.id, task.planningDecisionId), eq(taskPlanningDecisions.status, APPROVED_STATUS));
  const [decision] = await database.select().from(taskPlanningDecisions).where(filter).limit(1);
  if (!decision) return null;
  const issue = await readIssue(database, decision);
  if (!issue) return null;
  const confirmedSwitch = await new DrizzleRouteSwitchDao(database).findConfirmedForDecision(decision.id);
  const approvedRoute = decision.selectedRoute as PlanningRoute;
  const route = effectiveRoute({ approvedRoute, currentDecisionId: decision.id, confirmedSwitch });
  return { decisionId: decision.id, route, switchedFrom: confirmedSwitch?.fromRoute ?? null, complexity: decision.complexity as PlanningComplexity, reasons: decision.reasons, uncertainties: decision.uncertainties, issue };
}
