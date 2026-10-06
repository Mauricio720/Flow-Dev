import { and, eq, inArray, sql } from "drizzle-orm";
import type { SpecAttemptOutcome, SpecClaim, SpecEventDraft, SpecWorkspaceBinding, TaskSpecWorkerDao } from "../../../../application/database/dao/taskSpecWorkerDao";
import type { SpecReason } from "../../../../application/services/spec/specContracts";
import { leaseExpiry } from "../../../../application/services/spec/specWorkerRules";
import { taskSpecAttempts, taskSpecStages, taskSpecWorkflows, taskSpecWorkspaces } from "../../schema";
import { loadPackage, workspaceFor } from "./specFinalizationStore";
import type { Database } from "../../client";
import { claimSpecAttempt } from "./specWorkerClaim";
import { advanceCursor, pendingDeliveries, pendingInteractionCount, recordDelivery, saveInteraction, setExecutionState } from "./specWorkerInteractions";
import type { InteractionDraft } from "../../../../application/services/spec/specInteractionRules";
import { fencedAttemptUpdate } from "./specWorkerFence";
import { appendSpecEvent, settleSpecAttempt } from "./specWorkerSettlement";

const SUPERVISED_STATES = ["dispatching", "running", "waiting", "finalizing", "stopping", "reconciling"];

export class DrizzleTaskSpecWorkerDao implements TaskSpecWorkerDao {
  constructor(private readonly database: Database) {}

  async reviewedEntries(claim: SpecClaim) {
    const reviewed = claim.input.reviewedPackageId;
    return reviewed ? (await loadPackage(this.database, reviewed)).entries : [];
  }
  workspaceId(claim: SpecClaim) { return workspaceFor(this.database, claim.workflowId); }
  async approvedUpstream(claim: SpecClaim) {
    const rows = await this.database.select({ packageId: taskSpecStages.approvedPackageId, stage: taskSpecStages.stage }).from(taskSpecStages).where(eq(taskSpecStages.workflowId, claim.workflowId));
    const loaded = await Promise.all(rows.filter((row) => row.packageId).map((row) => loadPackage(this.database, row.packageId!)));
    return loaded.map((pkg) => ({ packageId: pkg.id, manifestHash: pkg.manifestHash, stage: pkg.stage, entries: pkg.entries }));
  }
  saveInteraction(claim: SpecClaim, draft: InteractionDraft) { return saveInteraction(this.database, claim, draft); }
  markWaiting(claim: SpecClaim, kind: "question" | "permission") { return setExecutionState(this.database, claim, { stage: `waiting_${kind}`, attempt: "waiting" }); }
  markFinalizing(claim: SpecClaim) { return setExecutionState(this.database, claim, { stage: "finalizing", attempt: "finalizing" }); }
  markRunning(claim: SpecClaim) { return setExecutionState(this.database, claim, { stage: "running", attempt: "running" }); }
  advanceCursor(claim: SpecClaim, sequence: number) { return advanceCursor(this.database, claim, sequence); }
  pendingDeliveries(claim: SpecClaim) { return pendingDeliveries(this.database, claim); }
  pendingInteractionCount(claim: SpecClaim) { return pendingInteractionCount(this.database, claim); }
  recordDelivery(_claim: SpecClaim, input: Parameters<TaskSpecWorkerDao["recordDelivery"]>[1]) { return recordDelivery(this.database, input); }
  claim(input: Parameters<TaskSpecWorkerDao["claim"]>[0]) { return claimSpecAttempt(this.database, input); }
  settle(claim: SpecClaim, outcome: SpecAttemptOutcome) { return settleSpecAttempt(this.database, claim, outcome); }
  appendEvent(claim: SpecClaim, event: SpecEventDraft) { return appendSpecEvent(this.database, claim, event); }

  async heartbeat(claim: SpecClaim, now: Date) {
    const rows = await this.database.update(taskSpecAttempts).set({ leaseExpiresAt: leaseExpiry(now), updatedAt: now }).where(and(eq(taskSpecAttempts.id, claim.attemptId), eq(taskSpecAttempts.leaseFence, claim.fence))).returning({ id: taskSpecAttempts.id });
    return rows.length === 1;
  }

  async release(claim: SpecClaim) {
    await fencedAttemptUpdate(this.database, claim, { leaseOwner: null, leaseExpiresAt: null });
  }

  async bindWorkspace(claim: SpecClaim, binding: SpecWorkspaceBinding) {
    await this.database.transaction(async (tx) => {
      const [workspace] = await tx.insert(taskSpecWorkspaces).values({ workflowId: claim.workflowId, ...binding }).onConflictDoNothing().returning({ id: taskSpecWorkspaces.id });
      if (workspace) await tx.update(taskSpecWorkflows).set({ workspaceId: workspace.id }).where(eq(taskSpecWorkflows.id, claim.workflowId));
    });
  }

  async bindSession(claim: SpecClaim, ids: { runtimeWorkspaceId: string; runtimeSessionId: string }) {
    await fencedAttemptUpdate(this.database, claim, ids);
  }

  async markPromptAccepted(claim: SpecClaim, turnId: string | null) {
    await fencedAttemptUpdate(this.database, claim, { state: "running", runtimeTurnId: turnId });
    await this.database.update(taskSpecWorkflows).set({ state: "running", version: sql`${taskSpecWorkflows.version} + 1`, updatedAt: new Date() }).where(eq(taskSpecWorkflows.id, claim.workflowId));
  }

  async requestStop(claim: SpecClaim, reason: SpecReason | null, now: Date) {
    await fencedAttemptUpdate(this.database, claim, { state: "stopping", terminalReason: reason, stopRequestedAt: claim.stopRequestedAt ?? now });
  }

  async setAttention(claim: SpecClaim, attention: string | null) {
    await fencedAttemptUpdate(this.database, claim, { attention });
  }

  async activeCount() {
    const [row] = await this.database.select({ count: sql<number>`count(*)::int` }).from(taskSpecAttempts).where(inArray(taskSpecAttempts.state, SUPERVISED_STATES));
    return row?.count ?? 0;
  }
}
