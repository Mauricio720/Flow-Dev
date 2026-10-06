import { and, eq, gt, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { TaskCapture, TaskCaptureDao } from "../../../../application/database/dao/taskCaptureDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskCaptureLeases, tasks } from "../../schema";
import type { Database } from "../../client";

export class DrizzleTaskCaptureDao implements TaskCaptureDao {
  constructor(private readonly database: Database, private readonly clock = () => new Date()) {}

  async start(input: Omit<TaskCapture, "state">) {
    try {
      await this.database.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.userId}, 1))`);
        if (input.taskId) await ensureCaptureTaskWritable(tx as unknown as Database, input);
        await tx.delete(taskCaptureLeases).where(and(eq(taskCaptureLeases.userId, input.userId), lte(taskCaptureLeases.expiresAt, this.clock())));
        const active = await tx.select({ captureId: taskCaptureLeases.captureId }).from(taskCaptureLeases).where(and(eq(taskCaptureLeases.userId, input.userId), gt(taskCaptureLeases.expiresAt, this.clock()))).limit(1);
        if (active.length) throw new TaskError("capture_active");
        await tx.insert(taskCaptureLeases).values({ ...input, state: "capturing" });
      });
    } catch (error) {
      if (error instanceof TaskError) throw error;
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") throw new TaskError("capture_active");
      throw new TaskError("service_unavailable", undefined, error);
    }
  }

  async find(input: { userId: string; sessionId: string; captureId: string }) {
    const row = (await this.database.select().from(taskCaptureLeases).where(and(eq(taskCaptureLeases.userId, input.userId), eq(taskCaptureLeases.sessionId, input.sessionId), eq(taskCaptureLeases.captureId, input.captureId), gt(taskCaptureLeases.expiresAt, this.clock()))).limit(1))[0];
    return row ? mapCapture(row) : null;
  }

  async begin(input: { userId: string; sessionId: string; captureId: string; tokenHash: string }) {
    const row = (await this.database.update(taskCaptureLeases).set({ state: "processing" }).where(and(eq(taskCaptureLeases.userId, input.userId), eq(taskCaptureLeases.sessionId, input.sessionId), eq(taskCaptureLeases.captureId, input.captureId), eq(taskCaptureLeases.tokenHash, input.tokenHash), eq(taskCaptureLeases.state, "capturing"), gt(taskCaptureLeases.expiresAt, this.clock()))).returning())[0];
    return row ? mapCapture(row) : null;
  }

  async release(input: { userId: string; sessionId: string; captureId: string }) {
    const removed = await this.database.delete(taskCaptureLeases).where(and(eq(taskCaptureLeases.userId, input.userId), eq(taskCaptureLeases.sessionId, input.sessionId), eq(taskCaptureLeases.captureId, input.captureId))).returning({ captureId: taskCaptureLeases.captureId });
    if (removed.length) return "released" as const;
    const exists = await this.database.select({ captureId: taskCaptureLeases.captureId }).from(taskCaptureLeases).where(eq(taskCaptureLeases.captureId, input.captureId)).limit(1);
    return exists.length ? "forbidden" as const : "missing" as const;
  }

  async complete(input: { userId: string; sessionId: string; captureId: string }) {
    return this.database.transaction(async (tx) => {
      const lease = (await tx.select().from(taskCaptureLeases).where(and(eq(taskCaptureLeases.userId, input.userId), eq(taskCaptureLeases.sessionId, input.sessionId), eq(taskCaptureLeases.captureId, input.captureId), eq(taskCaptureLeases.state, "processing"), gt(taskCaptureLeases.expiresAt, this.clock()))).limit(1).for("update"))[0];
      if (!lease) return false;
      if (lease.taskId) await ensureCaptureTaskWritable(tx as unknown as Database, lease);
      const completed = await tx.delete(taskCaptureLeases).where(eq(taskCaptureLeases.captureId, input.captureId)).returning({ captureId: taskCaptureLeases.captureId });
      return completed.length > 0;
    });
  }
}

async function ensureCaptureTaskWritable(database: Database, input: Pick<TaskCapture, "userId" | "projectId" | "taskId" | "expectedVersion">) {
  const task = (await database.select().from(tasks).where(and(eq(tasks.projectId, input.projectId), eq(tasks.id, input.taskId!))).limit(1).for("update"))[0];
  if (!task) throw new TaskError("task_unavailable");
  if (task.authorUserId !== input.userId) throw new TaskError("author_required");
  if (task.version !== input.expectedVersion) throw new TaskError("revision_conflict");
  if (task.activeOperationId || task.pendingProposalOperationId) throw new TaskError("operation_active");
  if (["publishing", "publication_uncertain", "published"].includes(task.status)) throw new TaskError("task_complete");
}

function mapCapture(row: typeof taskCaptureLeases.$inferSelect): TaskCapture { return { captureId: row.captureId, userId: row.userId, sessionId: row.sessionId, projectId: row.projectId, taskId: row.taskId, expectedVersion: row.expectedVersion, tokenHash: row.tokenHash, state: row.state as TaskCapture["state"], expiresAt: row.expiresAt }; }
