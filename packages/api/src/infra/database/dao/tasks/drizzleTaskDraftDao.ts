import { and, desc, eq } from "drizzle-orm";
import type { TaskDao } from "../../../../application/database/dao/taskDao";
import { applySelectedFields, changedDraftPaths } from "../../../../application/services/tasks/draftMerge";
import { parseIssueDraft } from "../../../../application/services/tasks/draftRules";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskDraftRevisions, taskOperations, tasks } from "../../schema";
import type { Database } from "../../client";
import { findTask, payloadHash } from "./taskCommandHelpers";
import { toTaskRevision } from "./taskDaoMapping";
import { findSavedDraft, findSavedResolution, insertDraftReceipt } from "./taskDraftReceipt";

export class DrizzleTaskDraftDao {
  constructor(private readonly database: Database) {}
  async saveDraft(input: Parameters<TaskDao["saveDraft"]>[0]) { return this.database.transaction(async (tx) => saveDraft(tx as unknown as Database, input)); }
  async resolveRefinement(input: Parameters<TaskDao["resolveRefinement"]>[0]) { return this.database.transaction(async (tx) => resolveRefinement(tx as unknown as Database, input)); }
}

async function saveDraft(database: Database, input: Parameters<TaskDao["saveDraft"]>[0]) {
  const hash = payloadHash([input.projectId, input.taskId, input.expectedVersion, input.baseRevisionId, input.draft, input.evidenceBindings]);
  const replay = await findSavedDraft(database, input, hash);
  if (replay) return replay;
  const task = await findTask(database, input.projectId, input.taskId);
  if (task.authorUserId !== input.actorUserId) throw new TaskError("author_required");
  if (task.version !== input.expectedVersion || task.currentRevisionId !== input.baseRevisionId) throw new TaskError("revision_conflict");
  if (task.activeOperationId) throw new TaskError("operation_active");
  if (task.pendingProposalOperationId) throw new TaskError("refinement_pending");
  if (["published", "publication_uncertain"].includes(task.status)) throw new TaskError("task_complete");
  const current = await readDraft(database, task.id, task.currentRevisionId);
  const revision = await insertRevision(database, { taskId: task.id, parentRevisionId: task.currentRevisionId, createdByUserId: input.actorUserId, draft: input.draft, evidenceBindings: input.evidenceBindings, manuallyEditedPaths: changedDraftPaths(current, input.draft) });
  await updateCurrentRevision(database, task.id, input.expectedVersion, revision.id, input.draft.title);
  await insertDraftReceipt(database, input, "saveDraft", hash, task.id, revision.id, input.expectedVersion + 1);
  return toTaskRevision(revision);
}

async function resolveRefinement(database: Database, input: Parameters<TaskDao["resolveRefinement"]>[0]) {
  const hash = payloadHash([input.projectId, input.taskId, input.expectedVersion, input.proposalOperationId, input.decision, input.selectedPaths]);
  const replay = await findSavedResolution(database, input, hash);
  if (replay) return replay;
  const task = await findTask(database, input.projectId, input.taskId);
  if (task.authorUserId !== input.actorUserId) throw new TaskError("author_required");
  if (task.version !== input.expectedVersion) throw new TaskError("revision_conflict");
  const operation = (await database.select().from(taskOperations).where(and(eq(taskOperations.taskId, task.id), eq(taskOperations.id, input.proposalOperationId))).limit(1))[0];
  if (!operation || operation.state !== "succeeded" || operation.proposalResolution !== "pending") throw new TaskError("stale_proposal");
  if (task.currentRevisionId !== operation.baseRevisionId) throw new TaskError("revision_conflict");
  if (input.decision === "discard") return discardProposal(database, task.id, operation.id, input, hash);
  return applyProposal(database, task.id, operation, input, hash);
}

