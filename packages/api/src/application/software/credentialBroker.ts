export type SafeIdentity = { label: string; fingerprint: string };

export type LoginStart = {
  operationId: string;
  verificationUrl: string;
  userCode: string;
  expiresAt: Date;
};

export type LoginFailureCode = "auth_declined" | "auth_failed" | "auth_ineligible";

export type LoginStatus =
  | { state: "pending"; operationId: string }
  | { state: "expired"; operationId: string; credentialRevision: number }
  | { state: "failed"; operationId: string; code: LoginFailureCode; credentialRevision: number }
  | { state: "awaiting_confirmation"; operationId: string; identity: SafeIdentity; credentialRevision: number }
  | { state: "confirmed"; operationId: string; identity: SafeIdentity; credentialRevision: number };

export type BeginLoginInput = { connectionId: string; operationId: string };

export type AttemptGrant = {
  attemptId: string;
  connectionId: string;
  mountPath: string;
};

export type GrantInput = { connectionId: string; attemptId: string };

export interface CredentialBroker {
  beginCodexLogin(input: BeginLoginInput): Promise<LoginStart>;
  beginClaudeLogin(input: BeginLoginInput): Promise<LoginStart>;
  hasOperation(operationId: string): boolean;
  pollLogin(operationId: string): Promise<LoginStatus>;
  confirmLogin(operationId: string): Promise<LoginStatus>;
  completeLogin(operationId: string): Promise<void>;
  rollbackLogin(operationId: string): Promise<void>;
  disconnect(connectionId: string, operationId?: string): Promise<void>;
  completeDisconnect(connectionId: string, operationId?: string): Promise<void>;
  rollbackDisconnect(connectionId: string, operationId?: string): Promise<void>;
  activeHome(connectionId: string): string;
  grantForAttempt(input: GrantInput): Promise<AttemptGrant>;
  releaseGrant(attemptId: string): Promise<void>;
}
