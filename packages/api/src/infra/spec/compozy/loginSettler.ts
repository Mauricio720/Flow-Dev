import type { LoginFailureCode, LoginStatus } from "../../../application/software/credentialBroker";
import { driverFor, type BrokerContext } from "./brokerContext";
import type { LoginOperation } from "./loginOperations";
import { safeIdentity } from "./safeIdentity";

const UNKNOWN_OPERATION = "login_operation_unknown";

export class LoginSettler {
  constructor(private readonly context: BrokerContext) {}

  require(operationId: string): LoginOperation {
    const operation = this.context.operations.find(operationId);
    if (!operation) throw new Error(UNKNOWN_OPERATION);
    return operation;
  }

  async poll(operationId: string): Promise<LoginStatus> {
    const operation = this.require(operationId);
    if (operation.settled) return operation.settled;
    if (operation.authenticated) return operation.authenticated;
    if (this.context.now() > operation.expiresAt) return this.settle(operation, { state: "expired", operationId, credentialRevision: await this.revision(operation) });
    const progress = await driverFor(this.context, operation.kind).progress(operation.loginId);
    if (progress === "pending") return { state: "pending", operationId };
    if (progress !== "completed") return this.fail(operation, progress === "declined" ? "auth_declined" : "auth_failed");
    return this.authenticate(operation);
  }

  async confirm(operationId: string): Promise<LoginStatus> {
    const operation = this.require(operationId);
    if (operation.settled) return operation.settled;
    const status = await this.poll(operationId);
    if (status.state !== "awaiting_confirmation") return status;
    const credentialRevision = status.credentialRevision + 1;
    await this.context.homes.writeRevision({ home: operation.stagingHome, revision: credentialRevision });
    await this.context.homes.promote({ operationId, connectionId: operation.connectionId });
    return this.settle(operation, { state: "confirmed", operationId, identity: status.identity, credentialRevision });
  }

  async complete(operationId: string) {
    this.require(operationId);
    await this.context.homes.completePromotion(operationId);
  }

  async rollback(operationId: string) {
    const operation = this.require(operationId);
    await this.context.homes.rollbackPromotion({ operationId, connectionId: operation.connectionId });
    operation.settled = null;
  }

  private revision(operation: LoginOperation) {
    return this.context.homes.readRevision(operation.connectionId);
  }

  private async authenticate(operation: LoginOperation): Promise<LoginStatus> {
    const account = await driverFor(this.context, operation.kind).readAccount(operation.stagingHome);
    if (!account?.subscription) return this.fail(operation, "auth_ineligible");
    const awaiting = { state: "awaiting_confirmation" as const, operationId: operation.operationId, identity: safeIdentity(account), credentialRevision: await this.revision(operation) };
    operation.authenticated = awaiting;
    return awaiting;
  }

  private async fail(operation: LoginOperation, code: LoginFailureCode) {
    return this.settle(operation, { state: "failed", operationId: operation.operationId, code, credentialRevision: await this.revision(operation) });
  }

  private async settle(operation: LoginOperation, status: LoginStatus) {
    if (status.state !== "confirmed") await this.context.homes.discardStaging(operation.operationId);
    if (status.state === "expired") await driverFor(this.context, operation.kind).cancel(operation.loginId);
    operation.settled = status;
    return status;
  }
}
