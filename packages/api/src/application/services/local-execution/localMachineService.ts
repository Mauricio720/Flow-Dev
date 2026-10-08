import { UNSAFE_EGRESS_TEXT } from "./localFailureDetail";
import type { LocalConnectorDao, MachineRecord } from "../../database/dao/localConnectorDao";
import { LocalExecutionError } from "./localExecutionErrors";
import { createSecret, decryptPendingSecret, encryptPendingSecret, hashSecret } from "./localSecrets";
import type { ConnectorPairingService } from "./connectorPairingService";
import { localProviderCatalogSchema, validateLocalEvent, validateLocalCommand } from "./localProtocol";
import { localLoopCatalogSchema } from "./localLoopCatalog";

const MACHINE_OFFLINE_MS = 30_000;
const MACHINE_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export class LocalMachineService {
  constructor(private readonly dao: LocalConnectorDao, private readonly pairings: ConnectorPairingService, private readonly encryptionKey: string, private readonly now: () => Date = () => new Date()) {}

  async confirmPairing(input: { ownerUserId: string; code: string; requestKey: string }) {
    const pairing = await this.pairings.confirm(input);
    return { pairingId: pairing.id, machine: { id: pairing.machineId, label: pairing.safeLabel, confirmedAt: pairing.confirmedAt?.toISOString() ?? null, expiresAt: pairing.expiresAt.toISOString() } };
  }

  previewPairing(code: string) {
    return this.pairings.preview(code);
  }

  async list(ownerUserId: string, input: { cursor?: string; limit?: number } = {}) {
    const page = await this.dao.listMachines({ ownerUserId, cursor: input.cursor, limit: input.limit ?? 20 });
    const now = this.now().getTime();
    return { items: page.items.map((machine) => machineDto(machine, now)), nextCursor: page.nextCursor };
  }

  consumeRateLimit(key: string, maximum: number, now = this.now()) {
    return this.dao.consumeRateLimit({ key, maximum, windowMs: 60_000, now: now.getTime() });
  }

  async revoke(input: { ownerUserId: string; machineId: string; expectedRevision: number; requestKey: string }) {
    const machine = await this.dao.revokeMachine({ ...input, now: this.now() });
    return { machineId: machine.id, revision: machine.revision, revokedAt: machine.revokedAt?.toISOString() ?? null };
  }

  async unpair(input: { token: string; protocolVersion: number; requestKey: string }) {
    if (input.protocolVersion !== 1) throw new LocalExecutionError("protocol_incompatible");
    const machine = await this.dao.machineByCredentialHash(hashSecret(input.token), this.now());
    if (!machine) throw new LocalExecutionError("machine_unauthorized");
    const revoked = await this.dao.revokeMachine({ ownerUserId: machine.ownerUserId, machineId: machine.id, expectedRevision: machine.revision, requestKey: input.requestKey, now: this.now() });
    return { machineId: revoked.id, revokedAt: revoked.revokedAt?.toISOString() ?? null };
  }

  createPairing(input: { protocolVersion: number; label: string; pollingSecret: string }) {
    return this.pairings.createPairing(input);
  }

  exchange(input: { pairingId: string; pollingSecret: string; requestKey: string }) {
    return this.pairings.exchange(input).then((result) => ({ state: "complete" as const, ...result })).catch((error: unknown) => {
      if (error instanceof LocalExecutionError && error.reason === "pairing_pending") return { state: "pending" as const };
      throw error;
    });
  }

  async heartbeat(input: { token: string; protocolVersion: number; capabilities: string[]; catalogRevision: number; providerCatalog?: unknown; loopCatalog?: unknown; requestKey: string; acknowledgedCredentialGeneration?: number }) {
    if (input.protocolVersion !== 1) throw new LocalExecutionError("protocol_incompatible");
    const parsedCatalog = localProviderCatalogSchema.safeParse(input.providerCatalog ?? []);
    const parsedLoops = localLoopCatalogSchema.safeParse(input.loopCatalog ?? []);
    if (!parsedCatalog.success || !parsedLoops.success) throw new LocalExecutionError("invalid_input");
    const machine = await this.dao.machineByCredentialHash(hashSecret(input.token), this.now());
    if (!machine) throw new LocalExecutionError("machine_unauthorized");
    const now = this.now();
    const shouldRenew = Boolean(machine.pendingCredentialHash) || machine.credentialExpiresAt.getTime() - now.getTime() <= 7 * 24 * 60 * 60_000;
    const nextToken = shouldRenew && !machine.pendingCredentialHash ? createSecret() : null;
    const updated = await this.dao.heartbeat({
      machineId: machine.id, credentialHash: hashSecret(input.token), acknowledgedGeneration: input.acknowledgedCredentialGeneration,
      capabilities: input.capabilities, catalogRevision: input.catalogRevision, providerCatalog: parsedCatalog.data, loopCatalog: parsedLoops.data, requestKey: input.requestKey, now, rotationRequested: shouldRenew,
      ...(nextToken ? { rotation: { requestKey: input.requestKey, credentialHash: hashSecret(nextToken), encryptedCredential: encryptPendingSecret(nextToken, this.encryptionKey), expiresAt: new Date(now.getTime() + MACHINE_TOKEN_LIFETIME_MS) } } : {}),
    });
    const pendingToken = updated.pendingCredentialCiphertext ? decryptPendingSecret(updated.pendingCredentialCiphertext, this.encryptionKey) : null;
    return {
      machineId: updated.id, revision: updated.revision, catalogRevision: updated.catalogRevision, readiness: "ready" as const,
      leaseExpiresAt: new Date(now.getTime() + MACHINE_OFFLINE_MS).toISOString(), credentialGeneration: updated.credentialGeneration, credentialExpiresAt: updated.credentialExpiresAt.toISOString(),
      ...(pendingToken && updated.pendingCredentialGeneration && updated.pendingCredentialExpiresAt ? { credentialRotation: { token: pendingToken, generation: updated.pendingCredentialGeneration, expiresAt: updated.pendingCredentialExpiresAt.toISOString() } } : {}),
    };
  }

  async poll(input: { token: string; protocolVersion: number; limit: number }) {
    if (input.protocolVersion !== 1) throw new LocalExecutionError("protocol_incompatible");
    const machine = await this.dao.machineByCredentialHash(hashSecret(input.token), this.now());
    if (!machine) throw new LocalExecutionError("machine_unauthorized");
    const rows = await this.dao.pollCommands({ machineId: machine.id, now: this.now(), limit: input.limit });
    return { protocolVersion: 1 as const, commands: rows.map((row) => validateLocalCommand({ protocolVersion: row.protocolVersion, commandId: row.id, machineId: row.machineId, projectId: row.projectId, runId: row.runId ?? row.preparationId, actorId: row.actorId, fence: row.fence, leaseExpiresAt: row.leaseExpiresAt.toISOString(), target: row.target, payloadHash: row.payloadHash, kind: row.kind, payload: row.payload })) };
  }

  async events(input: { token: string; protocolVersion: number; events: unknown[] }) {
    if (input.protocolVersion !== 1) throw new LocalExecutionError("protocol_incompatible");
    const machine = await this.dao.machineByCredentialHash(hashSecret(input.token), this.now());
    if (!machine) throw new LocalExecutionError("machine_unauthorized");
    const acknowledgements = [];
    for (const value of input.events) {
      const event = validateLocalEvent(value);
      assertSafeLocalEgress(event);
      acknowledgements.push(await this.dao.recordCommandEvent({ machineId: machine.id, event, now: this.now() }));
    }
    return { protocolVersion: 1 as const, acknowledgements };
  }
}

