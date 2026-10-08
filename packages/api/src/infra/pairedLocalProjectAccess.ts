import type { TaskFlowDao } from "../application/database/dao/taskFlowDao";
import type { LocalProjectAccess, LocalProjectInfo } from "../application/services/task-flow/localProjectAccess";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import type { LocalConnectorDao } from "../application/database/dao/localConnectorDao";
import { localPayloadHash } from "../application/services/local-execution/localHash";
import { LocalExecutionError } from "../application/services/local-execution/localExecutionErrors";

const HEARTBEAT_MAX_AGE_MS = 30_000;
const PREPARATION_LIFETIME_MS = 5 * 60_000;

export class PairedLocalProjectAccess implements LocalProjectAccess {
  constructor(private readonly deps: { flow: Pick<TaskFlowDao, "taskContext">; local: LocalConnectorDao; repositories: RepositoryAccessService; now?: () => Date }) {}

  inspect(input: { taskId: string; projectId: string; actorId?: string }) {
    return this.resolveTarget({ ...input, actorId: input.actorId ?? "" });
  }

  async resolveTarget(input: { taskId: string; projectId: string; actorId: string }): Promise<LocalProjectInfo | null> {
    const context = await this.deps.flow.taskContext(input.taskId);
    if (!context || context.projectId !== input.projectId || !context.operatorUserId || (input.actorId && input.actorId !== context.operatorUserId)) return null;
    const repository = await this.deps.repositories.requirePersonalRead({ userId: context.operatorUserId }, input.projectId);
    const link = await this.deps.local.currentProjectLink({ ownerUserId: context.operatorUserId, projectId: input.projectId });
    if (!link || link.repositoryId !== repository.githubId || link.repositoryNodeId !== repository.nodeId || link.readiness !== "ready") return null;
    const machine = await this.deps.local.machineById({ ownerUserId: context.operatorUserId, machineId: link.machineId });
    const now = (this.deps.now ?? (() => new Date()))().getTime();
    if (!machine || machine.revokedAt || machine.credentialExpiresAt.getTime() <= now || !machine.lastHeartbeatAt || now - machine.lastHeartbeatAt.getTime() >= HEARTBEAT_MAX_AGE_MS) return null;
    return { key: `local:${link.id}`, workspaceId: null, safeLabel: link.safeLabel, target: { machineId: machine.id, linkId: link.id, linkRevision: link.revision, checkoutHandle: link.checkoutHandle }, loops: machine.loopCatalog ?? [] };
  }

  async prepare(input: { taskId: string; projectId: string; actorId: string; actionId: string; sourceSnapshotId: string; action: import("../application/services/task-flow/flowContracts").FlowAction; requestKey: string }) {
    if (!/^[\da-f-]{36}$/i.test(input.sourceSnapshotId) || !/^[\da-f-]{36}$/i.test(input.requestKey) || !input.actionId || input.actionId.length > 128) throw new LocalExecutionError("invalid_input");
    const project = await this.resolveTarget(input);
    if (!project) throw new LocalExecutionError("link_unavailable");
    const preparationId = input.requestKey;
    const requestKey = input.requestKey;
    const payload = { preparationId, actionId: input.actionId, sourceSnapshotId: input.sourceSnapshotId, checkoutLabel: project.safeLabel, action: input.action as unknown as Record<string, unknown> };
    const now = (this.deps.now ?? (() => new Date()))();
    await this.deps.local.enqueueCommand({
      id: preparationId,
      machineId: project.target.machineId, linkId: project.target.linkId, projectId: input.projectId, actorId: input.actorId,
      runId: null, preparationId, protocolVersion: 1, target: project.target, requestKey, kind: "prepare", payload,
      payloadHash: localPayloadHash(payload), fence: 1, leaseExpiresAt: new Date(now.getTime() + 60_000), expectedLinkRevision: project.target.linkRevision, now,
    });
    return { preparationId };
  }

  async preparationStatus(input: { actorId: string; projectId: string; preparationId: string }) {
    const result = await this.deps.local.commandForActor({ actorId: input.actorId, projectId: input.projectId, commandId: input.preparationId });
    if (!result || result.command.preparationId !== input.preparationId || result.command.kind !== "prepare") return null;
    const prepared = result.events.find((event) => event.kind === "prepared");
    const terminal = result.events.find((event) => event.kind === "terminal");
    const payload = prepared?.payload ?? {};
    const terminalPayload = terminal?.payload ?? {};
    const expired = prepared && (this.deps.now ?? (() => new Date()))().getTime() - result.command.createdAt.getTime() >= PREPARATION_LIFETIME_MS;
    return {
      preparationId: input.preparationId,
      state: expired ? "expired" : prepared ? "ready" : terminal ? String(terminalPayload.outcome) : result.command.state,
      safeLabel: typeof payload.checkoutLabel === "string" ? payload.checkoutLabel : "Checkout local",
      dirty: typeof payload.dirty === "boolean" ? payload.dirty : null,
      capabilities: Array.isArray(payload.capabilities) ? payload.capabilities as string[] : [],
      manifestHash: typeof payload.manifestHash === "string" ? payload.manifestHash : null,
      checkoutDigest: typeof payload.checkoutDigest === "string" ? payload.checkoutDigest : null,
      requiredGates: prepared && Array.isArray(payload.requiredGates) ? payload.requiredGates as import("../application/services/task-flow/localProjectAccess").LocalRequiredGate[] : [],
      reason: typeof terminalPayload.reason === "string" ? terminalPayload.reason : null,
      detail: typeof terminalPayload.detail === "string" ? terminalPayload.detail : null,
    };
  }

  async validatePreparation(input: { taskId: string; projectId: string; actorId: string; actionId: string; sourceSnapshotId: string; preparationId: string; action?: import("../application/services/task-flow/flowContracts").FlowAction }) {
    const current = await this.resolveTarget(input);
    if (!current) return null;
    const result = await this.deps.local.commandForActor({ actorId: input.actorId, projectId: input.projectId, commandId: input.preparationId });
    if (!result || result.command.kind !== "prepare" || result.command.preparationId !== input.preparationId || result.command.target.linkId !== current.target.linkId || result.command.target.linkRevision !== current.target.linkRevision) return null;
    if ((this.deps.now ?? (() => new Date()))().getTime() - result.command.createdAt.getTime() >= PREPARATION_LIFETIME_MS) throw new LocalExecutionError("preparation_expired");
    const payload = result.command.payload;
    if (payload.actionId !== input.actionId || payload.sourceSnapshotId !== input.sourceSnapshotId) return null;
    if (input.action && localPayloadHash(payload.action) !== localPayloadHash(input.action)) return null;
    const prepared = result.events.find((event) => event.kind === "prepared");
    if (!prepared || typeof prepared.payload.manifestHash !== "string" || typeof prepared.payload.checkoutDigest !== "string") return null;
    return { manifestHash: prepared.payload.manifestHash, checkoutDigest: prepared.payload.checkoutDigest, requiredGates: prepared.payload.requiredGates as import("../application/services/task-flow/localProjectAccess").LocalRequiredGate[] };
  }
}
