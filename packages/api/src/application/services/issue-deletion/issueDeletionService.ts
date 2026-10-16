import type { SessionPrincipal } from "../../../context";
import type { IssueDeletionDao, TaskDeletionFacts } from "../../database/dao/issueDeletionDao";
import type { DeletionAccess, DeletionProvider } from "./deletionPorts";
import type { DeletionDestination, DeletionFailureReason, DeletionOperation, DeletionPreview, DeletionState, DeletionStatus, DeletionTarget, RetryDeletionInput, StartDeletionInput } from "./issueDeletionContracts";
import { IssueDeletionError } from "./issueDeletionErrors";
import { isLinked, queueFingerprint, taskFingerprint } from "./deletionFingerprint";
import { retryAfterToSeconds } from "./deletionStages";

export type IssueDeletionServiceDeps = {
  dao: IssueDeletionDao;
  access: DeletionAccess;
  provider: DeletionProvider;
  clock?: () => Date;
};

type Authority = { allowed: boolean; reason: DeletionFailureReason | "forbidden" | null };

export class IssueDeletionService {
  private readonly clock: () => Date;

  constructor(private readonly deps: IssueDeletionServiceDeps) {
    this.clock = deps.clock ?? (() => new Date());
  }

  async preview(actor: SessionPrincipal, target: DeletionTarget): Promise<DeletionPreview> {
    if (target.kind === "task") return this.previewTask(actor, target);
    return this.previewQueue(actor, target);
  }

  async start(actor: SessionPrincipal, input: StartDeletionInput): Promise<DeletionStatus> {
    if (!actor.sessionId) throw new IssueDeletionError("session_required");
    if (input.target.kind === "task") return this.startTask(actor, input as StartDeletionInput & { target: Extract<DeletionTarget, { kind: "task" }> });
    return this.startQueue(actor, input as StartDeletionInput & { target: Extract<DeletionTarget, { kind: "queue" }> });
  }

  async status(actor: SessionPrincipal, operationId: string): Promise<DeletionStatus> {
    const operation = await this.deps.dao.byId(operationId);
    if (!operation) throw new IssueDeletionError("operation_unavailable");
    const binding = await this.deps.access.requireProject(actor, operation.projectId);
    if (!binding) throw new IssueDeletionError("target_unavailable");
    if (!(await this.canInspect(actor, operation))) throw new IssueDeletionError("forbidden");
    return this.toStatus(operation);
  }

  async retry(actor: SessionPrincipal, input: RetryDeletionInput): Promise<DeletionStatus> {
    if (!actor.sessionId) throw new IssueDeletionError("session_required");
    const operation = await this.deps.dao.byId(input.operationId);
    if (!operation) throw new IssueDeletionError("operation_unavailable");
    const binding = await this.deps.access.requireProject(actor, operation.projectId);
    if (!binding) throw new IssueDeletionError("target_unavailable");
    if (!(await this.canInspect(actor, operation))) throw new IssueDeletionError("forbidden");
    const bound = await this.deps.dao.byRequestKey(actor.userId, input.requestKey);
    if (bound && bound.id !== operation.id) throw new IssueDeletionError("conflict");
    if (operation.state === "completed") return this.toStatus(operation);
    const resume = await this.resumeState(operation);
    const current = await this.deps.dao.resume({ operationId: operation.id, state: resume });
    return this.toStatus(current);
  }

  private async previewTask(actor: SessionPrincipal, target: Extract<DeletionTarget, { kind: "task" }>): Promise<DeletionPreview> {
    const binding = await this.deps.access.requireProject(actor, target.projectId);
    if (!binding) throw new IssueDeletionError("target_unavailable");
    const facts = await this.deps.dao.taskFacts(target.projectId, target.taskId);
    if (!facts) throw new IssueDeletionError("target_unavailable");
    const isAdmin = await this.deps.access.isAdmin(actor);
    const linked = isLinked(facts);
    const destinations: DeletionDestination[] = linked ? ["flow_dev", "github"] : ["flow_dev"];
    const fingerprint = taskFingerprint({ projectId: target.projectId, taskId: target.taskId, repositoryId: facts.repositoryId, repositoryNodeId: facts.repositoryNodeId, issueNodeId: facts.issueNodeId, destinations });
    let canDelete: boolean;
    let deleteReason: DeletionPreview["deleteReason"] = null;
    const authority = await this.taskAuthority(actor, facts, isAdmin);
    canDelete = authority.allowed;
    deleteReason = authority.reason;
    return { target, title: facts.title, repository: `${binding.owner}/${binding.name}`, issueNumber: facts.issueNumber, destinations, canDelete, fingerprint, deleteReason };
  }

