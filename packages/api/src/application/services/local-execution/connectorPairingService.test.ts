import { describe, expect, it } from "vitest";
import type { LocalConnectorDao, MachineRecord, PairingRecord } from "../../database/dao/localConnectorDao";
import { ConnectorPairingService } from "./connectorPairingService";
import { createSecret, hashSecret } from "./localSecrets";

const now = () => new Date("2026-10-07T12:00:00.000Z");
const key = Buffer.alloc(32, 7).toString("base64");

describe("ConnectorPairingService", () => {
  it("UT-106 binds a confirmed short-lived pairing to the signed-in user", async () => {
    const dao = new MemoryPairingDao();
    const service = new ConnectorPairingService(dao, key, now);
    const created = await service.createPairing({ protocolVersion: 1, label: "Developer laptop", pollingSecret: createSecret() });
    const confirmed = await service.confirm({ code: created.code, ownerUserId: "user-1", requestKey: "request-1" });
    expect(confirmed.ownerUserId).toBe("user-1");
    expect(confirmed.expiresAt.toISOString()).toBe("2026-10-07T12:10:00.000Z");
    expect(confirmed.publicCodeHash).not.toBe(created.code);
  });

  it("UT-107 rejects a polling secret whose stored hash differs", async () => {
    const dao = new MemoryPairingDao();
    const service = new ConnectorPairingService(dao, key, now);
    const created = await service.createPairing({ protocolVersion: 1, label: "Laptop", pollingSecret: createSecret() });
    const confirmed = await service.confirm({ code: created.code, ownerUserId: "user-1", requestKey: "request-1" });
    await expect(service.exchange({ pairingId: confirmed.id, pollingSecret: createSecret(), requestKey: "request-2" })).rejects.toMatchObject({ reason: "pairing_secret_invalid" });
  });

  it("UT-108 treats expiry equality as expired", async () => {
    const dao = new MemoryPairingDao();
    const service = new ConnectorPairingService(dao, key, () => new Date("2026-10-07T12:10:00.000Z"));
    await expect(service.confirm({ code: "pairing-code", ownerUserId: "user-1", requestKey: "request-1" })).rejects.toMatchObject({ reason: "pairing_expired" });
  });

  it("UT-109 returns the pending same machine token for an identical exchange retry", async () => {
    const dao = new MemoryPairingDao();
    const service = new ConnectorPairingService(dao, key, now);
    const created = await service.createPairing({ protocolVersion: 1, label: "Laptop", pollingSecret: createSecret() });
    const confirmed = await service.confirm({ code: created.code, ownerUserId: "user-1", requestKey: "request-1" });
    const pollingSecret = createSecret();
    const pairing = { ...confirmed, pollingSecretHash: hashSecret(pollingSecret) };
    dao.pairings.set(pairing.id, pairing);
    const first = await service.exchange({ pairingId: pairing.id, pollingSecret, requestKey: "exchange-key" });
    const second = await service.exchange({ pairingId: pairing.id, pollingSecret, requestKey: "exchange-key" });
    expect(second).toEqual(first);
  });

  it("UT-110 refuses exchange of an expired pairing", async () => {
    const dao = new MemoryPairingDao();
    const service = new ConnectorPairingService(dao, key, () => new Date("2026-10-07T12:11:00.000Z"));
    await expect(service.exchange({ pairingId: "pairing-id", pollingSecret: createSecret(), requestKey: "request-1" })).rejects.toMatchObject({ reason: "pairing_expired" });
  });
});

