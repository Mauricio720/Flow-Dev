import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { WorkerClaim } from "../../../../application/database/dao/taskOperationDao";
import type { GenerationEnvelope, ToolOutcome } from "../../../../application/issue-author/issueAuthorGateway";
import { validatePublicationDraft } from "../../../../application/services/tasks/draftRules";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskContextCapabilities, taskDraftRevisions, taskEvidence, taskMessages, taskOperations, taskToolActivity, tasks } from "../../schema";
import type { Database } from "../../client";
import { bindGeneratedDraft } from "./generationEvidenceBindings";
import { loadBindableEvidence } from "./retainedEvidence";
import { authorOf } from "./authorOf";

export async function lockOperation(database: Database, claim: WorkerClaim) {
  const operation = (await database.select().from(taskOperations).where(and(eq(taskOperations.id, claim.operationId), eq(taskOperations.taskId, claim.taskId), eq(taskOperations.state, "running"), eq(taskOperations.leaseOwner, claim.workerId), eq(taskOperations.executionId, claim.executionId), eq(taskOperations.fence, claim.fence))).limit(1).for("update"))[0];
  if (!operation) throw new TaskError("stale_execution");
  return operation;
}

export async function verifyActivity(database: Database, claim: WorkerClaim, envelope: GenerationEnvelope) {
  const persisted = await database.select().from(taskToolActivity).where(eq(taskToolActivity.executionId, claim.executionId)).orderBy(asc(taskToolActivity.sequence));
  if (persisted.length !== envelope.activity.length) throw new TaskError("invalid_agent_activity");
  for (const item of envelope.activity) {
    const row = persisted.find((entry) => entry.toolCallId === item.toolCallId);
    if (!row || row.status !== item.status || row.durationMs !== item.durationMs || !sameIds(row.evidenceIds, item.evidenceIds) || row.reason !== (item.reason ?? null)) throw new TaskError("invalid_agent_activity");
  }
  const requestedEvidenceIds = envelope.activity.flatMap((item) => item.evidenceIds);
  const savedEvidence = requestedEvidenceIds.length ? await database.select({ id: taskEvidence.id }).from(taskEvidence).where(and(eq(taskEvidence.taskId, claim.taskId), eq(taskEvidence.operationId, claim.operationId), inArray(taskEvidence.id, requestedEvidenceIds))) : [];
  if (savedEvidence.length !== new Set(requestedEvidenceIds).size) throw new TaskError("invalid_agent_activity");
}

function sameIds(left: string[], right: string[]) { return left.length === right.length && left.every((id) => right.includes(id)); }

export async function storeClarification(database: Database, claim: WorkerClaim, task: typeof tasks.$inferSelect, operation: typeof taskOperations.$inferSelect, question: string, activity: unknown[]) {
  await appendAssistantMessage(database, claim.taskId, claim.operationId, question);
  await finishOperation(database, claim, "succeeded", { status: "needs_clarification", question, activity });
  await database.update(tasks).set({ status: "awaiting_clarification", activeOperationId: null, lastError: null, version: task.version + 1, updatedAt: new Date() }).where(eq(tasks.id, task.id));
  await revokeCapability(database, claim);
  return operation.id;
}

export async function storeDraft(database: Database, claim: WorkerClaim, task: typeof tasks.$inferSelect, operation: typeof taskOperations.$inferSelect, envelope: GenerationEnvelope) {
  const draft = envelope.result.status === "draft_ready" ? envelope.result.draft : null;
  if (!draft || task.version !== operation.baseTaskVersion) throw new TaskError("stale_execution");
  try { validatePublicationDraft(draft); } catch { throw new TaskError("invalid_agent_output"); }
  const prior = operation.baseRevisionId ? (await database.select({ evidenceBindings: taskDraftRevisions.evidenceBindings }).from(taskDraftRevisions).where(and(eq(taskDraftRevisions.taskId, task.id), eq(taskDraftRevisions.id, operation.baseRevisionId))).limit(1))[0]?.evidenceBindings : [];
  const evidence = await loadBindableEvidence(database, { taskId: task.id, operationId: claim.operationId, priorBindings: prior });
  const bindings = bindGeneratedDraft(draft, task.repositoryId, claim.operationId, evidence, prior);
  const revision = await createRevision(database, claim, task, operation, draft, bindings);
  await appendAssistantMessage(database, claim.taskId, claim.operationId, JSON.stringify(draft));
  await finishOperation(database, claim, "succeeded", { ...envelope, result: { status: "draft_ready", draft } });
  const isRefinement = operation.baseRevisionId !== null;
  if (isRefinement) await database.update(taskOperations).set({ proposalResolution: "pending" }).where(eq(taskOperations.id, operation.id));
  await database.update(tasks).set(isRefinement ? { status: "draft_ready", pendingProposalOperationId: operation.id, activeOperationId: null, lastError: null, version: task.version + 1, updatedAt: new Date() } : { status: "draft_ready", currentRevisionId: revision.id, title: draft.title, activeOperationId: null, lastError: null, version: task.version + 1, updatedAt: new Date() }).where(eq(tasks.id, task.id));
  await revokeCapability(database, claim);
}

async function createRevision(database: Database, claim: WorkerClaim, task: typeof tasks.$inferSelect, operation: typeof taskOperations.$inferSelect, draft: unknown, bindings: unknown[]) {
  const last = (await database.select({ revisionNumber: taskDraftRevisions.revisionNumber }).from(taskDraftRevisions).where(eq(taskDraftRevisions.taskId, task.id)).orderBy(desc(taskDraftRevisions.revisionNumber)).limit(1))[0];
  const [revision] = await database.insert(taskDraftRevisions).values({ taskId: task.id, revisionNumber: (last?.revisionNumber ?? 0) + 1, parentRevisionId: operation.baseRevisionId, operationId: claim.operationId, canonicalDraft: draft, evidenceBindings: bindings, manuallyEditedPaths: [], createdByUserId: authorOf(task) }).returning({ id: taskDraftRevisions.id });
  if (!revision) throw new TaskError("service_unavailable");
  return revision;
}

async function appendAssistantMessage(database: Database, taskId: string, operationId: string, content: string) {
  const last = (await database.select({ sequence: taskMessages.sequence }).from(taskMessages).where(eq(taskMessages.taskId, taskId)).orderBy(desc(taskMessages.sequence)).limit(1))[0];
  await database.insert(taskMessages).values({ taskId, operationId, sequence: (last?.sequence ?? 0) + 1, role: "assistant", kind: "result", content });
}

async function finishOperation(database: Database, claim: WorkerClaim, state: "succeeded", result: unknown) { await database.update(taskOperations).set({ state, result, leaseOwner: null, leaseUntil: null, updatedAt: new Date() }).where(eq(taskOperations.id, claim.operationId)); }
export async function revokeCapability(database: Database, claim: WorkerClaim) { await database.delete(taskContextCapabilities).where(and(eq(taskContextCapabilities.operationId, claim.operationId), eq(taskContextCapabilities.executionId, claim.executionId), eq(taskContextCapabilities.fence, claim.fence))); }
