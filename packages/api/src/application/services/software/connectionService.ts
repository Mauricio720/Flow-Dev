import type { SessionPrincipal } from "../../../context";
import type { ConnectionRecord, SoftwareDao } from "../../database/dao/softwareDao";
import type { CredentialBroker } from "../../software/credentialBroker";
import type { CompozyControlGateway } from "../../software/compozyControlGateway";
import { NO_ACTIVE_RUNS, type ActiveRunCounter } from "./activeRuns";
import { normalizeLabel } from "./connectionRules";
import { replayedAudit, requireAdmin, systemClock, type Clock } from "./softwareAccess";
import { SoftwareError } from "./softwareErrors";
import { requestHash } from "./settingsRules";

export type ListInput = { cursor?: string; limit: number; search?: string };
export type RenameInput = { connectionId: string; label: string; expectedRevision: number };
export type DisconnectInput = { connectionId: string; expectedRevision: number; idempotencyKey: string };
export type DisconnectResult = { connectionId: string; authState: string; revision: number; affectedActiveRuns: number };

export type ConnectionDependencies = { broker: CredentialBroker; gateway: CompozyControlGateway; activeRuns?: ActiveRunCounter; clock?: Clock };

export class ConnectionService {
  constructor(private readonly dao: SoftwareDao, private readonly deps: ConnectionDependencies) {}

  async list(actor: SessionPrincipal, input: ListInput) {
    await requireAdmin(this.dao, actor);
    return this.dao.connections.list({ ...input, executionTarget: "host" });
  }

  async rename(actor: SessionPrincipal, input: RenameInput) {
    await requireAdmin(this.dao, actor);
    const label = normalizeLabel(input.label);
    return this.dao.transaction(async (dao) => {
      const current = await requireConnection(dao, input.connectionId, input.expectedRevision);
      const renamed = await dao.connections.update(current.id, { label });
      await dao.audit.append({ actorId: actor.userId, event: "connection.renamed", diff: { connectionId: current.id, before: current.label, after: label } });
      return { connectionId: renamed.id, label: renamed.label, revision: renamed.revision };
    });
  }

  async disconnect(actor: SessionPrincipal, input: DisconnectInput): Promise<DisconnectResult> {
    await requireAdmin(this.dao, actor);
    const outcome = await this.dao.transaction((dao) => new ConnectionService(dao, this.deps).disconnectLocked(actor, input));
    const { result } = outcome;
    if (!outcome.cleanupRequired) return result;
    const connection = await this.dao.connections.find(input.connectionId);
    if (connection) {
      const overlay = await this.deps.gateway.revokeProviderOverlay(connection.runtimeProviderId);
      if (!overlay.ok) throw new SoftwareError("service_unavailable");
      await this.deps.broker.disconnect(input.connectionId, input.idempotencyKey);
    }
    await this.deps.broker.completeDisconnect(input.connectionId, input.idempotencyKey);
    return result;
  }

  private async disconnectLocked(actor: SessionPrincipal, input: DisconnectInput): Promise<{ result: DisconnectResult; cleanupRequired: boolean }> {
    const hash = requestHash({ connectionId: input.connectionId, expectedRevision: input.expectedRevision });
    const replay = await replayedAudit(this.dao, { idempotencyKey: input.idempotencyKey, requestHash: hash });
    if (replay) return { result: replay.diff.result as DisconnectResult, cleanupRequired: true };
    const current = await requireConnection(this.dao, input.connectionId, input.expectedRevision);
    if (current.authState === "disconnected") return { result: { connectionId: current.id, authState: current.authState, revision: current.revision, affectedActiveRuns: 0 }, cleanupRequired: false };
    if (current.authState === "unconnected") throw new SoftwareError("connection_unavailable");
    const disabled = await this.dao.connections.update(current.id, { authState: "disconnected", disabledAt: (this.deps.clock ?? systemClock)() });
    const affectedActiveRuns = await (this.deps.activeRuns ?? NO_ACTIVE_RUNS).countActive(current.id);
    const result = { connectionId: disabled.id, authState: disabled.authState, revision: disabled.revision, affectedActiveRuns };
    await this.dao.audit.append({ actorId: actor.userId, event: "connection.disconnected", diff: { connectionId: current.id, result }, idempotencyKey: input.idempotencyKey, requestHash: hash });
    return { result, cleanupRequired: true };
  }
}

export async function requireConnection(dao: SoftwareDao, id: string, expectedRevision: number): Promise<ConnectionRecord> {
  const current = await dao.connections.lock(id);
  if (!current || (current.executionTarget ?? "host") !== "host") throw new SoftwareError("connection_unavailable");
  if (current.revision !== expectedRevision) throw new SoftwareError("connection_revision_changed", undefined, { revision: current.revision });
  return current;
}