  private async previewQueue(actor: SessionPrincipal, target: Extract<DeletionTarget, { kind: "queue" }>): Promise<DeletionPreview> {
    const context = await this.deps.access.personalContext(actor, target.projectId);
    if (context.kind === "unavailable") throw new IssueDeletionError("target_unavailable");
    if (context.kind === "authorization") {
      return { target, title: "", repository: "", issueNumber: null, destinations: ["flow_dev", "github"], canDelete: false, fingerprint: "", deleteReason: "authorization_needed" };
    }
    const inspected = await this.deps.provider.inspect(context.token, { issueNodeId: target.issueNodeId, repositoryId: context.repositoryId, repositoryNodeId: context.repositoryNodeId, issueNumber: 0 });
    if (!inspected.ok) {
      return { target, title: "", repository: "", issueNumber: null, destinations: ["flow_dev", "github"], canDelete: false, fingerprint: "", deleteReason: inspected.failure };
    }
    const facts = inspected.value;
    const isAdmin = await this.deps.access.isAdmin(actor);
    const authorAllowed = facts.authorDatabaseId !== null && facts.authorDatabaseId === context.githubUserId;
    const destinations: DeletionDestination[] = ["flow_dev", "github"];
    const fingerprint = queueFingerprint({ projectId: target.projectId, issueNodeId: target.issueNodeId, repositoryId: facts.repositoryId, repositoryNodeId: facts.repositoryNodeId, destinations });
    return { target, title: facts.title, repository: `${facts.repositoryOwner}/${facts.repositoryName}`, issueNumber: facts.number, destinations, canDelete: authorAllowed || isAdmin, fingerprint, deleteReason: authorAllowed || isAdmin ? null : "forbidden" };
  }

  private async startTask(actor: SessionPrincipal, input: StartDeletionInput & { target: Extract<DeletionTarget, { kind: "task" }> }): Promise<DeletionStatus> {
    const target = input.target;
    const binding = await this.deps.access.requireProject(actor, target.projectId);
    if (!binding) throw new IssueDeletionError("target_unavailable");
    const facts = await this.deps.dao.taskFacts(target.projectId, target.taskId);
    if (!facts) throw new IssueDeletionError("target_unavailable");
    const authority = await this.taskAuthority(actor, facts, await this.deps.access.isAdmin(actor));
    if (!authority.allowed) throw new IssueDeletionError("forbidden");
    const bound = await this.deps.dao.byRequestKey(actor.userId, input.requestKey);
    if (bound) {
      if (bound.taskId === target.taskId && bound.projectId === target.projectId) return this.toStatus(bound);
      throw new IssueDeletionError("conflict");
    }
    const linked = isLinked(facts);
    const destinations: DeletionDestination[] = linked ? ["flow_dev", "github"] : ["flow_dev"];
    const fingerprint = taskFingerprint({ projectId: target.projectId, taskId: target.taskId, repositoryId: facts.repositoryId, repositoryNodeId: facts.repositoryNodeId, issueNodeId: facts.issueNodeId, destinations });
    if (fingerprint !== input.fingerprint) throw new IssueDeletionError("precondition_failed");
    if (facts.pendingDeletion) {
      const existing = await this.deps.dao.activeForTask(facts.taskId);
      if (existing) return this.toStatus(existing);
    }
    const { operation } = await this.deps.dao.reserve({
      projectId: target.projectId,
      initiatorUserId: actor.userId,
      requestKey: input.requestKey,
      reservation: { kind: "task", projectId: target.projectId, taskId: target.taskId, repositoryId: facts.repositoryId, repositoryNodeId: facts.repositoryNodeId, issueNodeId: linked ? facts.issueNodeId : null, issueNumber: linked ? facts.issueNumber : null },
      remotePresence: linked ? "unknown" : "not_applicable",
    });
    return this.toStatus(operation);
  }

