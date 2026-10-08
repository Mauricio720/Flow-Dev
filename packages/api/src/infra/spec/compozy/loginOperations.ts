import type { LoginStatus } from "../../../application/software/credentialBroker";

export type LoginKind = "codex" | "claude";

export type LoginOperation = {
  kind: LoginKind;
  operationId: string;
  connectionId: string;
  loginId: string;
  stagingHome: string;
  expiresAt: Date;
  start: { verificationUrl: string; userCode: string };
  settled: LoginStatus | null;
  authenticated: Extract<LoginStatus, { state: "awaiting_confirmation" }> | null;
};

export class LoginOperations {
  private readonly operations = new Map<string, LoginOperation>();

  find(operationId: string) {
    return this.operations.get(operationId);
  }

  add(operation: LoginOperation) {
    this.operations.set(operation.operationId, operation);
  }

  hasPendingFor(connectionId: string, now: Date) {
    return [...this.operations.values()].some((item) => item.connectionId === connectionId && !item.settled && item.expiresAt > now);
  }
}
