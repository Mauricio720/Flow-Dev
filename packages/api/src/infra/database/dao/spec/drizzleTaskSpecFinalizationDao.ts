import type { CompleteFinalization, TaskSpecFinalizationDao } from "../../../../application/database/dao/taskSpecFinalizationDao";
import type { SpecClaim } from "../../../../application/database/dao/taskSpecWorkerDao";
import { and, eq } from "drizzle-orm";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecAttempts } from "../../schema";
import type { SpecReason, SpecStage } from "../../../../application/services/spec/specContracts";
import type { PromotionStep } from "../../../../application/spec/specWorkspaceGateway";
import type { Database } from "../../client";
import { beginRestore, loadPackage, markPhase, markReviewReady, priorEntries, recordStep, workspaceFor } from "./specFinalizationStore";
import { fencedAttemptUpdate } from "./specWorkerFence";
import { appendInTransaction } from "./specWorkerSettlement";

export class DrizzleTaskSpecFinalizationDao implements TaskSpecFinalizationDao {
  constructor(private readonly database: Database) {}

  loadPackage(packageId: string) { return loadPackage(this.database, packageId); }
  priorEntries(workflowId: string, stage: SpecStage) { return priorEntries(this.database, workflowId, stage); }
  recordStep(finalizationId: string, step: PromotionStep) { return recordStep(this.database, finalizationId, step); }
  markInstalled(finalizationId: string) { return markPhase(this.database, finalizationId, { phase: "installed" }); }
  fail(finalizationId: string, reason: SpecReason) { return markPhase(this.database, finalizationId, { phase: "failed", failureReason: reason }); }
  beginRestore(input: Parameters<TaskSpecFinalizationDao["beginRestore"]>[0]) { return beginRestore(this.database, input); }
  workspaceFor(workflowId: string) { return workspaceFor(this.database, workflowId); }

  async assertFinalizing(claim: SpecClaim) {
    const [row] = await this.database.select({ id: taskSpecAttempts.id }).from(taskSpecAttempts).where(and(eq(taskSpecAttempts.id, claim.attemptId), eq(taskSpecAttempts.leaseFence, claim.fence), eq(taskSpecAttempts.state, "finalizing")));
    if (!row) throw new TaskError("stale_execution");
  }

  complete(claim: SpecClaim, input: CompleteFinalization) {
    return this.database.transaction(async (tx) => {
      const db = tx as unknown as Database;
      await fencedAttemptUpdate(db, claim, { patch: { state: "completed", leaseOwner: null, leaseExpiresAt: null, finishedAt: new Date() }, requiredState: "finalizing" });
      await markReviewReady(db, { ...input, workflowId: claim.workflowId, stage: claim.stage });
      await appendInTransaction(db, claim, { kind: "package.review_ready", payload: { packageId: input.packageId }, providerEventId: `ready:${input.packageId}` });
    });
  }

  completeRestore(input: CompleteFinalization & { workflowId: string; stage: SpecStage }) {
    return this.database.transaction((tx) => markReviewReady(tx as unknown as Database, input));
  }
}
