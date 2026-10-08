import { and, eq, gt, isNull } from "drizzle-orm";
import type { LocalConnectorDao, PairingRecord } from "../../../../application/database/dao/localConnectorDao";
import { localMachines, localPairings } from "../../schema";
import type { Database } from "../../client";
import { LocalExecutionError } from "../../../../application/services/local-execution/localExecutionErrors";

type Confirm = Parameters<LocalConnectorDao["confirmPairing"]>[0];
type Exchange = Parameters<LocalConnectorDao["exchangePairing"]>[0];

export async function confirmPairingRecord(database: Database, input: Confirm): Promise<PairingRecord> {
  const result = await database.transaction(async (tx) => {
    const [pairing] = await tx.select().from(localPairings).where(eq(localPairings.id, input.pairingId)).for("update").limit(1);
    if (!pairing || pairing.expiresAt.getTime() <= input.now.getTime()) throw new LocalExecutionError("pairing_expired");
    if (pairing.machineId) {
      if (pairing.ownerUserId === input.ownerUserId && pairing.requestKey === input.requestKey) return pairing;
      throw new LocalExecutionError("pairing_consumed");
    }
    await tx.insert(localMachines).values({ id: input.machineId, ownerUserId: input.ownerUserId, label: pairing.safeLabel, credentialHash: "pending:" + input.machineId, credentialExpiresAt: pairing.expiresAt, protocolVersion: 1 });
    const [confirmed] = await tx.update(localPairings).set({ ownerUserId: input.ownerUserId, machineId: input.machineId, requestKey: input.requestKey, confirmedAt: input.now }).where(and(eq(localPairings.id, pairing.id), isNull(localPairings.machineId), gt(localPairings.expiresAt, input.now))).returning();
    if (!confirmed) throw new LocalExecutionError("pairing_consumed");
    return confirmed!;
  });
  return { ...result, expiresAt: result.expiresAt, confirmedAt: result.confirmedAt, consumedAt: result.consumedAt };
}

export function exchangePairingRecord(database: Database, input: Exchange): Promise<Awaited<ReturnType<LocalConnectorDao["exchangePairing"]>>> {
  return database.transaction(async (tx) => {
    const [pairing] = await tx.select().from(localPairings).where(eq(localPairings.id, input.pairingId)).for("update").limit(1);
    if (!pairing || pairing.expiresAt.getTime() <= input.now.getTime()) throw new LocalExecutionError("pairing_expired");
    if (pairing.pollingSecretHash !== input.pollingSecretHash) throw new LocalExecutionError("pairing_secret_invalid");
    if (!pairing.machineId || !pairing.ownerUserId) return { state: "pending" as const };
    if (pairing.consumedAt) {
      if (pairing.exchangeRequestKey !== input.requestKey || !pairing.pendingCredentialCiphertext) throw new LocalExecutionError("pairing_consumed");
      const [machine] = await tx.select().from(localMachines).where(eq(localMachines.id, pairing.machineId)).limit(1);
      if (!machine) throw new LocalExecutionError("pairing_expired");
      return { state: "complete" as const, machineId: pairing.machineId, encryptedMachineToken: pairing.pendingCredentialCiphertext, credentialExpiresAt: machine.credentialExpiresAt };
    }
    const [machine] = await tx.update(localMachines).set({ credentialHash: input.machineTokenHash, credentialExpiresAt: input.credentialExpiresAt, credentialGeneration: 1 }).where(eq(localMachines.id, pairing.machineId)).returning();
    if (!machine) throw new LocalExecutionError("pairing_expired");
    await tx.update(localPairings).set({ consumedAt: input.now, pendingCredentialCiphertext: input.encryptedMachineToken, exchangeRequestKey: input.requestKey }).where(eq(localPairings.id, pairing.id));
    return { state: "complete" as const, machineId: machine.id, encryptedMachineToken: input.encryptedMachineToken, credentialExpiresAt: input.credentialExpiresAt };
  });
}
