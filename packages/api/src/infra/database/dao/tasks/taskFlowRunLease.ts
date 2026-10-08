import { and, asc, eq, inArray, lt, or, sql } from "drizzle-orm";
import type { RunRecord, RunRuntime } from "../../../../application/database/dao/taskFlowDao";
import type { RunActivity } from "../../../../application/database/dao/taskFlowTypes";
import type { Database } from "../../client";
import { taskExecutionRuns } from "../../schema";
import { toRun } from "./taskFlowMappers";

const LEASED_STATES = ["dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];
const QUEUED_STATE = "queued";
const DISPATCHING_STATE = "dispatching";

type Fenced = { runId: string; fence: number };

const fenced = (input: Fenced) => and(eq(taskExecutionRuns.id, input.runId), eq(taskExecutionRuns.leaseFence, input.fence));
const leaseUntil = (now: Date, leaseMs: number) => new Date(now.getTime() + leaseMs);

export class TaskFlowRunLease {
  constructor(private readonly database: Database) {}

  claimNext(input: { owner: string; now: Date; leaseMs: number }): Promise<RunRecord | null> {
    return this.database.transaction(async (tx) => {
      const claimable = or(eq(taskExecutionRuns.state, QUEUED_STATE), and(inArray(taskExecutionRuns.state, LEASED_STATES), lt(taskExecutionRuns.leaseExpiresAt, input.now)));
      const [candidate] = await tx.select({ id: taskExecutionRuns.id }).from(taskExecutionRuns).where(claimable).orderBy(asc(taskExecutionRuns.createdAt)).limit(1).for("update", { skipLocked: true });
      if (!candidate) return null;
      const [row] = await tx.update(taskExecutionRuns).set({
        state: sql`CASE WHEN ${taskExecutionRuns.state} = ${QUEUED_STATE} THEN ${DISPATCHING_STATE} ELSE ${taskExecutionRuns.state} END`,
        leaseOwner: input.owner, leaseFence: sql`${taskExecutionRuns.leaseFence} + 1`, leaseExpiresAt: leaseUntil(input.now, input.leaseMs), updatedAt: input.now,
      }).where(eq(taskExecutionRuns.id, candidate.id)).returning();
      return toRun(row!);
    });
  }

  async takeover(input: { runId: string; owner: string; now: Date; leaseMs: number }): Promise<RunRecord | null> {
    const [row] = await this.database.update(taskExecutionRuns).set({ leaseOwner: input.owner, leaseFence: sql`${taskExecutionRuns.leaseFence} + 1`, leaseExpiresAt: leaseUntil(input.now, input.leaseMs), updatedAt: input.now })
      .where(and(eq(taskExecutionRuns.id, input.runId), inArray(taskExecutionRuns.state, [QUEUED_STATE, ...LEASED_STATES]))).returning();
    return row ? toRun(row) : null;
  }

  async bindRuntime(input: Fenced & { runtime: Partial<RunRuntime> }) {
    const { workspaceId, sessionId, turnId, runId } = input.runtime;
    const patch = { runtimeWorkspaceId: workspaceId, runtimeSessionId: sessionId, runtimeTurnId: turnId, runtimeRunId: runId, updatedAt: new Date() };
    const rows = await this.database.update(taskExecutionRuns).set(patch).where(fenced(input)).returning({ id: taskExecutionRuns.id });
    return rows.length > 0;
  }

  async advance(input: Fenced & { state: string; leaseMs: number; now: Date }) {
    const rows = await this.database.update(taskExecutionRuns).set({ state: input.state, leaseExpiresAt: leaseUntil(input.now, input.leaseMs), updatedAt: input.now }).where(fenced(input)).returning({ id: taskExecutionRuns.id });
    return rows.length > 0;
  }

  async settle(input: Fenced & { state: string; terminalCode: string | null; now: Date; activity?: RunActivity }) {
    const rows = await this.database.update(taskExecutionRuns).set({ state: input.state, terminalCode: input.terminalCode, leaseExpiresAt: null, finishedAt: input.now, updatedAt: input.now, ...(input.activity ? { activity: input.activity } : {}) }).where(fenced(input)).returning({ id: taskExecutionRuns.id });
    return rows.length > 0;
  }

  async recordActivity(input: Fenced & { runtimeEventSequence: number; activity: RunActivity | null; now: Date }) {
    const patch = { runtimeEventSequence: input.runtimeEventSequence, updatedAt: input.now };
    const values = input.activity ? { ...patch, activity: input.activity } : patch;
    const rows = await this.database.update(taskExecutionRuns).set(values).where(and(fenced(input), lt(taskExecutionRuns.runtimeEventSequence, input.runtimeEventSequence))).returning({ id: taskExecutionRuns.id });
    return rows.length > 0;
  }
}
