import { and, asc, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { ApprovalClaim, TaskSpecApprovalDao } from "../../../../application/database/dao/taskSpecApprovalDao";
import type { SpecReason, SpecStage } from "../../../../application/services/spec/specContracts";
import { leaseExpiry } from "../../../../application/services/spec/specWorkerRules";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecApprovals, taskSpecCommands, taskSpecPackages, taskSpecStages, taskSpecWorkflows, taskSpecWorkspaces } from "../../schema";
import type { Database } from "../../client";
import { loadPackage } from "./specFinalizationStore";

const APPROVE_ACTION = "spec.approve";

export class DrizzleTaskSpecApprovalDao implements TaskSpecApprovalDao {
  constructor(private readonly database: Database) {}

  claim(input: { owner: string; now: Date; action?: string }): Promise<ApprovalClaim | null> {
    return this.database.transaction(async (tx) => {
      const db = tx as unknown as Database;
      const [row] = await db.select().from(taskSpecCommands).where(and(eq(taskSpecCommands.action, input.action ?? APPROVE_ACTION), eq(taskSpecCommands.status, "accepted"), or(isNull(taskSpecCommands.leaseExpiresAt), lt(taskSpecCommands.leaseExpiresAt, input.now)))).orderBy(asc(taskSpecCommands.createdAt)).limit(1).for("update", { skipLocked: true });
      if (!row?.workflowId || !row.packageId) return null;
      const [updated] = await db.update(taskSpecCommands).set({ leaseOwner: input.owner, leaseExpiresAt: leaseExpiry(input.now), leaseFence: sql`${taskSpecCommands.leaseFence} + 1` }).where(eq(taskSpecCommands.id, row.id)).returning({ fence: taskSpecCommands.leaseFence });
      const [workflow] = await db.select().from(taskSpecWorkflows).where(eq(taskSpecWorkflows.id, row.workflowId));
      const pkg = await loadPackage(db, row.packageId);
      const [workspace] = await db.select({ repositoryGithubId: taskSpecWorkspaces.repositoryGithubId }).from(taskSpecWorkspaces).where(eq(taskSpecWorkspaces.workflowId, row.workflowId));
      return { commandId: row.id, fence: updated!.fence, workflowId: workflow!.id, projectId: workflow!.projectId, taskId: workflow!.taskId, authorUserId: workflow!.authorUserId, actorUserId: row.actorUserId, stage: pkg.stage as SpecStage, packageId: pkg.id, manifestHash: pkg.manifestHash, entries: pkg.entries, repositoryGithubId: workspace?.repositoryGithubId ?? "" };
    });
  }

  apply(claim: ApprovalClaim, installedManifestHash: string) {
    return this.database.transaction(async (tx) => {
      const db = tx as unknown as Database;
      await this.assertFence(db, claim);
      const [stage] = await db.select().from(taskSpecStages).where(and(eq(taskSpecStages.workflowId, claim.workflowId), eq(taskSpecStages.stage, claim.stage))).for("update");
      if (stage?.currentPackageId !== claim.packageId || stage.state !== "review") throw new TaskError("spec_conflict");
      await this.approve(db, claim, installedManifestHash);
      await db.update(taskSpecCommands).set({ status: "applied", deliveryStatus: "delivered", reason: null, leaseOwner: null, leaseExpiresAt: null, updatedAt: new Date() }).where(eq(taskSpecCommands.id, claim.commandId));
    });
  }

  private async approve(db: Database, claim: ApprovalClaim, installedManifestHash: string) {
    await db.insert(taskSpecApprovals).values({ workflowId: claim.workflowId, stage: claim.stage, packageId: claim.packageId, manifestHash: claim.manifestHash, approverUserId: claim.actorUserId, installedManifestHash });
    await db.update(taskSpecStages).set({ state: "approved", approvedPackageId: claim.packageId, version: sql`${taskSpecStages.version} + 1`, updatedAt: new Date() }).where(and(eq(taskSpecStages.workflowId, claim.workflowId), eq(taskSpecStages.stage, claim.stage)));
    await db.update(taskSpecWorkflows).set({ state: "approved", version: sql`${taskSpecWorkflows.version} + 1`, updatedAt: new Date() }).where(eq(taskSpecWorkflows.id, claim.workflowId));
    await db.update(taskSpecPackages).set({ readinessVersion: sql`${taskSpecPackages.readinessVersion} + 1` }).where(eq(taskSpecPackages.id, claim.packageId));
  }

  private async assertFence(db: Database, claim: ApprovalClaim) {
    const [row] = await db.select({ fence: taskSpecCommands.leaseFence }).from(taskSpecCommands).where(eq(taskSpecCommands.id, claim.commandId)).for("update");
    if (row?.fence !== claim.fence) throw new TaskError("stale_execution");
  }

  async markApplied(claim: ApprovalClaim) {
    await this.database.update(taskSpecCommands).set({ status: "applied", deliveryStatus: "delivered", reason: null, leaseOwner: null, leaseExpiresAt: null, updatedAt: new Date() }).where(and(eq(taskSpecCommands.id, claim.commandId), eq(taskSpecCommands.leaseFence, claim.fence)));
  }

  async reject(claim: ApprovalClaim, reason: SpecReason) {
    await this.database.update(taskSpecCommands).set({ status: "rejected", reason, deliveryStatus: "not_applicable", leaseOwner: null, leaseExpiresAt: null, updatedAt: new Date() }).where(and(eq(taskSpecCommands.id, claim.commandId), eq(taskSpecCommands.leaseFence, claim.fence)));
  }

  async release(claim: ApprovalClaim) {
    await this.database.update(taskSpecCommands).set({ leaseOwner: null, leaseExpiresAt: null }).where(and(eq(taskSpecCommands.id, claim.commandId), eq(taskSpecCommands.leaseFence, claim.fence)));
  }
}
