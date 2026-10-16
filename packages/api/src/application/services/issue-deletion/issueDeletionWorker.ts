import type { IssueDeletionDao, DeletionClaim } from "../../database/dao/issueDeletionDao";
import type { DeletionAccess, DeletionProvider } from "./deletionPorts";
import type { DeletionStopCoordinator } from "./deletionStop";
import type { DeletionFailureReason, DeletionOperation } from "./issueDeletionContracts";
import { IssueDeletionError } from "./issueDeletionErrors";

export type IssueDeletionWorkerDeps = {
  dao: IssueDeletionDao;
  access: DeletionAccess;
  provider: DeletionProvider;
  stop: DeletionStopCoordinator;
  owner: string;
  clock: () => Date;
  leaseMs: number;
};

export class IssueDeletionWorker {
  constructor(private readonly deps: IssueDeletionWorkerDeps) {}

  async tick(): Promise<boolean> {
    const { dao, owner, clock, leaseMs } = this.deps;
    const claim = await dao.claimNext({ owner, now: clock(), leaseMs });
    if (!claim) return false;
    try {
      await this.process(claim);
    } catch (error) {
      await this.settleFailure(claim, error);
    }
    return true;
  }

  private async process(claim: DeletionClaim) {
    const { operation } = claim;
    switch (operation.state) {
      case "stopping": return this.stopStage(claim);
      case "reconciling": return this.reconcileStage(claim);
      case "deleting_remote": return this.remoteStage(claim);
      case "verifying_remote": return this.verifyStage(claim);
      case "cleaning_local": return this.cleanupStage(claim);
      default: return;
    }
  }

  private async stopStage(claim: DeletionClaim) {
    const { operation } = claim;
    if (!operation.taskId) {
      await this.deps.dao.patch({ operationId: operation.id, fence: claim.fence, patch: { state: "reconciling", workStopped: true } });
      return;
    }
    const outcome = await this.deps.stop.stopTask(operation.taskId, operation.id);
    if (!outcome.workStopped) {
      await this.recover(claim, outcome.reason ?? "unknown_stop", undefined);
      return;
    }
    await this.deps.dao.patch({ operationId: operation.id, fence: claim.fence, patch: { state: "reconciling", workStopped: true } });
  }

  private async reconcileStage(claim: DeletionClaim) {
    const { operation } = claim;
    if (operation.taskId) {
      const publication = await this.deps.dao.publicationState(operation.taskId);
      if (publication.unresolved) {
        await this.recover(claim, "uncertain_publication", undefined);
        return;
      }
      if (publication.createdIdentity) {
        await this.deps.dao.adoptIdentity({ operationId: operation.id, identity: publication.createdIdentity });
        await this.deps.dao.patch({ operationId: operation.id, fence: claim.fence, patch: { state: "deleting_remote", remotePresence: "present", issueNodeId: publication.createdIdentity.issueNodeId, issueNumber: publication.createdIdentity.issueNumber } });
        return;
      }
      const facts = await this.deps.dao.taskFacts(operation.projectId, operation.taskId);
      const needsRemote = facts && (facts.status === "published" || facts.origin === "external" || facts.publicationOutcomes.includes("created"));
      if (needsRemote && !operation.issueNodeId) {
        await this.recover(claim, "missing_identity", undefined);
        return;
      }
      await this.deps.dao.patch({ operationId: operation.id, fence: claim.fence, patch: { state: "cleaning_local", remotePresence: "not_applicable" } });
      return;
    }
    if (operation.issueNodeId) {
      await this.deps.dao.patch({ operationId: operation.id, fence: claim.fence, patch: { state: operation.remotePresence === "unknown" ? "verifying_remote" : "deleting_remote" } });
      return;
    }
    await this.deps.dao.patch({ operationId: operation.id, fence: claim.fence, patch: { state: "cleaning_local", remotePresence: "not_applicable" } });
  }

