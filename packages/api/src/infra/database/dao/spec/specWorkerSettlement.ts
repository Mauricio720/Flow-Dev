import { and, eq, inArray, sql } from "drizzle-orm";
import type { SpecAttemptOutcome, SpecClaim, SpecEventDraft } from "../../../../application/database/dao/taskSpecWorkerDao";
import { taskSpecCommands, taskSpecEvents, taskSpecStages, taskSpecWorkflows } from "../../schema";
import type { Database } from "../../client";
import { fencedAttemptUpdate } from "./specWorkerFence";
import { deactivateInteractions } from "./specWorkerInteractions";

const TERMINAL_STATES = ["failed", "canceled"];
const STAGE_STATE_BY_ATTEMPT: Record<string, string> = { failed: "failed", canceled: "canceled", stopping: "stopping" };

export function settleSpecAttempt(database: Database, claim: SpecClaim, outcome: SpecAttemptOutcome) {
  return database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    const terminal = TERMINAL_STATES.includes(outcome.state);
    await fencedAttemptUpdate(db, claim, { state: outcome.state, terminalReason: outcome.reason, attention: outcome.attention ?? null, leaseOwner: terminal ? null : undefined, leaseExpiresAt: terminal ? null : undefined, finishedAt: terminal ? new Date() : undefined });
    const state = STAGE_STATE_BY_ATTEMPT[outcome.state];
    if (!state) return;
    await db.update(taskSpecStages).set({ state, version: sql`${taskSpecStages.version} + 1`, updatedAt: new Date() }).where(and(eq(taskSpecStages.workflowId, claim.workflowId), eq(taskSpecStages.stage, claim.stage)));
    await db.update(taskSpecWorkflows).set({ state, version: sql`${taskSpecWorkflows.version} + 1`, updatedAt: new Date() }).where(eq(taskSpecWorkflows.id, claim.workflowId));
    if (outcome.state === "failed") await rejectAttemptCommands(db, claim.attemptId, outcome.reason);
    if (terminal) await deactivateInteractions(db, claim.attemptId);
    if (terminal) await appendInTransaction(db, claim, { kind: `attempt.${outcome.state}`, payload: { reason: outcome.reason }, providerEventId: `terminal:${claim.attemptId}` });
  });
}

export async function rejectAttemptCommands(db: Database, attemptId: string, reason: string | null) {
  await db.update(taskSpecCommands).set({ status: "rejected", reason, deliveryStatus: "not_applicable", updatedAt: new Date() }).where(and(eq(taskSpecCommands.attemptId, attemptId), eq(taskSpecCommands.status, "accepted"), inArray(taskSpecCommands.action, ["spec.start", "spec.adjust", "spec.retry"])));
}

export function appendSpecEvent(database: Database, claim: SpecClaim, event: SpecEventDraft) {
  return database.transaction((tx) => appendInTransaction(tx as unknown as Database, claim, event));
}

export async function appendInTransaction(db: Database, claim: SpecClaim, event: SpecEventDraft) {
  await db.select({ id: taskSpecWorkflows.id }).from(taskSpecWorkflows).where(eq(taskSpecWorkflows.id, claim.workflowId)).for("update");
  const [latest] = await db.select({ sequence: sql<number>`coalesce(max(${taskSpecEvents.sequence}), 0)::int` }).from(taskSpecEvents).where(eq(taskSpecEvents.workflowId, claim.workflowId));
  const sequence = (latest?.sequence ?? 0) + 1;
  const inserted = await db.insert(taskSpecEvents).values({ workflowId: claim.workflowId, sequence, attemptId: claim.attemptId, providerEventId: event.providerEventId ?? null, kind: event.kind, payload: event.payload }).onConflictDoNothing().returning({ sequence: taskSpecEvents.sequence });
  return inserted[0]?.sequence ?? 0;
}
