import { randomUUID } from "node:crypto";
import type { LocalConnectorDao } from "../../database/dao/localConnectorDao";
import { LocalExecutionError } from "./localExecutionErrors";
import { createPairingCode, createSecret, decryptPendingSecret, encryptPendingSecret, hashSecret } from "./localSecrets";

const PAIRING_LIFETIME_MS = 10 * 60 * 1000;
const MACHINE_TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export class ConnectorPairingService {
  constructor(private readonly dao: LocalConnectorDao, private readonly encryptionKey: string, private readonly now: () => Date = () => new Date()) {}

  async createPairing(input: { protocolVersion: number; label: string; pollingSecret: string }) {
    if (input.protocolVersion !== 1) throw new LocalExecutionError("protocol_incompatible");
    const label = safeMachineLabel(input.label);
    if (input.pollingSecret.length < 40) throw new LocalExecutionError("invalid_input");
    const code = createPairingCode();
    const expiresAt = new Date(this.now().getTime() + PAIRING_LIFETIME_MS);
    const pairing = await this.dao.createPairing({ publicCodeHash: hashSecret(code), pollingSecretHash: hashSecret(input.pollingSecret), safeLabel: label, expiresAt });
    return { pairingId: pairing.id, code, expiresAt: expiresAt.toISOString() };
  }

  async confirm(input: { code: string; ownerUserId: string; requestKey: string }) {
    const pairing = await this.dao.pairingByCodeHash(hashSecret(input.code));
    if (!pairing) throw new LocalExecutionError("pairing_expired");
    if (pairing.expiresAt.getTime() <= this.now().getTime()) throw new LocalExecutionError("pairing_expired");
    if (pairing.machineId) {
      if (pairing.ownerUserId === input.ownerUserId && pairing.requestKey === input.requestKey) return pairing;
      throw new LocalExecutionError("pairing_consumed");
    }
    return this.dao.confirmPairing({ pairingId: pairing.id, ownerUserId: input.ownerUserId, machineId: randomUUID(), requestKey: input.requestKey, now: this.now() });
  }

  async preview(code: string) {
    const pairing = await this.dao.pairingByCodeHash(hashSecret(code));
    if (!pairing || pairing.expiresAt.getTime() <= this.now().getTime()) throw new LocalExecutionError("pairing_expired");
    if (pairing.machineId) throw new LocalExecutionError("pairing_consumed");
    return { label: pairing.safeLabel, expiresAt: pairing.expiresAt.toISOString() };
  }

  async exchange(input: { pairingId: string; pollingSecret: string; requestKey: string }) {
    const token = createSecret();
    const expiry = new Date(this.now().getTime() + MACHINE_TOKEN_LIFETIME_MS);
    const result = await this.dao.exchangePairing({ pairingId: input.pairingId, pollingSecretHash: hashSecret(input.pollingSecret), requestKey: input.requestKey, machineTokenHash: hashSecret(token), encryptedMachineToken: encryptPendingSecret(token, this.encryptionKey), credentialExpiresAt: expiry, now: this.now() });
    if (result.state === "pending") throw new LocalExecutionError("pairing_pending");
    return { machineId: result.machineId, token: decryptPendingSecret(result.encryptedMachineToken, this.encryptionKey), expiresAt: result.credentialExpiresAt.toISOString() };
  }
}

function safeMachineLabel(value: string) {
  const label = value.trim().replace(/[\u0000-\u001f\u007f/\\]/g, " ").slice(0, 80);
  if (!label) throw new LocalExecutionError("invalid_input");
  return label;
}