async function applyProposal(database: Database, taskId: string, operation: typeof taskOperations.$inferSelect, input: Parameters<TaskDao["resolveRefinement"]>[0], hash: string) {
  const current = await readDraft(database, taskId, operation.baseRevisionId);
  const proposal = await readProposal(database, taskId, operation.id);
  const merged = applySelectedFields(current, proposal.draft, input.selectedPaths);
  const revision = await insertRevision(database, { taskId, parentRevisionId: operation.baseRevisionId, operationId: operation.id, createdByUserId: input.actorUserId, draft: merged, evidenceBindings: proposal.evidenceBindings });
  await database.update(taskOperations).set({ proposalResolution: "applied" }).where(eq(taskOperations.id, operation.id));
  await database.update(tasks).set({ currentRevisionId: revision.id, pendingProposalOperationId: null, title: merged.title, version: input.expectedVersion + 1, updatedAt: new Date() }).where(and(eq(tasks.id, taskId), eq(tasks.version, input.expectedVersion)));
  await insertDraftReceipt(database, input, "resolveRefinement", hash, taskId, revision.id, input.expectedVersion + 1);
  return { revision: toTaskRevision(revision), version: input.expectedVersion + 1 };
}

async function discardProposal(database: Database, taskId: string, operationId: string, input: Parameters<TaskDao["resolveRefinement"]>[0], hash: string) {
  await database.update(taskOperations).set({ proposalResolution: "discarded" }).where(eq(taskOperations.id, operationId));
  await database.update(tasks).set({ pendingProposalOperationId: null, version: input.expectedVersion + 1, updatedAt: new Date() }).where(and(eq(tasks.id, taskId), eq(tasks.version, input.expectedVersion)));
  await insertDraftReceipt(database, input, "resolveRefinement", hash, taskId, null, input.expectedVersion + 1);
  return { revision: null, version: input.expectedVersion + 1 };
}

async function readDraft(database: Database, taskId: string, revisionId: string | null) {
  if (!revisionId) throw new TaskError("stale_proposal");
  const row = (await database.select({ canonicalDraft: taskDraftRevisions.canonicalDraft }).from(taskDraftRevisions).where(and(eq(taskDraftRevisions.taskId, taskId), eq(taskDraftRevisions.id, revisionId))).limit(1))[0];
  if (!row) throw new TaskError("invalid_stored_content");
  return parseIssueDraft(row.canonicalDraft);
}

async function readProposal(database: Database, taskId: string, operationId: string) {
  const row = (await database.select({ canonicalDraft: taskDraftRevisions.canonicalDraft, evidenceBindings: taskDraftRevisions.evidenceBindings }).from(taskDraftRevisions).where(and(eq(taskDraftRevisions.taskId, taskId), eq(taskDraftRevisions.operationId, operationId))).limit(1))[0];
  if (!row) throw new TaskError("invalid_stored_content");
  return { draft: parseIssueDraft(row.canonicalDraft), evidenceBindings: row.evidenceBindings as unknown[] };
}

async function insertRevision(database: Database, input: { taskId: string; parentRevisionId: string | null; operationId?: string; createdByUserId: string; draft: unknown; evidenceBindings: unknown[]; manuallyEditedPaths?: string[] }) {
  const previous = await database.select({ revisionNumber: taskDraftRevisions.revisionNumber }).from(taskDraftRevisions).where(eq(taskDraftRevisions.taskId, input.taskId)).orderBy(desc(taskDraftRevisions.revisionNumber)).limit(1);
  const [revision] = await database.insert(taskDraftRevisions).values({ taskId: input.taskId, revisionNumber: (previous[0]?.revisionNumber ?? 0) + 1, parentRevisionId: input.parentRevisionId, operationId: input.operationId, canonicalDraft: input.draft, evidenceBindings: input.evidenceBindings, manuallyEditedPaths: input.manuallyEditedPaths ?? [], createdByUserId: input.createdByUserId }).returning();
  if (!revision) throw new TaskError("service_unavailable");
  return revision;
}

async function updateCurrentRevision(database: Database, taskId: string, expectedVersion: number, revisionId: string, title: string) {
  const updated = await database.update(tasks).set({ currentRevisionId: revisionId, title, version: expectedVersion + 1, status: "draft_ready", updatedAt: new Date() }).where(and(eq(tasks.id, taskId), eq(tasks.version, expectedVersion))).returning({ id: tasks.id });
  if (!updated.length) throw new TaskError("revision_conflict");
}