class MemoryPairingDao {
  readonly pairings = new Map<string, PairingRecord>();
  readonly links = new Map<string, import("../../database/dao/localConnectorDao").LocalProjectLinkRecord>();
  async createPairing(input: Omit<PairingRecord, "id" | "ownerUserId" | "machineId" | "confirmedAt" | "consumedAt" | "requestKey" | "pendingCredentialCiphertext">) {
    const pairing = { ...input, id: "00000000-0000-4000-8000-000000000001", ownerUserId: null, machineId: null, confirmedAt: null, consumedAt: null, requestKey: null, pendingCredentialCiphertext: null, exchangeRequestKey: null };
    this.pairings.set(pairing.id, pairing);
    return pairing;
  }
  async pairingByCodeHash(hash: string) { return [...this.pairings.values()].find((pairing) => pairing.publicCodeHash === hash) ?? null; }
  async confirmPairing(input: { pairingId: string; ownerUserId: string; machineId: string; requestKey: string; now: Date }) {
    const pairing = this.pairings.get(input.pairingId);
    if (!pairing) throw Object.assign(new Error("pairing_expired"), { reason: "pairing_expired" });
    const confirmed = { ...pairing, ownerUserId: input.ownerUserId, machineId: input.machineId, requestKey: input.requestKey, confirmedAt: input.now };
    this.pairings.set(pairing.id, confirmed);
    return confirmed;
  }
  async exchangePairing(input: { pairingId: string; pollingSecretHash: string; requestKey: string; machineTokenHash: string; encryptedMachineToken: string; credentialExpiresAt: Date; now: Date }) {
    const pairing = this.pairings.get(input.pairingId);
    if (!pairing || pairing.expiresAt.getTime() <= input.now.getTime()) throw Object.assign(new Error("pairing_expired"), { reason: "pairing_expired" });
    if (pairing.pollingSecretHash !== input.pollingSecretHash) throw Object.assign(new Error("pairing_secret_invalid"), { reason: "pairing_secret_invalid" });
    if (!pairing.ownerUserId || !pairing.machineId) return { state: "pending" as const };
    if (pairing.consumedAt) {
      if (pairing.exchangeRequestKey !== input.requestKey || !pairing.pendingCredentialCiphertext) throw Object.assign(new Error("pairing_consumed"), { reason: "pairing_consumed" });
      return { state: "complete" as const, machineId: pairing.machineId, encryptedMachineToken: pairing.pendingCredentialCiphertext, credentialExpiresAt: input.credentialExpiresAt };
    }
    const complete = { ...pairing, consumedAt: input.now, pendingCredentialCiphertext: input.encryptedMachineToken, exchangeRequestKey: input.requestKey };
    this.pairings.set(pairing.id, complete);
    return { state: "complete" as const, machineId: pairing.machineId, encryptedMachineToken: input.encryptedMachineToken, credentialExpiresAt: input.credentialExpiresAt };
  }
  async machineByCredentialHash() { return null; }
  async machineById() { return null; }
  async listMachines() { return { items: [], nextCursor: null }; }
  async consumeRateLimit() { return { allowed: true, retryAfterSeconds: 60 }; }
  async heartbeat(): Promise<MachineRecord> { throw new Error("machine_unauthorized"); }
  async revokeMachine(): Promise<MachineRecord> { throw new Error("machine_unavailable"); }
  async currentProjectLink(input: { ownerUserId: string; projectId: string }) { return [...this.links.values()].find((link) => link.ownerUserId === input.ownerUserId && link.projectId === input.projectId && !link.revokedAt) ?? null; }
  async publishProjectLink(input: Parameters<LocalConnectorDao["publishProjectLink"]>[0]) {
    const current = await this.currentProjectLink(input);
    if ((current?.revision ?? 0) !== input.expectedRevision) throw new Error("link_changed");
    const link = { ...input.descriptor, id: current?.id ?? "link-1", ownerUserId: input.ownerUserId, projectId: input.projectId, revision: input.expectedRevision + 1, readiness: "unknown", readyAt: null, lastRequestKey: input.requestKey, lastRequestPayloadHash: "hash", revokedAt: null };
    this.links.set(link.id, link);
    return link;
  }
  async revokeProjectLink(input: Parameters<LocalConnectorDao["revokeProjectLink"]>[0]) {
    const current = this.links.get(input.linkId);
    if (!current || current.ownerUserId !== input.ownerUserId || current.projectId !== input.projectId || current.revision !== input.expectedRevision || current.revokedAt) throw new Error("link_changed");
    const revoked = { ...current, revision: input.expectedRevision + 1, lastRequestKey: input.requestKey, lastRequestPayloadHash: "hash", revokedAt: input.now };
    this.links.set(current.id, revoked);
    return revoked;
  }
  async pollCommands() { return []; }
  async recordCommandEvent() { return { acknowledgedSequence: 1, replayed: false }; }
  async enqueueCommand(): Promise<never> { throw new Error("not_used"); }
  async commandForActor() { return null; }
}