function assertSafeLocalEgress(event: import("./localProtocol").LocalEvent) {
  if (event.kind === "terminal" && event.payload.detail && UNSAFE_EGRESS_TEXT.test(event.payload.detail)) throw new LocalExecutionError("evidence_rejected");
  if (event.kind === "question" && [event.payload.title, ...event.payload.choices].some((text) => UNSAFE_EGRESS_TEXT.test(text))) throw new LocalExecutionError("evidence_rejected");
  if (event.kind !== "activity") return;
  if (UNSAFE_EGRESS_TEXT.test(event.payload.summary)) throw new LocalExecutionError("evidence_rejected");
  for (const file of event.payload.relativeFiles) {
    if (file.startsWith("/") || file.startsWith("\\") || /^[A-Za-z]:/.test(file) || file.split(/[\\/]/).some((part) => part === "..") || /[\u0000-\u001f\u007f]/.test(file)) throw new LocalExecutionError("evidence_rejected");
    if (/(?:^|[\\/])(?:\.env(?:\.|$)|credentials?(?:\.|$)|secrets?(?:\.|$)|id_rsa(?:\.|$)|.*\.(?:pem|p12|pfx|key))$/i.test(file)) throw new LocalExecutionError("evidence_rejected");
  }
}

function machineDto(machine: MachineRecord, now: number) {
  const lastSeenAt = machine.lastHeartbeatAt?.toISOString() ?? null;
  const isOnline = machine.revokedAt === null && machine.credentialExpiresAt.getTime() > now && machine.lastHeartbeatAt !== null && now - machine.lastHeartbeatAt.getTime() < MACHINE_OFFLINE_MS;
  return {
    id: machine.id,
    label: machine.label,
    protocolVersion: machine.protocolVersion,
    capabilities: machine.capabilities,
    catalogRevision: machine.catalogRevision,
    lastSeenAt,
    credentialExpiresAt: machine.credentialExpiresAt.toISOString(),
    revokedAt: machine.revokedAt?.toISOString() ?? null,
    revision: machine.revision,
    readiness: machine.revokedAt ? "revoked" as const : isOnline ? "ready" as const : "offline" as const,
  };
}
