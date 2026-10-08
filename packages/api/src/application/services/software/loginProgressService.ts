import type { SessionPrincipal } from "../../../context";
import type { AuthOperationRecord, SoftwareDao } from "../../database/dao/softwareDao";
import type { CredentialBroker, LoginStatus } from "../../software/credentialBroker";
import { requireAdmin, systemClock, type Clock } from "./softwareAccess";
import { SoftwareError } from "./softwareErrors";

export type PollView =
  | { state: "pending" }
  | { state: "awaiting_confirmation"; identityLabel: string; differsFromCurrent: boolean }
  | { state: "confirmed"; identityLabel: string }
  | { state: "failed" | "expired"; code: string };

export type ConfirmInput = { operationId: string; expectedConnectionRevision: number };
export type ConfirmView = { connectionId: string; authState: "connected"; revision: number; identityLabel: string };

const TERMINAL_STATES = ["confirmed", "failed", "expired"];
const UNKNOWN_OPERATION = "login_operation_unknown";

export class LoginProgressService {
  constructor(private readonly dao: SoftwareDao, private readonly broker: CredentialBroker, private readonly clock: Clock = systemClock) {}

  async poll(actor: SessionPrincipal, operationId: string): Promise<PollView> {
    await requireAdmin(this.dao, actor);
    return this.dao.transaction(async (dao) => {
      const operation = await requireOwnedOperation(dao, actor, operationId);
      if (TERMINAL_STATES.includes(operation.state) || operation.state === "awaiting_confirmation") return toView(operation, dao);
      return this.refresh(dao, operation);
    });
  }

  private async refresh(dao: SoftwareDao, operation: AuthOperationRecord): Promise<PollView> {
    const status = await this.brokerStatus(operation.id);
    if (status.state === "pending") return { state: "pending" };
    const patch = patchFor(status);
    const updated = await dao.operations.update(operation.id, patch);
    if (status.state === "awaiting_confirmation") return toView(updated, dao);
    await releasePendingConnection(dao, updated);
    return toView(updated, dao);
  }

  private async brokerStatus(operationId: string): Promise<LoginStatus> {
    try {
      return await this.broker.pollLogin(operationId);
    } catch (error) {
      if (error instanceof Error && error.message === UNKNOWN_OPERATION) return { state: "expired", operationId, credentialRevision: 0 };
      throw new SoftwareError("service_unavailable");
    }
  }
}

export async function requireOwnedOperation(dao: SoftwareDao, actor: SessionPrincipal, operationId: string) {
  const operation = await dao.operations.find(operationId);
  if (!operation) throw new SoftwareError("operation_unavailable");
  if (operation.actorId !== actor.userId) throw new SoftwareError("operation_forbidden");
  return operation;
}

function patchFor(status: LoginStatus) {
  if (status.state === "awaiting_confirmation") return { state: status.state, accountLabel: status.identity.label, accountFingerprint: status.identity.fingerprint };
  if (status.state === "failed") return { state: status.state, failureCode: status.code };
  return { state: "expired" as const, failureCode: "login_expired" };
}

async function releasePendingConnection(dao: SoftwareDao, operation: AuthOperationRecord) {
  const connection = await dao.connections.lock(operation.connectionId);
  if (connection?.authState !== "pending") return;
  await dao.connections.update(connection.id, { authState: operation.state === "expired" ? "expired" : "failed" });
}

async function toView(operation: AuthOperationRecord, dao: SoftwareDao): Promise<PollView> {
  const label = operation.accountLabel ?? "";
  if (operation.state === "confirmed") return { state: "confirmed", identityLabel: label };
  if (operation.state === "pending") return { state: "pending" };
  if (operation.state !== "awaiting_confirmation") return { state: operation.state, code: operation.failureCode ?? "auth_failed" };
  const connection = await dao.connections.find(operation.connectionId);
  const prior = connection?.accountFingerprint ?? null;
  return { state: "awaiting_confirmation", identityLabel: label, differsFromCurrent: prior !== null && prior !== operation.accountFingerprint };
}
