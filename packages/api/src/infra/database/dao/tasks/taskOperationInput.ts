import { and, asc, eq } from "drizzle-orm";
import type { WorkerClaim } from "../../../../application/database/dao/taskOperationDao";
import type { GenerationInput } from "../../../../application/issue-author/issueAuthorGateway";
import { parseIssueDraft } from "../../../../application/services/tasks/draftRules";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskDraftRevisions, taskMessages, taskOperations, tasks } from "../../schema";
import type { Database } from "../../client";
import { loadRetainedEvidence } from "./retainedEvidence";

export async function loadGenerationInput(database: Database, claim: WorkerClaim): Promise<GenerationInput> {
  const operation = await findCurrentOperation(database, claim);
  const [messages, revision, evidence] = await Promise.all([
    database.select({ role: taskMessages.role, content: taskMessages.content }).from(taskMessages).where(eq(taskMessages.taskId, claim.taskId)).orderBy(asc(taskMessages.sequence)),
    operation.baseRevisionId ? database.select({ draft: taskDraftRevisions.canonicalDraft }).from(taskDraftRevisions).where(and(eq(taskDraftRevisions.taskId, claim.taskId), eq(taskDraftRevisions.id, operation.baseRevisionId))).limit(1) : Promise.resolve([]),
    loadRetainedEvidence(database, { taskId: claim.taskId, baseRevisionId: operation.baseRevisionId }),
  ]);
  const currentDraft = revision[0] ? parseIssueDraft(revision[0].draft) : null;
  return { protocolVersion: 1, operationId: claim.operationId, executionId: claim.executionId, messages: messages.map((message) => ({ role: message.role as "user" | "assistant", content: message.content })), currentDraft, baseRevisionId: operation.baseRevisionId, retainedEvidence: evidence, contextCapability: claim.contextCapability };
}

async function findCurrentOperation(database: Database, claim: WorkerClaim) {
  const operation = (await database.select().from(taskOperations).innerJoin(tasks, eq(taskOperations.taskId, tasks.id)).where(and(eq(taskOperations.id, claim.operationId), eq(taskOperations.taskId, claim.taskId), eq(taskOperations.state, "running"), eq(taskOperations.executionId, claim.executionId), eq(taskOperations.fence, claim.fence))).limit(1))[0];
  if (!operation || operation.tasks.activeOperationId !== claim.operationId) throw new TaskError("stale_execution");
  return operation.task_operations;
}
