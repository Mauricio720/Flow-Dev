import { createHash } from "node:crypto";
import type { IssueContextDao } from "../../application/database/dao/issueContextDao";
import { TaskError } from "../../application/services/tasks/taskErrors";

export async function projectOfExecution(dao: IssueContextDao, executionId: string, capability: string) {
  const capabilityHash = createHash("sha256").update(capability).digest("hex");
  const context = await dao.execution(executionId, capabilityHash, new Date());
  if (!context) throw new TaskError("stale_execution");
  return context.projectId;
}
