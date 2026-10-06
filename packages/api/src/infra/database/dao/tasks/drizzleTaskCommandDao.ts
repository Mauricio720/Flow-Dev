import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { TaskCommandInput, TaskDao, TaskReceipt, TaskStartInput } from "../../../../application/database/dao/taskDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskCaptureLeases, taskCommandReceipts, taskMessages, taskOperations, tasks } from "../../schema";
import type { Database } from "../../client";
import { assertWritable, findReceipt, findTask, payloadHash, saveReceipt } from "./taskCommandHelpers";
import { assertGenerationCapacity } from "./taskGenerationCapacity";

export class DrizzleTaskCommandDao {
  constructor(private readonly database: Database) {}

  async start(input: TaskStartInput) {
    return this.database.transaction(async (tx) => {
      const hash = payloadHash([input.projectId, input.repositoryId, input.repositoryNodeId, input.message]);
      const saved = await findReceipt(tx as unknown as Database, input, "start", hash);
      if (saved) return saved as TaskReceipt;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.actorUserId}, 1))`);
      await assertNoCapture(tx as unknown as Database, input.actorUserId);
      await assertGenerationCapacity(tx as unknown as Database, { message: input.message });
      const taskId = crypto.randomUUID();
      const operationId = crypto.randomUUID();
      const messageId = crypto.randomUUID();
      const [task] = await tx.insert(tasks).values({ id: taskId, projectId: input.projectId, authorUserId: input.actorUserId, repositoryId: input.repositoryId, repositoryNodeId: input.repositoryNodeId }).returning();
      if (!task) throw new TaskError("service_unavailable");
      await tx.insert(taskMessages).values({ id: messageId, taskId, operationId, sequence: 1, role: "user", kind: "intent", content: input.message });
      await tx.insert(taskOperations).values({ id: operationId, taskId, kind: "generate", state: "queued", initiatedSessionId: input.sessionId, baseTaskVersion: 1, inputMessageId: messageId });
      await tx.update(tasks).set({ activeOperationId: operationId, title: input.message.slice(0, 256), updatedAt: new Date() }).where(eq(tasks.id, taskId));
      const receipt = { taskId, operationId, acceptedMessageId: messageId, version: 1 };
      await saveReceipt(tx as unknown as Database, input, "start", hash, receipt);
      return receipt;
    });
  }

  async send(input: TaskCommandInput, kind: "clarification" | "refinement") {
    return this.database.transaction(async (tx) => {
      const hash = payloadHash([input.projectId, input.taskId, input.expectedVersion, input.message]);
      const saved = await findReceipt(tx as unknown as Database, input, "send", hash);
      if (saved) return saved as TaskReceipt;
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.actorUserId}, 1))`);
      const task = await findTask(tx as unknown as Database, input.projectId, input.taskId);
      assertWritable(task, input);
      await assertNoCapture(tx as unknown as Database, input.actorUserId);
      await assertGenerationCapacity(tx as unknown as Database, { taskId: task.id, baseRevisionId: task.currentRevisionId, message: input.message });
      const last = (await tx.select({ sequence: taskMessages.sequence }).from(taskMessages).where(eq(taskMessages.taskId, task.id)).orderBy(desc(taskMessages.sequence)).limit(1))[0];
      const operationId = crypto.randomUUID();
      const messageId = crypto.randomUUID();
      await tx.insert(taskMessages).values({ id: messageId, taskId: task.id, operationId, sequence: (last?.sequence ?? 0) + 1, role: "user", kind, content: input.message });
      await tx.insert(taskOperations).values({ id: operationId, taskId: task.id, kind: "generate", state: "queued", initiatedSessionId: input.sessionId, baseTaskVersion: input.expectedVersion + 1, baseRevisionId: task.currentRevisionId, inputMessageId: messageId });
      await updateTaskForCommand(tx as unknown as Database, task.id, input, operationId);
      const receipt = { taskId: task.id, operationId, acceptedMessageId: messageId, version: input.expectedVersion + 1 };
      await saveReceipt(tx as unknown as Database, input, "send", hash, receipt);
      return receipt;
    });
  }

  async submission(input: Parameters<TaskDao["submission"]>[0]) {
    const row = (await this.database.select({ acceptedResult: taskCommandReceipts.acceptedResult }).from(taskCommandReceipts).where(and(eq(taskCommandReceipts.projectId, input.projectId), eq(taskCommandReceipts.actorUserId, input.actorUserId), eq(taskCommandReceipts.action, input.action), eq(taskCommandReceipts.requestKey, input.requestKey))).limit(1))[0];
    return row ? row.acceptedResult as TaskReceipt : null;
  }

  async retryGeneration(input: Parameters<TaskDao["retryGeneration"]>[0]) {
    return this.database.transaction(async (tx) => retryGeneration(tx as unknown as Database, input));
  }
}

async function assertNoCapture(database: Database, userId: string) {
  const capture = await database.select({ id: taskCaptureLeases.captureId }).from(taskCaptureLeases).where(and(eq(taskCaptureLeases.userId, userId), inArray(taskCaptureLeases.state, ["capturing", "processing"]), gt(taskCaptureLeases.expiresAt, new Date()))).limit(1);
  if (capture.length) throw new TaskError("capture_active");
}

async function updateTaskForCommand(database: Database, taskId: string, input: Pick<TaskCommandInput, "actorUserId" | "expectedVersion">, operationId: string) {
  const updated = await database.update(tasks).set({ status: "generating", version: input.expectedVersion + 1, activeOperationId: operationId, updatedAt: new Date(), lastError: null }).where(and(eq(tasks.id, taskId), eq(tasks.version, input.expectedVersion), eq(tasks.authorUserId, input.actorUserId))).returning({ id: tasks.id });
  if (!updated.length) throw new TaskError("revision_conflict");
}

async function retryGeneration(database: Database, input: Parameters<TaskDao["retryGeneration"]>[0]) {
  const hash = payloadHash([input.projectId, input.taskId, input.expectedVersion, input.failedOperationId]);
  const saved = await findReceipt(database, input, "retryGeneration", hash);
  if (saved) return saved as TaskReceipt;
  const task = await findTask(database, input.projectId, input.taskId);
  assertWritable(task, input);
  const failed = (await database.select().from(taskOperations).where(and(eq(taskOperations.taskId, task.id), eq(taskOperations.id, input.failedOperationId))).limit(1))[0];
  if (!failed || failed.kind !== "generate" || failed.state !== "failed") throw new TaskError("generation_not_failed");
  const message = (await database.select({ id: taskMessages.id }).from(taskMessages).where(and(eq(taskMessages.taskId, task.id), eq(taskMessages.operationId, failed.id), eq(taskMessages.role, "user"))).limit(1))[0];
  if (!message) throw new TaskError("generation_not_failed");
  const operationId = crypto.randomUUID();
  await database.insert(taskOperations).values({ id: operationId, taskId: task.id, kind: "generate", state: "queued", initiatedSessionId: input.sessionId, baseTaskVersion: input.expectedVersion + 1, baseRevisionId: task.currentRevisionId, inputMessageId: message.id });
  await updateTaskForCommand(database, task.id, input, operationId);
  const receipt = { taskId: task.id, operationId, acceptedMessageId: message.id, version: input.expectedVersion + 1 };
  await saveReceipt(database, input, "retryGeneration", hash, receipt);
  return receipt;
}
