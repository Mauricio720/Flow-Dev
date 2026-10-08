import type { ConnectionModel, ProviderKind } from "./softwareDao";
import type { LoopDefinition } from "../../software/compozyControlGateway";

export type PairingRecord = {
  id: string; ownerUserId: string | null; machineId: string | null; publicCodeHash: string;
  pollingSecretHash: string; safeLabel: string; expiresAt: Date; confirmedAt: Date | null;
  consumedAt: Date | null; requestKey: string | null; pendingCredentialCiphertext: string | null; exchangeRequestKey: string | null;
};
export type MachineRecord = { id: string; ownerUserId: string; label: string; credentialHash: string; credentialGeneration: number; credentialExpiresAt: Date; pendingCredentialHash: string | null; pendingCredentialCiphertext: string | null; pendingCredentialGeneration: number | null; pendingCredentialExpiresAt: Date | null; pendingCredentialRequestKey: string | null; previousCredentialHash: string | null; previousCredentialExpiresAt: Date | null; protocolVersion: number; capabilities: string[]; catalogRevision: number; providerCatalog?: LocalProviderCatalogEntry[]; loopCatalog?: LoopDefinition[]; lastHeartbeatAt: Date | null; lastHeartbeatRequestKey: string | null; lastHeartbeatPayloadHash: string | null; revokedAt: Date | null; revocationRequestKey: string | null; revocationPayloadHash: string | null; revision: number };
export type LocalProviderCatalogEntry = { providerId: string; providerKind: ProviderKind; label: string; models: ConnectionModel[] };
export type LocalProjectLinkRecord = { id: string; ownerUserId: string; projectId: string; machineId: string; checkoutHandle: string; checkoutKey: string; repositoryId: string; repositoryNodeId: string; safeLabel: string; revision: number; readiness: string; readyAt: Date | null; lastRequestKey: string | null; lastRequestPayloadHash: string | null; revokedAt: Date | null };
export type NewPairing = Pick<PairingRecord, "publicCodeHash" | "pollingSecretHash" | "safeLabel" | "expiresAt">;
export type LocalProjectLinkDescriptor = Pick<LocalProjectLinkRecord, "machineId" | "checkoutHandle" | "checkoutKey" | "repositoryId" | "repositoryNodeId" | "safeLabel">;
export type LocalPage<T> = { items: T[]; nextCursor: string | null };
export type LocalCommandRecord = {
  id: string; machineId: string; linkId: string; projectId: string; actorId: string; runId: string | null; preparationId: string | null;
  protocolVersion: number; target: import("../../services/local-execution/localProtocol").LocalCommand["target"];
  requestKey: string; kind: string; payload: Record<string, unknown>; payloadHash: string; fence: number; sequence: number;
  state: string; leaseExpiresAt: Date; createdAt: Date;
};
export type NewLocalCommand = Pick<LocalCommandRecord, "machineId" | "linkId" | "projectId" | "actorId" | "runId" | "preparationId" | "protocolVersion" | "target" | "requestKey" | "kind" | "payload" | "payloadHash" | "fence" | "leaseExpiresAt"> & { id?: string };

export interface LocalConnectorDao {
  createPairing(input: NewPairing): Promise<PairingRecord>;
  pairingByCodeHash(hash: string): Promise<PairingRecord | null>;
  confirmPairing(input: { pairingId: string; ownerUserId: string; machineId: string; requestKey: string; now: Date }): Promise<PairingRecord>;
  exchangePairing(input: { pairingId: string; pollingSecretHash: string; requestKey: string; machineTokenHash: string; encryptedMachineToken: string; credentialExpiresAt: Date; now: Date }): Promise<{ state: "pending" } | { state: "complete"; machineId: string; encryptedMachineToken: string; credentialExpiresAt: Date }>;
  machineByCredentialHash(hash: string, now?: Date): Promise<MachineRecord | null>;
  machineById(input: { ownerUserId: string; machineId: string }): Promise<MachineRecord | null>;
  listMachines(input: { ownerUserId: string; cursor?: string; limit: number }): Promise<LocalPage<MachineRecord>>;
  consumeRateLimit(input: { key: string; maximum: number; windowMs: number; now: number }): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
  heartbeat(input: { machineId: string; credentialHash: string; acknowledgedGeneration?: number; capabilities: string[]; catalogRevision: number; providerCatalog: LocalProviderCatalogEntry[]; loopCatalog?: LoopDefinition[]; requestKey: string; now: Date; rotationRequested?: boolean; rotation?: { requestKey: string; credentialHash: string; encryptedCredential: string; expiresAt: Date } }): Promise<MachineRecord>;
  revokeMachine(input: { ownerUserId: string; machineId: string; expectedRevision: number; requestKey: string; now: Date }): Promise<MachineRecord>;
  currentProjectLink(input: { ownerUserId: string; projectId: string }): Promise<LocalProjectLinkRecord | null>;
  publishProjectLink(input: { ownerUserId: string; projectId: string; expectedRevision: number; requestKey: string; descriptor: LocalProjectLinkDescriptor; now: Date }): Promise<LocalProjectLinkRecord>;
  revokeProjectLink(input: { ownerUserId: string; projectId: string; linkId: string; expectedRevision: number; requestKey: string; now: Date }): Promise<LocalProjectLinkRecord>;
  pollCommands(input: { machineId: string; now: Date; limit: number }): Promise<LocalCommandRecord[]>;
  recordCommandEvent(input: { machineId: string; event: import("../../services/local-execution/localProtocol").LocalEvent; now: Date }): Promise<{ acknowledgedSequence: number; replayed: boolean }>;
  enqueueCommand(input: NewLocalCommand & { expectedLinkRevision: number; now: Date }): Promise<LocalCommandRecord>;
  commandForActor(input: { actorId: string; projectId: string; commandId: string }): Promise<{ command: LocalCommandRecord; events: Array<{ sequence: number; kind: string; payload: Record<string, unknown>; payloadHash: string }> } | null>;
}
