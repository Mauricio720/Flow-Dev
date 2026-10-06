import { and, eq, sql } from "drizzle-orm";
import type { DeliveryRecord, PendingDelivery, SpecClaim } from "../../../../application/database/dao/taskSpecWorkerDao";
import type { InteractionDraft } from "../../../../application/services/spec/specInteractionRules";
import { taskSpecCommands, taskSpecInteractions, taskSpecStages, taskSpecWorkflows } from "../../schema";
import type { Database } from "../../client";
import { fencedAttemptUpdate } from "./specWorkerFence";

const PENDING_STATUS = "pending";
const RESOLVED_STATUS = "resolved";

export async function saveInteraction(database: Database, claim: SpecClaim, draft: InteractionDraft) {
  const inserted = await database.insert(taskSpecInteractions).values({ workflowId: claim.workflowId, attemptId: claim.attemptId, runtimeSessionId: draft.runtimeSessionId, runtimeTurnId: draft.runtimeTurnId, runtimeInteractionId: draft.runtimeInteractionId, providerRequestId: draft.providerRequestId, kind: draft.kind, description: draft.description, choices: draft.choices, target: draft.target as Record<string, unknown> | null, targetDigest: draft.targetDigest, status: draft.status }).onConflictDoNothing().returning({ id: taskSpecInteractions.id, status: taskSpecInteractions.status });
  if (inserted[0]) return { id: inserted[0].id, created: true, status: inserted[0].status };
  const [existing] = await database.select({ id: taskSpecInteractions.id, status: taskSpecInteractions.status }).from(taskSpecInteractions).where(and(eq(taskSpecInteractions.attemptId, claim.attemptId), eq(taskSpecInteractions.runtimeInteractionId, draft.runtimeInteractionId)));
  return { id: existing!.id, created: false, status: existing!.status };
}

export async function setExecutionState(database: Database, claim: SpecClaim, states: { stage: string; attempt: string }) {
  const { stage: state, attempt: attemptState } = states;
  await database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    await fencedAttemptUpdate(db, claim, { state: attemptState });
    await db.update(taskSpecStages).set({ state, version: sql`${taskSpecStages.version} + 1`, updatedAt: new Date() }).where(and(eq(taskSpecStages.workflowId, claim.workflowId), eq(taskSpecStages.stage, claim.stage)));
    await db.update(taskSpecWorkflows).set({ state, version: sql`${taskSpecWorkflows.version} + 1`, updatedAt: new Date() }).where(eq(taskSpecWorkflows.id, claim.workflowId));
  });
}

export async function pendingInteractionCount(database: Database, claim: SpecClaim) {
  const [row] = await database.select({ count: sql<number>`count(*)::int` }).from(taskSpecInteractions).where(and(eq(taskSpecInteractions.attemptId, claim.attemptId), eq(taskSpecInteractions.status, PENDING_STATUS)));
  return row?.count ?? 0;
}

export async function pendingDeliveries(database: Database, claim: SpecClaim): Promise<PendingDelivery[]> {
  const rows = await database.select().from(taskSpecInteractions).where(and(eq(taskSpecInteractions.attemptId, claim.attemptId), eq(taskSpecInteractions.status, RESOLVED_STATUS), eq(taskSpecInteractions.delivery, PENDING_STATUS)));
  return rows.filter((row) => row.winningCommandId && row.response).map((row) => ({ interactionId: row.id, commandId: row.winningCommandId!, runtimeInteractionId: row.runtimeInteractionId, providerRequestId: row.providerRequestId, runtimeTurnId: row.runtimeTurnId, kind: row.kind as "question" | "permission", response: row.response! }));
}

export async function recordDelivery(database: Database, input: { interactionId: string; commandId: string; record: DeliveryRecord }) {
  await database.transaction(async (tx) => {
    const winner = input.record.runtimeWinner === undefined ? {} : { response: sql`coalesce(${taskSpecInteractions.response}, '{}'::jsonb) || ${JSON.stringify({ runtimeWinner: input.record.runtimeWinner })}::jsonb` };
    await tx.update(taskSpecInteractions).set({ delivery: input.record.delivery, ...winner }).where(eq(taskSpecInteractions.id, input.interactionId));
    const delivered = input.record.delivery === "delivered";
    await tx.update(taskSpecCommands).set({ deliveryStatus: delivered ? "delivered" : input.record.delivery === "pending" ? "pending" : input.record.delivery === "orphaned" ? "orphaned" : "unknown", status: delivered ? "applied" : "accepted", reason: input.record.reason, updatedAt: new Date() }).where(eq(taskSpecCommands.id, input.commandId));
  });
}

export async function deactivateInteractions(database: Database, attemptId: string) {
  await database.update(taskSpecInteractions).set({ status: "superseded", delivery: "inactive" }).where(and(eq(taskSpecInteractions.attemptId, attemptId), eq(taskSpecInteractions.status, PENDING_STATUS)));
  await database.update(taskSpecInteractions).set({ delivery: "inactive" }).where(and(eq(taskSpecInteractions.attemptId, attemptId), eq(taskSpecInteractions.status, RESOLVED_STATUS), eq(taskSpecInteractions.delivery, "pending")));
}

export async function advanceCursor(database: Database, claim: SpecClaim, sequence: number) {
  await fencedAttemptUpdate(database, claim, { runtimeCursor: String(sequence) });
}
