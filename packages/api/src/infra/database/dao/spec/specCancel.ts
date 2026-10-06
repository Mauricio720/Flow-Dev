import { and, eq, sql } from "drizzle-orm";
import type { SpecCommandResult } from "../../../../application/database/dao/taskSpecDao";
import type { SpecStage } from "../../../../application/services/spec/specContracts";
import { taskSpecAttempts, taskSpecCommands, taskSpecStages } from "../../schema";
import { appendInTransaction } from "./specWorkerSettlement";
import { deactivateInteractions } from "./specWorkerInteractions";
import { bumpWorkflow, latestAttemptRow, runAction, TERMINAL_FAILURE_STATES, type ActionInput } from "./specAttemptActions";
import { saveCommand } from "./specCommandHelpers";
import type { Database } from "../../client";
import type { SpecClaim } from "../../../../application/database/dao/taskSpecWorkerDao";

const QUEUED_STATE = "queued";
const SETTLED_STATES = ["completed", ...TERMINAL_FAILURE_STATES];

export function acceptCancel(database: Database, input: ActionInput & { attemptId: string }): Promise<SpecCommandResult> {
  return runAction(database, input, async ({ db, workflow }) => {
    const attempt = await latestAttemptRow(db, workflow.id, input.attemptId);
    const base = { target: input, action: "spec.cancel" as const, workflowId: workflow.id, payload: input.payload, attemptId: attempt.id };
    if (SETTLED_STATES.includes(attempt.state) || attempt.state === "stopping") {
      const receipt = await saveCommand(db, { ...base, specVersion: workflow.version });
      return SETTLED_STATES.includes(attempt.state) ? settledReceipt(db, receipt, attempt.terminalReason) : receipt;
    }
    if (attempt.state === QUEUED_STATE) return cancelQueued(db, { ...base, workflow, stage: attempt.stage as SpecStage });
    await db.update(taskSpecAttempts).set({ state: "stopping", stopRequestedAt: new Date(), leaseFence: sql`${taskSpecAttempts.leaseFence} + 1`, leaseOwner: null, leaseExpiresAt: null, updatedAt: new Date() }).where(eq(taskSpecAttempts.id, attempt.id));
    await setStageStates(db, { workflowId: workflow.id, stage: attempt.stage as SpecStage }, "stopping");
    return saveCommand(db, { ...base, specVersion: await bumpWorkflow(db, workflow.id, "stopping") });
  });
}

async function settledReceipt(db: Database, receipt: SpecCommandResult, reason: string | null) {
  await db.update(taskSpecCommands).set({ status: "applied", deliveryStatus: "not_applicable", reason }).where(eq(taskSpecCommands.id, receipt.commandId));
  return { ...receipt, status: "applied" as const, reason: reason as SpecCommandResult["reason"] };
}

async function cancelQueued(db: Database, input: { target: ActionInput; action: "spec.cancel"; workflowId: string; payload: Record<string, unknown>; attemptId: string; workflow: { id: string; version: number }; stage: SpecStage }) {
  await db.update(taskSpecAttempts).set({ state: "canceled", finishedAt: new Date(), updatedAt: new Date() }).where(eq(taskSpecAttempts.id, input.attemptId));
  await setStageStates(db, { workflowId: input.workflow.id, stage: input.stage }, "canceled");
  await deactivateInteractions(db, input.attemptId);
  const claim = { workflowId: input.workflowId, attemptId: input.attemptId } as SpecClaim;
  await appendInTransaction(db, claim, { kind: "attempt.canceled", payload: { reason: null }, providerEventId: `terminal:${input.attemptId}` });
  const specVersion = await bumpWorkflow(db, input.workflow.id, "canceled");
  const receipt = await saveCommand(db, { target: input.target, action: input.action, workflowId: input.workflowId, specVersion, payload: input.payload, attemptId: input.attemptId });
  return settledReceipt(db, receipt, null);
}

async function setStageStates(db: Database, target: { workflowId: string; stage: SpecStage }, state: string) {
  const { workflowId, stage } = target;
  await db.update(taskSpecStages).set({ state, version: sql`${taskSpecStages.version} + 1`, updatedAt: new Date() }).where(and(eq(taskSpecStages.workflowId, workflowId), eq(taskSpecStages.stage, stage)));
}
