import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import type { PublicationApproval, PublicationAccepted } from "../../../../application/database/dao/taskPublicationDao";
import { taskCaptureLeases, taskCommandReceipts, taskOperations, taskPublicationAttempts, tasks } from "../../schema";
import type { Database } from "../../client";
import { payloadHash } from "./taskCommandHelpers";

export async function approveTaskPublication(database: Database, input: PublicationApproval): Promise<PublicationAccepted> {
  return database.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.actorUserId}, 1))`);
    const hash = payloadHash(approvalPayload(input));
    const replay = await findReplay(tx as unknown as Database, input, hash);
    if (replay) return { ...replay, created: false };
    const task = (await tx.select().from(tasks).where(and(eq(tasks.projectId, input.projectId), eq(tasks.id, input.taskId))).limit(1).for("update"))[0];
    assertApprovable(task, input);
    await assertNoCapture(tx as unknown as Database, input);
    const operationId = crypto.randomUUID();
    const attemptId = crypto.randomUUID();
    const version = input.expectedVersion + 1;
    await tx.insert(taskOperations).values({ id: operationId, taskId: input.taskId, kind: "publish", state: "queued", initiatedSessionId: input.sessionId, baseTaskVersion: input.expectedVersion, baseRevisionId: input.revisionId });
    await tx.insert(taskPublicationAttempts).values({ id: attemptId, taskId: input.taskId, operationId, revisionId: input.revisionId, publisherUserId: input.actorUserId, publisherGithubId: input.publisherGithubId, repositoryId: input.repositoryId, repositoryNodeId: input.repositoryNodeId, approvedOwner: input.owner, approvedName: input.name, previewHash: input.previewHash, titleSnapshot: input.title, bodySnapshot: input.bodyMarkdown, approvalSessionId: input.sessionId });
    const result = { taskId: input.taskId, attemptId, operationId, version, status: "publishing" as const, created: true };
    await tx.update(tasks).set({ status: "publishing", activeOperationId: operationId, lastError: null, version, updatedAt: new Date() }).where(and(eq(tasks.id, input.taskId), eq(tasks.version, input.expectedVersion)));
    await tx.insert(taskCommandReceipts).values({ projectId: input.projectId, actorUserId: input.actorUserId, action: "publish", requestKey: input.requestKey, payloadHash: hash, taskId: input.taskId, operationId, acceptedResult: result });
    return result;
  });
}

export function findAcceptedTaskPublication(database: Database, input: Pick<PublicationApproval, "projectId" | "taskId" | "actorUserId" | "requestKey" | "expectedVersion" | "revisionId" | "repositoryId" | "previewHash">) {
  return findReplay(database, input as PublicationApproval, payloadHash(approvalPayload(input as PublicationApproval)));
}

async function findReplay(database: Database, input: PublicationApproval, hash: string): Promise<PublicationAccepted | null> {
  const row = (await database.select().from(taskCommandReceipts).where(and(eq(taskCommandReceipts.projectId, input.projectId), eq(taskCommandReceipts.actorUserId, input.actorUserId), eq(taskCommandReceipts.action, "publish"), eq(taskCommandReceipts.requestKey, input.requestKey))).limit(1))[0];
  if (!row) return null;
  if (row.payloadHash !== hash) throw new TaskError("request_key_reused");
  return row.acceptedResult as PublicationAccepted;
}

function assertApprovable(task: typeof tasks.$inferSelect | undefined, input: PublicationApproval) {
  if (!task) throw new TaskError("task_unavailable");
  if (task.authorUserId !== input.actorUserId) throw new TaskError("author_required");
  if (task.version !== input.expectedVersion || task.currentRevisionId !== input.revisionId) throw new TaskError("revision_conflict");
  if (task.status !== "draft_ready" || task.activeOperationId) throw new TaskError("operation_active");
  if (task.pendingProposalOperationId) throw new TaskError("refinement_pending");
}

async function assertNoCapture(database: Database, input: PublicationApproval) {
  const active = await database.select({ captureId: taskCaptureLeases.captureId }).from(taskCaptureLeases).where(and(eq(taskCaptureLeases.userId, input.actorUserId), inArray(taskCaptureLeases.state, ["capturing", "processing"]), gt(taskCaptureLeases.expiresAt, new Date())));
  if (active.length) throw new TaskError("capture_active");
}

function approvalPayload(input: PublicationApproval) { return [input.taskId, input.expectedVersion, input.revisionId, input.repositoryId, input.previewHash]; }
