import type { SessionPrincipal } from "../../../context";
import type { AuthOperationRecord, SoftwareDao } from "../../database/dao/softwareDao";
import type { CredentialBroker } from "../../software/credentialBroker";
import type { CompozyControlGateway } from "../../software/compozyControlGateway";
import type { ConfirmInput, ConfirmView } from "./loginProgressService";
import { requireOwnedOperation } from "./loginProgressService";
import { requireAdmin, systemClock, type Clock } from "./softwareAccess";
import { SoftwareError } from "./softwareErrors";

const FINGERPRINT_AUDIT_LENGTH = 12;

export class LoginConfirmService {
  constructor(private readonly dao: SoftwareDao, private readonly broker: CredentialBroker, private readonly gateway: CompozyControlGateway, private readonly clock: Clock = systemClock) {}

  async confirm(actor: SessionPrincipal, input: ConfirmInput): Promise<ConfirmView> {
    await requireAdmin(this.dao, actor);
    let result: ConfirmView;
    const operation = await this.dao.operations.find(input.operationId);
    const connection = operation ? await this.dao.connections.find(operation.connectionId) : null;
    const previouslyConnected = connection?.authState === "connected";
    let effectiveInput = input;
    if (previouslyConnected && operation?.state !== "confirmed") {
      const pending = await this.dao.transaction(async (dao) => {
        const current = await dao.connections.lock(connection.id);
        if (!current) throw new SoftwareError("connection_unavailable");
        if (current.revision !== input.expectedConnectionRevision) throw new SoftwareError("connection_revision_changed", undefined, { revision: current.revision });
        return dao.connections.update(current.id, { authState: "pending" });
      });
      effectiveInput = { ...input, expectedConnectionRevision: pending.revision };
    }
    try {
      result = await this.dao.transaction((dao) => new LoginConfirmService(dao, this.broker, this.gateway, this.clock).confirmLocked(actor, effectiveInput, previouslyConnected));
    } catch (error) {
      await this.broker.rollbackLogin(input.operationId).catch(() => undefined);
      if (connection && operation?.state !== "confirmed") {
        const restoreState = previouslyConnected ? "connected" : connection.authState === "pending" ? "unconnected" : connection.authState;
        await this.dao.transaction(async (dao) => {
          const current = await dao.connections.lock(connection.id);
          if (current?.authState === "pending") await dao.connections.update(current.id, { authState: restoreState });
        }).catch(() => undefined);
      }
      if (!previouslyConnected && connection) await this.gateway.revokeProviderOverlay(connection.runtimeProviderId).catch(() => undefined);
      throw error;
    }
    await this.broker.completeLogin(input.operationId);
    return result;
  }

  private async confirmLocked(actor: SessionPrincipal, input: ConfirmInput, previouslyConnected: boolean): Promise<ConfirmView> {
    const operation = await requireOwnedOperation(this.dao, actor, input.operationId);
    const connection = await this.dao.connections.lock(operation.connectionId);
    if (!connection) throw new SoftwareError("connection_unavailable");
    if (operation.state === "confirmed") return view(connection.id, operation);
    if (operation.state === "expired") throw new SoftwareError("login_expired");
    if (operation.state !== "awaiting_confirmation") throw new SoftwareError("operation_not_authenticated");
    if (connection.revision !== input.expectedConnectionRevision) throw new SoftwareError("connection_revision_changed", undefined, { revision: connection.revision });
    await this.swapCredentials(operation);
    const overlay = await this.gateway.provisionProviderOverlay({ providerId: connection.runtimeProviderId, providerKind: connection.providerKind, label: connection.label, homePath: this.broker.activeHome(connection.id) });
    if (!overlay.ok) throw new SoftwareError("service_unavailable");
    const probe = await this.gateway.probeProvider(connection.runtimeProviderId);
    if (!probe.ok || probe.value.providerId !== connection.runtimeProviderId || !probe.value.authenticated) throw new SoftwareError("service_unavailable");
    const models = await this.gateway.listModels(connection.runtimeProviderId);
    if (!models.ok || !models.value.some((model) => model.providerId === connection.runtimeProviderId && model.selectable)) throw new SoftwareError("service_unavailable");
    const updated = await this.dao.connections.update(connection.id, { authState: "connected", accountLabel: operation.accountLabel, accountFingerprint: operation.accountFingerprint, disabledAt: null, lastCheckedAt: this.clock() });
    const confirmed = await this.dao.operations.update(operation.id, { state: "confirmed", resultRevision: updated.revision });
    await this.audit(actor, { connectionId: connection.id, operation: confirmed, previouslyConnected });
    return view(connection.id, confirmed);
  }

  private async swapCredentials(operation: AuthOperationRecord) {
    const status = await this.broker.confirmLogin(operation.id).catch(() => null);
    if (status?.state === "confirmed") return;
    if (status?.state === "expired") throw new SoftwareError("login_expired");
    throw new SoftwareError("operation_not_authenticated");
  }

  private audit(actor: SessionPrincipal, input: { connectionId: string; operation: AuthOperationRecord; previouslyConnected: boolean }) {
    const event = input.previouslyConnected ? "connection.reconnected" : "connection.connected";
    const fingerprint = input.operation.accountFingerprint?.slice(0, FINGERPRINT_AUDIT_LENGTH) ?? null;
    return this.dao.audit.append({ actorId: actor.userId, event, diff: { connectionId: input.connectionId, accountFingerprint: fingerprint } });
  }
}

function view(connectionId: string, operation: AuthOperationRecord): ConfirmView {
  return { connectionId, authState: "connected", revision: operation.resultRevision ?? 0, identityLabel: operation.accountLabel ?? "" };
}
