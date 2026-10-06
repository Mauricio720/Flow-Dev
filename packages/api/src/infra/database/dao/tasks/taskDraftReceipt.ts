import { and, eq } from "drizzle-orm";
import type { TaskDao } from "../../../../application/database/dao/taskDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskCommandReceipts, taskDraftRevisions } from "../../schema";
import type { Database } from "../../client";
import { toTaskRevision } from "./taskDaoMapping";

export async function findSavedResolution(database: Database, input: Parameters<TaskDao["resolveRefinement"]>[0], hash: string) {
  const row = (await database.select().from(taskCommandReceipts).where(and(eq(taskCommandReceipts.projectId, input.projectId), eq(taskCommandReceipts.actorUserId, input.actorUserId), eq(taskCommandReceipts.action, "resolveRefinement"), eq(taskCommandReceipts.requestKey, input.requestKey))).limit(1))[0];
  if (!row) return null;
  if (row.payloadHash !== hash) throw new TaskError("request_key_reused");
  const result = row.acceptedResult as { revisionId: string | null; version: number };
  return { revision: result.revisionId ? await findSavedRevisionById(database, input.taskId, result.revisionId) : null, version: result.version };
}

export async function findSavedDraft(database: Database, input: Parameters<TaskDao["saveDraft"]>[0], hash: string) {
  const row = (await database.select().from(taskCommandReceipts).where(and(eq(taskCommandReceipts.projectId, input.projectId), eq(taskCommandReceipts.actorUserId, input.actorUserId), eq(taskCommandReceipts.action, "saveDraft"), eq(taskCommandReceipts.requestKey, input.requestKey))).limit(1))[0];
  if (!row) return null;
  if (row.payloadHash !== hash) throw new TaskError("request_key_reused");
  const revision = (await database.select().from(taskDraftRevisions).where(and(eq(taskDraftRevisions.taskId, input.taskId), eq(taskDraftRevisions.id, row.revisionId ?? ""))).limit(1))[0];
  if (!revision) throw new TaskError("invalid_stored_content");
  return toTaskRevision(revision);
}

export async function insertDraftReceipt(database: Database, input: { projectId: string; actorUserId: string; requestKey: string }, action: string, hash: string, taskId: string, revisionId: string | null, version: number) {
  await database.insert(taskCommandReceipts).values({ projectId: input.projectId, actorUserId: input.actorUserId, action, requestKey: input.requestKey, payloadHash: hash, taskId, revisionId, acceptedResult: { taskId, revisionId, version } });
}

async function findSavedRevisionById(database: Database, taskId: string, revisionId: string) {
  const row = (await database.select().from(taskDraftRevisions).where(and(eq(taskDraftRevisions.taskId, taskId), eq(taskDraftRevisions.id, revisionId))).limit(1))[0];
  if (!row) throw new TaskError("invalid_stored_content");
  return toTaskRevision(row);
}
