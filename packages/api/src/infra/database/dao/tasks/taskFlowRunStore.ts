import { and, desc, eq, inArray, lt, ne, or, sql } from "drizzle-orm";
import type { FlowPage, NewRun, RunRecord, RunStore } from "../../../../application/database/dao/taskFlowDao";
import { decodeCursor, encodeCursor } from "../../../../application/pagination/cursor";
import type { Database } from "../../client";
import { taskExecutionRuns } from "../../schema";
import { toRun } from "./taskFlowMappers";
import { TaskFlowRunLease } from "./taskFlowRunLease";

const CREATED_AT_MS = sql`date_trunc('milliseconds', ${taskExecutionRuns.createdAt})`;
const ACTIVE_STATES = ["queued", "dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];

export class TaskFlowRunStore implements RunStore {
  private readonly lease: TaskFlowRunLease;

  constructor(private readonly database: Database) {
    this.lease = new TaskFlowRunLease(database);
  }

  async countActiveWriteOnWorktree(worktreeId: string, excludingTaskId: string) {
    const [row] = await this.database.select({ total: sql<number>`count(*)` }).from(taskExecutionRuns).where(and(eq(taskExecutionRuns.worktreeId, worktreeId), eq(taskExecutionRuns.isWrite, true), ne(taskExecutionRuns.taskId, excludingTaskId), inArray(taskExecutionRuns.state, ACTIVE_STATES)));
    return Number(row?.total ?? 0);
  }

  async requestStop(runId: string) {
    const [row] = await this.database.update(taskExecutionRuns).set({ state: "stopping", updatedAt: new Date() }).where(and(eq(taskExecutionRuns.id, runId), inArray(taskExecutionRuns.state, ACTIVE_STATES))).returning();
    return row ? toRun(row) : null;
  }

  takeover: RunStore["takeover"] = (input) => this.lease.takeover(input);
  claimNext: RunStore["claimNext"] = (input) => this.lease.claimNext(input);
  bindRuntime: RunStore["bindRuntime"] = (input) => this.lease.bindRuntime(input);
  advance: RunStore["advance"] = (input) => this.lease.advance(input);
  settle: RunStore["settle"] = (input) => this.lease.settle(input);
  recordActivity: RunStore["recordActivity"] = (input) => this.lease.recordActivity(input);

  async insert(input: NewRun) {
    const [counter] = await this.database.select({ next: sql<number>`coalesce(max(${taskExecutionRuns.attemptNumber}), 0) + 1` }).from(taskExecutionRuns).where(eq(taskExecutionRuns.actionId, input.actionId));
    const [row] = await this.database.insert(taskExecutionRuns).values({ ...input, attemptNumber: Number(counter?.next ?? 1) }).returning();
    return toRun(row!);
  }

  async find(runId: string) {
    const [row] = await this.database.select().from(taskExecutionRuns).where(eq(taskExecutionRuns.id, runId));
    return row ? toRun(row) : null;
  }

  async findByKey(taskId: string, idempotencyKey: string) {
    const [row] = await this.database.select().from(taskExecutionRuns).where(and(eq(taskExecutionRuns.taskId, taskId), eq(taskExecutionRuns.idempotencyKey, idempotencyKey)));
    return row ? toRun(row) : null;
  }

  async activeWrite(taskId: string) {
    const [row] = await this.database.select().from(taskExecutionRuns).where(and(eq(taskExecutionRuns.taskId, taskId), eq(taskExecutionRuns.isWrite, true), inArray(taskExecutionRuns.state, ACTIVE_STATES)));
    return row ? toRun(row) : null;
  }

  async countActiveForConnection(connectionId: string) {
    const [row] = await this.database.select({ total: sql<number>`count(*)` }).from(taskExecutionRuns).where(and(sql`${taskExecutionRuns.connectionIds} @> ARRAY[${connectionId}]::uuid[]`, inArray(taskExecutionRuns.state, ACTIVE_STATES)));
    return Number(row?.total ?? 0);
  }

  async countActiveTotal() {
    const [row] = await this.database.select({ total: sql<number>`count(*)` }).from(taskExecutionRuns).where(inArray(taskExecutionRuns.state, ACTIVE_STATES));
    return Number(row?.total ?? 0);
  }

  async lockAdmission() {
    await this.database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('flow-dev-task-flow-admission', 0))`);
  }

  async list(input: { taskId: string; cursor?: string; limit: number }): Promise<FlowPage<RunRecord>> {
    const cursor = decodeCursor(input.cursor);
    const after = cursor ? or(sql`${CREATED_AT_MS} < ${cursor.key}::timestamptz`, and(sql`${CREATED_AT_MS} = ${cursor.key}::timestamptz`, lt(taskExecutionRuns.id, cursor.id ?? ""))) : undefined;
    const rows = await this.database.select().from(taskExecutionRuns).where(and(eq(taskExecutionRuns.taskId, input.taskId), after)).orderBy(desc(CREATED_AT_MS), desc(taskExecutionRuns.id)).limit(input.limit + 1);
    const items = rows.slice(0, input.limit).map(toRun);
    const last = items.at(-1);
    return { items, nextCursor: rows.length > input.limit && last ? encodeCursor({ key: last.createdAt.toISOString(), id: last.id }) : null };
  }
}