  private async startQueue(actor: SessionPrincipal, input: StartDeletionInput & { target: Extract<DeletionTarget, { kind: "queue" }> }): Promise<DeletionStatus> {
    const target = input.target;
    const context = await this.deps.access.personalContext(actor, target.projectId);
    if (context.kind === "unavailable") throw new IssueDeletionError("target_unavailable");
    if (context.kind === "authorization") throw new IssueDeletionError("authorization_needed");
    const inspected = await this.deps.provider.inspect(context.token, { issueNodeId: target.issueNodeId, repositoryId: context.repositoryId, repositoryNodeId: context.repositoryNodeId, issueNumber: 0 });
    if (!inspected.ok) {
      if (inspected.failure === "invalid_target" || inspected.failure === "identity_conflict") throw new IssueDeletionError("precondition_failed");
      throw new IssueDeletionError(inspected.failure, inspected.retryAfterSeconds);
    }
    const facts = inspected.value;
    const isAdmin = await this.deps.access.isAdmin(actor);
    const authorAllowed = facts.authorDatabaseId !== null && facts.authorDatabaseId === context.githubUserId;
    if (!authorAllowed && !isAdmin) throw new IssueDeletionError("forbidden");
    const destinations: DeletionDestination[] = ["flow_dev", "github"];
    const fingerprint = queueFingerprint({ projectId: target.projectId, issueNodeId: target.issueNodeId, repositoryId: facts.repositoryId, repositoryNodeId: facts.repositoryNodeId, destinations });
    if (fingerprint !== input.fingerprint) throw new IssueDeletionError("precondition_failed");
    const { operation } = await this.deps.dao.reserve({
      projectId: target.projectId,
      initiatorUserId: actor.userId,
      requestKey: input.requestKey,
      reservation: { kind: "queue", projectId: target.projectId, repositoryId: facts.repositoryId, repositoryNodeId: facts.repositoryNodeId, issueNodeId: target.issueNodeId, issueNumber: facts.number },
      remotePresence: "present",
    });
    return this.toStatus(operation);
  }

  private async taskAuthority(actor: SessionPrincipal, facts: TaskDeletionFacts, isAdmin: boolean): Promise<Authority> {
    if (facts.origin === "external") {
      if (!facts.issueNodeId) return isAdmin ? { allowed: true, reason: null } : { allowed: false, reason: "missing_identity" };
      const linked = await this.linkedAuthority(actor, facts, isAdmin);
      if (!linked.allowed) return linked;
      return linked.authorizedAuthor || isAdmin ? { allowed: true, reason: null } : { allowed: false, reason: "forbidden" };
    }
    if (facts.authorUserId !== actor.userId && !isAdmin) return { allowed: false, reason: "forbidden" };
    if (!facts.issueNodeId) return { allowed: true, reason: null };
    const linked = await this.linkedAuthority(actor, facts, isAdmin);
    return linked.allowed ? { allowed: true, reason: null } : linked;
  }

  private async linkedAuthority(actor: SessionPrincipal, facts: TaskDeletionFacts, isAdmin: boolean): Promise<Authority & { authorizedAuthor?: boolean }> {
    const context = await this.deps.access.personalContext(actor, facts.projectId);
    if (context.kind !== "ok") return { allowed: false, reason: "authorization_needed" };
    const githubUserId = await this.deps.access.githubIdentity(actor.userId);
    if (!githubUserId || githubUserId !== context.githubUserId) return { allowed: false, reason: "authorization_needed" };
    const inspected = await this.deps.provider.inspect(context.token, { issueNodeId: facts.issueNodeId!, repositoryId: facts.repositoryId, repositoryNodeId: facts.repositoryNodeId, issueNumber: facts.issueNumber ?? 0 });
    if (!inspected.ok) {
      const reason: Authority["reason"] = inspected.failure === "github_permission_denied" || inspected.failure === "invalid_target" || inspected.failure === "identity_conflict" ? "forbidden" : inspected.failure;
      return { allowed: false, reason };
    }
    if (inspected.value.nodeId !== facts.issueNodeId || inspected.value.repositoryId !== facts.repositoryId || inspected.value.repositoryNodeId !== facts.repositoryNodeId) return { allowed: false, reason: "forbidden" };
    if (!inspected.value.viewerCanDelete) return { allowed: false, reason: "github_permission_denied" };
    return { allowed: true, reason: null, authorizedAuthor: inspected.value.authorDatabaseId === githubUserId };
  }

  private async canInspect(actor: SessionPrincipal, operation: DeletionOperation): Promise<boolean> {
    if (operation.initiatorUserId === actor.userId) return true;
    const isAdmin = await this.deps.access.isAdmin(actor);
    if (isAdmin) return true;
    if (operation.taskId) {
      const facts = await this.deps.dao.taskFacts(operation.projectId, operation.taskId);
      return facts?.authorUserId === actor.userId;
    }
    return false;
  }

  private async resumeState(operation: DeletionOperation): Promise<DeletionState> {
    if (!operation.workStopped) return "stopping";
    if (operation.taskId) {
      const publication = await this.deps.dao.publicationState(operation.taskId);
      if (publication.unresolved) return "reconciling";
    }
    if (operation.issueNodeId) return operation.remotePresence === "unknown" ? "verifying_remote" : "deleting_remote";
    return "cleaning_local";
  }

  private toStatus(operation: DeletionOperation): DeletionStatus {
    const now = this.clock();
    return {
      operationId: operation.id,
      state: operation.state,
      remotePresence: operation.remotePresence,
      workStopped: operation.workStopped,
      reason: operation.reason,
      retryAfterSeconds: retryAfterToSeconds(operation.retryAt, now),
    };
  }
}
