import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { NewReviewCycle, ReviewCycleDao, ReviewCycleRecord } from "../../../../application/database/dao/reviewCycleDao";
import type { ReviewAction } from "../../../../application/services/review/reviewCycleTypes";
import type { Database } from "../../client";
import { taskReviewCycles } from "../../schema";
import { readReviewCycleView } from "./drizzleReviewCycleView";

const OPEN_STATES = ["reviewing", "executing", "caveats", "failed"];

function record(row: typeof taskReviewCycles.$inferSelect): ReviewCycleRecord {
  return { ...row, reviewer: { agent: row.reviewerAgent as "claude" | "codex", model: row.reviewerModel, effort: row.reviewerEffort }, executor: { agent: row.executorAgent as "claude" | "codex", model: row.executorModel, effort: row.executorEffort }, state: row.state as ReviewCycleRecord["state"], stepRole: row.stepRole as ReviewCycleRecord["stepRole"], pendingAction: row.pendingAction as ReviewAction | null };
}

export class DrizzleReviewCycleDao implements ReviewCycleDao {
  constructor(private readonly database: Database) {}

  async findOpen(taskId: string) {
    const [row] = await this.database.select().from(taskReviewCycles).where(and(eq(taskReviewCycles.taskId, taskId), inArray(taskReviewCycles.state, OPEN_STATES))).limit(1);
    return row ? record(row) : null;
  }

  async findLatest(taskId: string) {
    const [row] = await this.database.select().from(taskReviewCycles).where(eq(taskReviewCycles.taskId, taskId)).orderBy(desc(taskReviewCycles.startedAt)).limit(1);
    return row ? record(row) : null;
  }

  async findByRequestKey(userId: string, requestKey: string) {
    const [row] = await this.database.select().from(taskReviewCycles).where(and(eq(taskReviewCycles.startedBy, userId), eq(taskReviewCycles.requestKey, requestKey))).limit(1);
    return row ? record(row) : null;
  }

  async create(input: NewReviewCycle) {
    const [row] = await this.database.insert(taskReviewCycles).values({ taskId: input.taskId, projectId: input.projectId, hostId: input.hostId, startedBy: input.startedBy, requestKey: input.requestKey, reviewerAgent: input.reviewer.agent, reviewerModel: input.reviewer.model, reviewerEffort: input.reviewer.effort, executorAgent: input.executor.agent, executorModel: input.executor.model, executorEffort: input.executor.effort, tasksFolder: input.tasksFolder, partial: input.partial }).returning();
    return record(row!);
  }

  async requestAction(input: { cycleId: string; revision: number; action: ReviewAction; by: string; at: Date }) {
    const filter = and(eq(taskReviewCycles.id, input.cycleId), eq(taskReviewCycles.revision, input.revision), isNull(taskReviewCycles.pendingAction));
    const [row] = await this.database.update(taskReviewCycles).set({ pendingAction: input.action, pendingBy: input.by, pendingAt: input.at, revision: sql`${taskReviewCycles.revision} + 1`, updatedAt: input.at }).where(filter).returning();
    return row ? record(row) : null;
  }

  view(cycleId: string) {
    return readReviewCycleView(this.database, cycleId);
  }
}
