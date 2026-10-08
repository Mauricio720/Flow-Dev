import { eq } from "drizzle-orm";
import { decisionMatchesSource } from "../../../../application/services/tasks/planningSourceInput";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import type { taskPlanningDecisions } from "../../schema";
import { taskIssueSources } from "../../schema";
import type { Database } from "../../client";
import { loadSource } from "../assigned-issues/sourceRecords";

export async function assertDecisionCurrent(database: Database, decision: typeof taskPlanningDecisions.$inferSelect) {
  const source = await loadSource(database, eq(taskIssueSources.taskId, decision.taskId));
  if (!source) return;
  const current = { snapshotId: source.snapshot.id, publicationAttemptId: source.snapshot.publicationAttemptId };
  if (!decisionMatchesSource(decision, current)) throw new TaskError("source_changed");
}
