import { and, asc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import type { SpecClaim } from "../../../../application/database/dao/taskSpecWorkerDao";
import type { SpecStage } from "../../../../application/services/spec/specContracts";
import type { StoredSpecInput } from "../../../../application/services/spec/specInput";
import { leaseExpiry } from "../../../../application/services/spec/specWorkerRules";
import { taskSpecAttempts, taskSpecWorkflows } from "../../schema";
import type { Database } from "../../client";

const SUPERVISED_STATES = ["dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];
const QUEUED_STATE = "queued";
const DISPATCHING_STATE = "dispatching";

type ClaimInput = { owner: string; now: Date; maxActive: number };

export function claimSpecAttempt(database: Database, input: ClaimInput): Promise<SpecClaim | null> {
  return database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    await db.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('spec-admission', 1))`);
    const reclaim = await nextReclaimable(db, input.now);
    if (reclaim) return take(db, { attemptId: reclaim.id, state: reclaim.state }, input);
    const [active] = await db.select({ count: sql<number>`count(*)::int` }).from(taskSpecAttempts).where(inArray(taskSpecAttempts.state, SUPERVISED_STATES));
    if ((active?.count ?? 0) >= input.maxActive) return null;
    const [queued] = await db.select({ id: taskSpecAttempts.id }).from(taskSpecAttempts).where(eq(taskSpecAttempts.state, QUEUED_STATE)).orderBy(asc(taskSpecAttempts.createdAt)).limit(1).for("update", { skipLocked: true });
    return queued ? take(db, { attemptId: queued.id, state: DISPATCHING_STATE }, input) : null;
  });
}

async function nextReclaimable(db: Database, now: Date) {
  const [row] = await db.select({ id: taskSpecAttempts.id, state: taskSpecAttempts.state }).from(taskSpecAttempts).where(and(inArray(taskSpecAttempts.state, SUPERVISED_STATES), or(isNull(taskSpecAttempts.leaseExpiresAt), lt(taskSpecAttempts.leaseExpiresAt, now)))).orderBy(asc(taskSpecAttempts.updatedAt)).limit(1).for("update", { skipLocked: true });
  return row ?? null;
}

async function take(db: Database, target: { attemptId: string; state: string }, input: ClaimInput) {
  const { attemptId, state } = target;
  const [attempt] = await db.update(taskSpecAttempts).set({ state, leaseOwner: input.owner, leaseExpiresAt: leaseExpiry(input.now), leaseFence: sql`${taskSpecAttempts.leaseFence} + 1`, updatedAt: input.now }).where(eq(taskSpecAttempts.id, attemptId)).returning();
  const [workflow] = await db.select().from(taskSpecWorkflows).where(eq(taskSpecWorkflows.id, attempt!.workflowId));
  return toClaim(attempt!, workflow!);
}

export function toClaim(attempt: typeof taskSpecAttempts.$inferSelect, workflow: typeof taskSpecWorkflows.$inferSelect): SpecClaim {
  return { attemptId: attempt.id, workflowId: workflow.id, projectId: workflow.projectId, taskId: workflow.taskId, authorUserId: workflow.authorUserId, stage: attempt.stage as SpecStage, kind: attempt.kind, state: attempt.state, input: attempt.input as StoredSpecInput, promptMessageId: attempt.promptMessageId, promptIdempotencyKey: attempt.promptIdempotencyKey, fence: attempt.leaseFence, runtimeWorkspaceId: attempt.runtimeWorkspaceId, runtimeSessionId: attempt.runtimeSessionId, runtimeTurnId: attempt.runtimeTurnId, runtimeCursor: attempt.runtimeCursor, stopRequestedAt: attempt.stopRequestedAt, terminalReason: attempt.terminalReason };
}