  private async remoteStage(claim: DeletionClaim) {
    const { operation } = claim;
    const target = this.targetOf(operation);
    if (!target) {
      await this.recover(claim, "missing_identity", undefined);
      return;
    }
    const binding = await this.deps.access.requireProject({ userId: operation.initiatorUserId }, operation.projectId);
    if (!binding) {
      await this.recover(claim, "repository_access_lost", undefined);
      return;
    }
    if (binding.repositoryId !== operation.repositoryId || binding.repositoryNodeId !== operation.repositoryNodeId) {
      await this.recover(claim, "identity_conflict", undefined);
      return;
    }
    const token = await this.deps.provider.tokenFor(operation);
    if (!token) {
      await this.recover(claim, "authorization_needed", undefined);
      return;
    }
    const inspected = await this.deps.provider.inspect(token, target);
    if (!inspected.ok) {
      if (inspected.failure === "invalid_target" || inspected.failure === "repository_access_lost") {
        await this.deps.dao.patch({ operationId: operation.id, fence: claim.fence, patch: { state: "verifying_remote", remotePresence: "unknown" } });
        return;
      }
      const presence = inspected.failure === "github_permission_denied" || inspected.failure === "identity_conflict" ? "present" : operation.remotePresence;
      await this.recover(claim, inspected.failure, inspected.retryAfterSeconds, presence);
      return;
    }
    if (inspected.value.nodeId !== operation.issueNodeId || inspected.value.number !== operation.issueNumber) {
      await this.recover(claim, "identity_conflict", undefined, "present");
      return;
    }
    if (!inspected.value.viewerCanDelete) {
      await this.recover(claim, "github_permission_denied", undefined, "present");
      return;
    }
    await this.deps.dao.heartbeat({ operationId: operation.id, owner: claim.workerId, fence: claim.fence, now: this.deps.clock(), leaseMs: this.deps.leaseMs });
    const removed = await this.deps.provider.remove(token, target);
    if (!removed.ok) {
      if (removed.failure === "provider_unavailable") {
        await this.deps.dao.patch({ operationId: operation.id, fence: claim.fence, patch: { state: "verifying_remote", remotePresence: "unknown" } });
        return;
      }
      await this.recover(claim, removed.failure, removed.retryAfterSeconds, "present");
      return;
    }
    await this.deps.dao.patch({ operationId: operation.id, fence: claim.fence, patch: { state: "verifying_remote", remotePresence: "unknown" } });
  }

  private async verifyStage(claim: DeletionClaim) {
    const { operation } = claim;
    const target = this.targetOf(operation);
    if (!target) {
      await this.recover(claim, "missing_identity", undefined);
      return;
    }
    const token = await this.deps.provider.tokenFor(operation);
    if (!token) {
      await this.recover(claim, "authorization_needed", undefined);
      return;
    }
    await this.deps.dao.heartbeat({ operationId: operation.id, owner: claim.workerId, fence: claim.fence, now: this.deps.clock(), leaseMs: this.deps.leaseMs });
    const outcome = await this.deps.provider.absence(token, target);
    if (!outcome.ok) {
      await this.recover(claim, outcome.failure, outcome.retryAfterSeconds);
      return;
    }
    if (outcome.value === "absent") {
      await this.deps.dao.patch({ operationId: operation.id, fence: claim.fence, patch: { state: "cleaning_local", remotePresence: "absent" } });
      return;
    }
    await this.deps.dao.patch({ operationId: operation.id, fence: claim.fence, patch: { state: "deleting_remote", remotePresence: "present" } });
  }

  private async cleanupStage(claim: DeletionClaim) {
    const { operation } = claim;
    const expectedRemote = operation.remotePresence === "not_applicable" ? "not_applicable" as const : "absent" as const;
    if (operation.taskId) {
      await this.deps.dao.purgeTaskAndComplete({ operationId: operation.id, taskId: operation.taskId, fence: claim.fence, expectedRemote });
      return;
    }
    await this.deps.dao.completeQueueOnly({ operationId: operation.id, fence: claim.fence });
  }

  private async recover(claim: DeletionClaim, reason: DeletionFailureReason, retryAfterSeconds: number | undefined, presence?: DeletionOperation["remotePresence"]) {
    const patch: Parameters<IssueDeletionDao["patch"]>[0]["patch"] = { state: "recoverable", reason };
    if (presence) patch.remotePresence = presence;
    if (retryAfterSeconds !== undefined && retryAfterSeconds > 0) {
      patch.retryAt = new Date(this.deps.clock().getTime() + retryAfterSeconds * 1000);
    } else {
      patch.retryAt = null;
    }
    await this.deps.dao.patch({ operationId: claim.operation.id, fence: claim.fence, patch });
  }

  private async settleFailure(claim: DeletionClaim, error: unknown) {
    if (error instanceof IssueDeletionError && error.reason === "stale_fence") return;
    if (error instanceof IssueDeletionError) {
      const known = ["github_permission_denied", "provider_rate_limited", "provider_unavailable", "authorization_needed", "identity_conflict", "missing_identity", "invalid_target", "unknown_remote_outcome", "unknown_stop", "uncertain_publication", "repository_access_lost"] as DeletionFailureReason[];
      const reason: DeletionFailureReason = known.includes(error.reason as DeletionFailureReason) ? error.reason as DeletionFailureReason : "provider_unavailable";
      await this.recover(claim, reason, error.retryAfterSeconds);
      return;
    }
    await this.recover(claim, "provider_unavailable", undefined);
  }

  private targetOf(operation: DeletionOperation) {
    if (!operation.issueNodeId || operation.issueNumber === null) return null;
    return { issueNodeId: operation.issueNodeId, repositoryId: operation.repositoryId, repositoryNodeId: operation.repositoryNodeId, issueNumber: operation.issueNumber };
  }
}
