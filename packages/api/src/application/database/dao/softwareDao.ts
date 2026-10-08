export type SettingsValues = { enabled: boolean; docsProxyUrl: string | null; maxActiveActions: number };
export type SettingsRecord = SettingsValues & { revision: number; updatedAt: Date };
export type SettingsUpdate = { values: SettingsValues; actorId: string; expectedRevision: number };

export type ProviderKind = "codex" | "claude";
export type ConnectionModel = { modelId: string; displayName: string; selectable: boolean; unselectableReason: string | null; reasoningChoices: (string | null)[] };
export type ConnectionAuthState = "unconnected" | "pending" | "connected" | "failed" | "expired" | "disconnected" | "setup_required";

export type ConnectionRecord = {
  id: string;
  label: string;
  providerKind: ProviderKind;
  runtimeProviderId: string;
  executionTarget?: "host" | "machine";
  machineId?: string | null;
  ownerUserId?: string | null;
  modelCatalog?: ConnectionModel[] | null;
  authState: ConnectionAuthState;
  accountLabel: string | null;
  accountFingerprint: string | null;
  revision: number;
  lastCheckedAt: Date | null;
  disabledAt: Date | null;
  createdAt: Date;
};

export type NewConnection = { label: string; providerKind: ProviderKind; runtimeProviderId: string; actorId: string; executionTarget?: "host" | "machine"; machineId?: string | null; ownerUserId?: string | null };
export type ConnectionPatch = Partial<Pick<ConnectionRecord, "label" | "authState" | "accountLabel" | "accountFingerprint" | "lastCheckedAt" | "disabledAt" | "modelCatalog">>;
export type ConnectionQuery = { cursor?: string; limit: number; search?: string; executionTarget?: "host" | "machine"; visibleToOwnerId?: string };

export type OperationState = "pending" | "awaiting_confirmation" | "confirmed" | "failed" | "expired";

export type AuthOperationRecord = {
  id: string;
  connectionId: string;
  kind: "codex_login" | "claude_login";
  state: OperationState;
  expiresAt: Date;
  actorId: string;
  idempotencyKey: string;
  accountLabel: string | null;
  accountFingerprint: string | null;
  resultRevision: number | null;
  failureCode: string | null;
};

export type NewOperation = Pick<AuthOperationRecord, "connectionId" | "kind" | "expiresAt" | "actorId" | "idempotencyKey"> & { nonceDigest: string };
export type OperationPatch = Partial<Pick<AuthOperationRecord, "state" | "expiresAt" | "accountLabel" | "accountFingerprint" | "resultRevision" | "failureCode">>;

export type AuditEntry = { actorId: string; event: string; diff: Record<string, unknown>; idempotencyKey?: string; requestHash?: string };
export type AuditRecord = { sequence: number; id: string; actorId: string | null; actorName: string | null; event: string; diff: Record<string, unknown>; requestHash: string | null; createdAt: Date };
export type Paged<T> = { items: T[]; nextCursor: string | null };

export interface SettingsStore {
  read(): Promise<SettingsRecord>;
  lock(): Promise<SettingsRecord>;
  update(input: SettingsUpdate): Promise<SettingsRecord>;
}

export interface ConnectionStore {
  insert(input: NewConnection): Promise<ConnectionRecord>;
  lock(id: string): Promise<ConnectionRecord | null>;
  find(id: string): Promise<ConnectionRecord | null>;
  list(query: ConnectionQuery): Promise<Paged<ConnectionRecord>>;
  update(id: string, patch: ConnectionPatch): Promise<ConnectionRecord>;
}

export interface OperationStore {
  insert(input: NewOperation): Promise<AuthOperationRecord>;
  find(id: string): Promise<AuthOperationRecord | null>;
  findByKey(idempotencyKey: string): Promise<AuthOperationRecord | null>;
  update(id: string, patch: OperationPatch): Promise<AuthOperationRecord>;
  expireDue(connectionId: string, now: Date): Promise<void>;
  listActive(connectionId: string): Promise<AuthOperationRecord[]>;
}

export interface AuditStore {
  append(entry: AuditEntry): Promise<AuditRecord>;
  findByKey(idempotencyKey: string): Promise<AuditRecord | null>;
  list(query: { cursor?: string; limit: number }): Promise<Paged<AuditRecord>>;
}

export interface SoftwareDao {
  settings: SettingsStore;
  connections: ConnectionStore;
  operations: OperationStore;
  audit: AuditStore;
  isAdmin(userId: string): Promise<boolean>;
  transaction<T>(callback: (dao: SoftwareDao) => Promise<T>): Promise<T>;
}
