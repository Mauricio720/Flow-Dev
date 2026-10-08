import { eq } from "drizzle-orm";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskIssueClaims } from "../../schema";
import type { Database } from "../../client";

export async function requirePlanningOperator(database: Database, input: { taskId: string; actorUserId: string }) {
  const claim = (await database.select().from(taskIssueClaims).where(eq(taskIssueClaims.taskId, input.taskId)).limit(1).for("share"))[0];
  if (claim?.state === "pending" || claim?.state === "uncertain") throw new TaskError("claim_unresolved");
  if (claim?.state !== "claimed" || claim.operatorUserId !== input.actorUserId) throw new TaskError("operator_required");
  return claim;
}
