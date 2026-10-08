import { and, asc, desc, eq, gt, isNull, or, sql, sum } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "../../../../application/pagination/cursor";
import { LocalExecutionError } from "../../../../application/services/local-execution/localExecutionErrors";
import { localPayloadHash } from "../../../../application/services/local-execution/localHash";
import { sanitizeEvidence } from "../../../../application/services/local-execution/evidenceSanitizer";
import type { LocalConnectorDao, MachineRecord, NewLocalCommand, NewPairing, PairingRecord } from "../../../../application/database/dao/localConnectorDao";
import { localCheckoutLocks, localCommandEvents, localCommands, localMachines, localPairings, localProjectLinks, projects, rateLimit, softwareConnections, taskExecutionRuns, taskRunEvidence, taskRunGates } from "../../schema";
import type { Database } from "../../client";
import { confirmPairingRecord, exchangePairingRecord } from "./pairingWrites";

export class DrizzleLocalConnectorDao implements LocalConnectorDao {
  constructor(private readonly database: Database) {}

  async createPairing(input: NewPairing) {
    const [row] = await this.database.insert(localPairings).values(input).returning();
    return toPairing(row!);
  }

  async pairingByCodeHash(hash: string) {
    const [row] = await this.database.select().from(localPairings).where(eq(localPairings.publicCodeHash, hash)).limit(1);
    return row ? toPairing(row) : null;
  }

  confirmPairing(input: Parameters<LocalConnectorDao["confirmPairing"]>[0]) {
    return confirmPairingRecord(this.database, input);
  }

  exchangePairing(input: Parameters<LocalConnectorDao["exchangePairing"]>[0]) {
    return exchangePairingRecord(this.database, input);
  }

  async machineByCredentialHash(hash: string, now = new Date()) {
    const [row] = await this.database.select().from(localMachines).where(and(
      isNull(localMachines.revokedAt),
      or(
        and(eq(localMachines.credentialHash, hash), gt(localMachines.credentialExpiresAt, now)),
        and(eq(localMachines.pendingCredentialHash, hash), gt(localMachines.pendingCredentialExpiresAt, now)),
        and(eq(localMachines.previousCredentialHash, hash), gt(localMachines.previousCredentialExpiresAt, now)),
      ),
    )).limit(1);
    return row ? toMachine(row) : null;
  }

  async machineById(input: Parameters<LocalConnectorDao["machineById"]>[0]) {
    const [row] = await this.database.select().from(localMachines).where(and(eq(localMachines.id, input.machineId), eq(localMachines.ownerUserId, input.ownerUserId))).limit(1);
    return row ? toMachine(row) : null;
  }

  async listMachines(input: Parameters<LocalConnectorDao["listMachines"]>[0]) {
    const cursor = decodeCursor(input.cursor);
    if (input.cursor && (!cursor || !cursor.id || !UUID_PATTERN.test(cursor.id) || Number.isNaN(Date.parse(cursor.key)))) throw new LocalExecutionError("invalid_cursor");
    const after = cursor ? or(gt(localMachines.createdAt, new Date(cursor.key)), and(eq(localMachines.createdAt, new Date(cursor.key)), gt(localMachines.id, cursor.id ?? ""))) : undefined;
    const rows = await this.database.select().from(localMachines).where(and(eq(localMachines.ownerUserId, input.ownerUserId), after)).orderBy(asc(localMachines.createdAt), asc(localMachines.id)).limit(input.limit + 1);
    const items = rows.slice(0, input.limit).map(toMachine);
    const last = rows.length > input.limit ? items.at(-1) : undefined;
    const lastRow = rows.length > input.limit ? rows[input.limit - 1] : undefined;
    return { items, nextCursor: last && lastRow ? encodeCursor({ key: lastRow.createdAt.toISOString(), id: last.id }) : null };
  }

  async consumeRateLimit(input: Parameters<LocalConnectorDao["consumeRateLimit"]>[0]) {
    const reset = sql`${rateLimit.lastRequest} <= ${input.now - input.windowMs}`;
    const [row] = await this.database.insert(rateLimit).values({ key: input.key, count: 1, lastRequest: input.now }).onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`CASE WHEN ${reset} THEN 1 ELSE ${rateLimit.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${reset} THEN ${input.now} ELSE ${rateLimit.lastRequest} END`,
      },
    }).returning({ count: rateLimit.count, lastRequest: rateLimit.lastRequest });
    const retryAfterSeconds = Math.max(1, Math.ceil((row!.lastRequest + input.windowMs - input.now) / 1000));
    return { allowed: row!.count <= input.maximum, retryAfterSeconds };
  }

  async heartbeat(input: Parameters<LocalConnectorDao["heartbeat"]>[0]) {
    return this.database.transaction(async (tx) => {
      const providerCatalog = input.providerCatalog ?? [];
      const loopCatalog = input.loopCatalog ?? [];
      const [current] = await tx.select().from(localMachines).where(and(eq(localMachines.id, input.machineId), isNull(localMachines.revokedAt))).for("update").limit(1);
      const credentialValid = current && (
        (current.credentialHash === input.credentialHash && current.credentialExpiresAt > input.now) ||
        (current.pendingCredentialHash === input.credentialHash && current.pendingCredentialExpiresAt !== null && current.pendingCredentialExpiresAt > input.now) ||
        (current.previousCredentialHash === input.credentialHash && current.previousCredentialExpiresAt !== null && current.previousCredentialExpiresAt > input.now)
      );
      if (!current || !credentialValid) throw new LocalExecutionError("machine_unauthorized");
      const payloadHash = localPayloadHash({ capabilities: input.capabilities, catalogRevision: input.catalogRevision, providerCatalog, ...(loopCatalog.length ? { loopCatalog } : {}), acknowledgedGeneration: input.acknowledgedGeneration ?? null, rotationRequested: input.rotationRequested ?? Boolean(input.rotation) });
      if (current.lastHeartbeatRequestKey === input.requestKey) {
        if (current.lastHeartbeatPayloadHash !== payloadHash) throw new LocalExecutionError("request_key_reused");
        return toMachine(current);
      }
      if (current.catalogRevision > 0 && input.catalogRevision !== current.catalogRevision) throw new LocalExecutionError("catalog_changed");
      const acknowledge = current.pendingCredentialHash === input.credentialHash && current.pendingCredentialGeneration !== null && input.acknowledgedGeneration === current.pendingCredentialGeneration;
      const promoted = acknowledge ? {
        credentialHash: current.pendingCredentialHash!, credentialGeneration: current.pendingCredentialGeneration!, credentialExpiresAt: current.pendingCredentialExpiresAt!,
        previousCredentialHash: current.credentialHash, previousCredentialExpiresAt: new Date(input.now.getTime() + 5 * 60_000),
        pendingCredentialHash: null, pendingCredentialCiphertext: null, pendingCredentialGeneration: null, pendingCredentialExpiresAt: null, pendingCredentialRequestKey: null,
      } : {};
      const rotation = input.rotation && !current.pendingCredentialHash && !acknowledge ? {
        pendingCredentialHash: input.rotation.credentialHash, pendingCredentialCiphertext: input.rotation.encryptedCredential,
        pendingCredentialGeneration: current.credentialGeneration + 1, pendingCredentialExpiresAt: input.rotation.expiresAt,
        pendingCredentialRequestKey: input.rotation.requestKey,
      } : {};
      const [row] = await tx.update(localMachines).set({ ...promoted, ...rotation, capabilities: input.capabilities, catalogRevision: input.catalogRevision, providerCatalog, loopCatalog, lastHeartbeatAt: input.now, lastHeartbeatRequestKey: input.requestKey, lastHeartbeatPayloadHash: payloadHash, revision: sql`${localMachines.revision} + 1` }).where(and(eq(localMachines.id, input.machineId), isNull(localMachines.revokedAt))).returning();
      if (!row) throw new LocalExecutionError("machine_unauthorized");
      await syncMachineProviderCatalog(tx as unknown as Database, row, providerCatalog, input.now);
      return toMachine(row);
    });
  }

  async revokeMachine(input: Parameters<LocalConnectorDao["revokeMachine"]>[0]) {
    return this.database.transaction(async (tx) => {
      const [current] = await tx.select().from(localMachines).where(and(eq(localMachines.id, input.machineId), eq(localMachines.ownerUserId, input.ownerUserId))).for("update").limit(1);
      if (!current) throw new LocalExecutionError("machine_unavailable");
      const requestPayloadHash = localPayloadHash({ kind: "machine_revoke", machineId: input.machineId, expectedRevision: input.expectedRevision });
      if (current.revokedAt) {
        if (current.revocationRequestKey === input.requestKey) {
          if (current.revocationPayloadHash !== requestPayloadHash) throw new LocalExecutionError("request_key_reused");
          return toMachine(current);
        }
        throw new LocalExecutionError("machine_unavailable");
      }
      if (current.revision !== input.expectedRevision) throw new LocalExecutionError("version_changed");
      const [row] = await tx.update(localMachines).set({ revokedAt: input.now, revocationRequestKey: input.requestKey, revocationPayloadHash: requestPayloadHash, revision: input.expectedRevision + 1 }).where(and(eq(localMachines.id, input.machineId), eq(localMachines.ownerUserId, input.ownerUserId), eq(localMachines.revision, input.expectedRevision), isNull(localMachines.revokedAt))).returning();
      if (!row) throw new LocalExecutionError("version_changed");
      await tx.update(softwareConnections).set({ authState: "disconnected", modelCatalog: [], disabledAt: input.now, lastCheckedAt: input.now, revision: sql`${softwareConnections.revision} + 1`, updatedAt: input.now }).where(and(eq(softwareConnections.machineId, input.machineId), eq(softwareConnections.ownerUserId, input.ownerUserId), eq(softwareConnections.executionTarget, "machine")));
      return toMachine(row);
    });
  }

  async currentProjectLink(input: Parameters<LocalConnectorDao["currentProjectLink"]>[0]) {
    const [row] = await this.database.select().from(localProjectLinks).where(and(eq(localProjectLinks.ownerUserId, input.ownerUserId), eq(localProjectLinks.projectId, input.projectId), isNull(localProjectLinks.revokedAt))).limit(1);
    return row ? toProjectLink(row) : null;
  }

  async publishProjectLink(input: Parameters<LocalConnectorDao["publishProjectLink"]>[0]) {
    return this.database.transaction(async (tx) => {
      const [project] = await tx.select({ id: projects.id }).from(projects).where(eq(projects.id, input.projectId)).for("update").limit(1);
      if (!project) throw new LocalExecutionError("project_unavailable");
      const [machine] = await tx.select().from(localMachines).where(and(eq(localMachines.id, input.descriptor.machineId), eq(localMachines.ownerUserId, input.ownerUserId), isNull(localMachines.revokedAt), gt(localMachines.credentialExpiresAt, input.now))).limit(1);
      if (!machine) throw new LocalExecutionError("machine_unavailable");
      const [current] = await tx.select().from(localProjectLinks).where(and(eq(localProjectLinks.ownerUserId, input.ownerUserId), eq(localProjectLinks.projectId, input.projectId), isNull(localProjectLinks.revokedAt))).for("update").limit(1);
      const [latest] = await tx.select().from(localProjectLinks).where(and(eq(localProjectLinks.ownerUserId, input.ownerUserId), eq(localProjectLinks.projectId, input.projectId))).orderBy(desc(localProjectLinks.revision)).for("update").limit(1);
      const requestPayloadHash = localPayloadHash({ kind: "project_link", projectId: input.projectId, expectedRevision: input.expectedRevision, descriptor: input.descriptor });
      const previousRequest = [current, latest].find((link) => link?.lastRequestKey === input.requestKey);
      if (previousRequest) {
        if (previousRequest.lastRequestPayloadHash !== requestPayloadHash) throw new LocalExecutionError("request_key_reused");
        return toProjectLink(previousRequest);
      }
      const currentRevision = latest?.revision ?? 0;
      if (currentRevision !== input.expectedRevision) throw new LocalExecutionError("link_changed");
      const values = { ...input.descriptor, ownerUserId: input.ownerUserId, projectId: input.projectId, revision: currentRevision + 1, readiness: "ready", readyAt: input.now, lastRequestKey: input.requestKey, lastRequestPayloadHash: requestPayloadHash, revokedAt: null };
      const [row] = current
        ? await tx.update(localProjectLinks).set(values).where(and(eq(localProjectLinks.id, current.id), eq(localProjectLinks.revision, currentRevision), isNull(localProjectLinks.revokedAt))).returning()
        : await tx.insert(localProjectLinks).values(values).returning();
      if (!row) throw new LocalExecutionError("link_changed");
      return toProjectLink(row);
    });
  }

  async revokeProjectLink(input: Parameters<LocalConnectorDao["revokeProjectLink"]>[0]) {
    return this.database.transaction(async (tx) => {
      const [current] = await tx.select().from(localProjectLinks).where(and(eq(localProjectLinks.id, input.linkId), eq(localProjectLinks.ownerUserId, input.ownerUserId), eq(localProjectLinks.projectId, input.projectId))).for("update").limit(1);
      if (!current) throw new LocalExecutionError("link_unavailable");
      const requestPayloadHash = localPayloadHash({ kind: "project_unlink", projectId: input.projectId, linkId: input.linkId, expectedRevision: input.expectedRevision });
      if (current.revokedAt) {
        if (current.lastRequestKey === input.requestKey) {
          if (current.lastRequestPayloadHash !== requestPayloadHash) throw new LocalExecutionError("request_key_reused");
          return toProjectLink(current);
        }
        throw new LocalExecutionError("link_unavailable");
      }
      if (current.revision !== input.expectedRevision) throw new LocalExecutionError("link_changed");
      const [row] = await tx.update(localProjectLinks).set({ revokedAt: input.now, revision: input.expectedRevision + 1, lastRequestKey: input.requestKey, lastRequestPayloadHash: requestPayloadHash }).where(and(eq(localProjectLinks.id, input.linkId), eq(localProjectLinks.ownerUserId, input.ownerUserId), eq(localProjectLinks.projectId, input.projectId), eq(localProjectLinks.revision, input.expectedRevision), isNull(localProjectLinks.revokedAt))).returning();
      if (!row) throw new LocalExecutionError("link_changed");
      return toProjectLink(row);
    });
  }

  async pollCommands(input: Parameters<LocalConnectorDao["pollCommands"]>[0]) {
    return this.database.transaction(async (tx) => {
      const rows = await tx.select().from(localCommands)
        .where(and(
          eq(localCommands.machineId, input.machineId),
          gt(localCommands.leaseExpiresAt, input.now),
          or(eq(localCommands.state, "queued"), and(eq(localCommands.state, "leased"), eq(localCommands.sequence, 0))),
        ))
        .orderBy(asc(localCommands.createdAt), asc(localCommands.id)).limit(input.limit).for("update", { skipLocked: true });
      if (!rows.length) return [];
      const output = [];
      for (const row of rows) {
        if (row.state === "leased") { output.push(row); continue; }
        const linkQuery = row.kind === "cancel"
          ? and(eq(localProjectLinks.id, row.linkId), eq(localProjectLinks.machineId, input.machineId))
          : and(eq(localProjectLinks.id, row.linkId), eq(localProjectLinks.machineId, input.machineId), eq(localProjectLinks.revision, row.target.linkRevision), eq(localProjectLinks.readiness, "ready"), isNull(localProjectLinks.revokedAt));
        const [link] = await tx.select().from(localProjectLinks).where(linkQuery).limit(1);
        if (!link) {
          await tx.update(localCommands).set({ state: "expired" }).where(and(eq(localCommands.id, row.id), eq(localCommands.state, "queued")));
          continue;
        }
        const [leased] = await tx.update(localCommands).set({ state: "leased" }).where(and(eq(localCommands.id, row.id), eq(localCommands.state, "queued"))).returning();
        if (leased) output.push(leased);
      }
      return output;
    });
  }

  async recordCommandEvent(input: Parameters<LocalConnectorDao["recordCommandEvent"]>[0]) {
    return this.database.transaction(async (tx) => {
      const [command] = await tx.select().from(localCommands).where(eq(localCommands.id, input.event.commandId)).for("update").limit(1);
      if (!command || command.machineId !== input.machineId || (command.runId ?? command.preparationId) !== input.event.runId) throw new LocalExecutionError("command_unavailable");
      if (command.fence !== input.event.fence) throw new LocalExecutionError("stale_fence");
      const [previous] = await tx.select().from(localCommandEvents).where(and(eq(localCommandEvents.commandId, command.id), eq(localCommandEvents.sequence, input.event.sequence))).limit(1);
      if (previous) {
        if (previous.payloadHash !== input.event.payloadHash || previous.kind !== input.event.kind) throw new LocalExecutionError("event_conflict");
        return { acknowledgedSequence: input.event.sequence, replayed: true };
      }
      const [link] = await tx.select().from(localProjectLinks).where(and(eq(localProjectLinks.id, command.linkId), eq(localProjectLinks.machineId, command.machineId))).limit(1);
      const linkCurrent = link && link.revision === command.target.linkRevision && link.readiness === "ready" && link.revokedAt === null;
      const acceptedRunReport = command.kind !== "prepare" && command.state === "accepted" && ["activity", "gate", "artifact", "question", "terminal"].includes(input.event.kind);
      const cancelCommand = command.kind === "cancel" && input.event.kind === "terminal";
      if (!link || (!linkCurrent && !acceptedRunReport && !cancelCommand)) throw new LocalExecutionError("link_changed");
      if (input.event.sequence !== command.sequence + 1) throw new LocalExecutionError(input.event.sequence <= command.sequence ? "event_conflict" : "event_gap");
      await tx.insert(localCommandEvents).values({ commandId: command.id, sequence: input.event.sequence, kind: input.event.kind, payloadHash: input.event.payloadHash, payload: input.event.payload });
      const nextState = input.event.kind === "accepted" ? "accepted" : input.event.kind === "terminal" || input.event.kind === "prepared" ? "completed" : command.state;
      const [updated] = await tx.update(localCommands).set({ sequence: input.event.sequence, state: nextState }).where(and(eq(localCommands.id, command.id), eq(localCommands.sequence, command.sequence), eq(localCommands.fence, input.event.fence))).returning({ sequence: localCommands.sequence });
      if (!updated) throw new LocalExecutionError("stale_fence");
      if (command.runId && input.event.kind === "gate") await persistGate(tx as unknown as Database, command.runId, input.event.payload);
      if (command.runId && input.event.kind === "activity") await persistActivity(tx as unknown as Database, command.runId, input.event.payload);
      if (command.kind === "start" && command.runId && input.event.kind === "terminal") {
        if (input.event.payload.outcome === "unknown") {
          await tx.update(localCheckoutLocks).set({ state: "reconciling", updatedAt: input.now }).where(and(
            eq(localCheckoutLocks.machineId, command.machineId),
            eq(localCheckoutLocks.checkoutHandle, command.target.checkoutHandle),
            eq(localCheckoutLocks.runId, command.runId),
            eq(localCheckoutLocks.fence, command.fence),
          ));
        } else {
          await tx.delete(localCheckoutLocks).where(and(
            eq(localCheckoutLocks.machineId, command.machineId),
            eq(localCheckoutLocks.checkoutHandle, command.target.checkoutHandle),
            eq(localCheckoutLocks.runId, command.runId),
            eq(localCheckoutLocks.fence, command.fence),
          ));
        }
      }
      return { acknowledgedSequence: updated.sequence, replayed: false };
    });
  }

  async enqueueCommand(input: NewLocalCommand & { expectedLinkRevision: number; now: Date }) {
    return this.database.transaction(async (tx) => {
      const [replay] = await tx.select().from(localCommands).where(and(eq(localCommands.machineId, input.machineId), eq(localCommands.requestKey, input.requestKey))).limit(1);
      if (replay) {
        if (replay.payloadHash !== input.payloadHash || replay.kind !== input.kind) throw new LocalExecutionError("request_key_reused");
        if (replay.fence !== input.fence && replay.state !== "completed") throw new LocalExecutionError("stale_fence");
        return toLocalCommand(replay);
      }
      const linkQuery = input.kind === "cancel"
        ? and(eq(localProjectLinks.id, input.linkId), eq(localProjectLinks.ownerUserId, input.actorId), eq(localProjectLinks.projectId, input.projectId), eq(localProjectLinks.machineId, input.machineId), eq(localProjectLinks.checkoutHandle, input.target.checkoutHandle))
        : and(eq(localProjectLinks.id, input.linkId), eq(localProjectLinks.ownerUserId, input.actorId), eq(localProjectLinks.projectId, input.projectId), eq(localProjectLinks.machineId, input.machineId), eq(localProjectLinks.checkoutHandle, input.target.checkoutHandle), eq(localProjectLinks.revision, input.expectedLinkRevision), eq(localProjectLinks.readiness, "ready"), isNull(localProjectLinks.revokedAt));
      const [link] = await tx.select().from(localProjectLinks).where(linkQuery).for("update").limit(1);
      if (!link) throw new LocalExecutionError("link_changed");
      const [machine] = await tx.select().from(localMachines).where(and(eq(localMachines.id, input.machineId), eq(localMachines.ownerUserId, input.actorId), isNull(localMachines.revokedAt), gt(localMachines.credentialExpiresAt, input.now))).limit(1);
      if (!machine) throw new LocalExecutionError("machine_unavailable");
      if (!machine.lastHeartbeatAt || input.now.getTime() - machine.lastHeartbeatAt.getTime() >= 30_000) throw new LocalExecutionError("machine_unavailable");
      if (input.kind === "start") {
        if (!input.runId) throw new LocalExecutionError("command_unavailable");
        const lockKey = `${input.machineId}:${input.target.checkoutHandle}`;
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
        const [currentLock] = await tx.select().from(localCheckoutLocks).where(and(
          eq(localCheckoutLocks.machineId, input.machineId),
          eq(localCheckoutLocks.checkoutHandle, input.target.checkoutHandle),
        )).for("update").limit(1);
        if (currentLock && (currentLock.runId !== input.runId || currentLock.fence !== input.fence)) throw new LocalExecutionError("checkout_busy");
        if (!currentLock) {
          await tx.insert(localCheckoutLocks).values({ machineId: input.machineId, checkoutHandle: input.target.checkoutHandle, runId: input.runId, fence: input.fence, state: "active", createdAt: input.now, updatedAt: input.now });
        }
      }
      const { expectedLinkRevision: _expectedLinkRevision, now: _now, ...values } = input;
      const [row] = await tx.insert(localCommands).values(values).returning();
      if (!row) throw new LocalExecutionError("command_unavailable");
      return toLocalCommand(row);
    });
  }

  async commandForActor(input: Parameters<LocalConnectorDao["commandForActor"]>[0]) {
    const [row] = await this.database.select().from(localCommands).where(and(eq(localCommands.id, input.commandId), eq(localCommands.actorId, input.actorId), eq(localCommands.projectId, input.projectId))).limit(1);
    if (!row) return null;
    const events = await this.database.select({ sequence: localCommandEvents.sequence, kind: localCommandEvents.kind, payload: localCommandEvents.payload, payloadHash: localCommandEvents.payloadHash }).from(localCommandEvents).where(eq(localCommandEvents.commandId, row.id)).orderBy(asc(localCommandEvents.sequence));
    return { command: toLocalCommand(row), events: events.map((event) => ({ ...event, payload: event.payload as Record<string, unknown> })) };
  }
}

function toPairing(row: typeof localPairings.$inferSelect): PairingRecord { return { ...row, expiresAt: row.expiresAt, confirmedAt: row.confirmedAt, consumedAt: row.consumedAt }; }
function toMachine(row: typeof localMachines.$inferSelect): MachineRecord { return { ...row, credentialExpiresAt: row.credentialExpiresAt, capabilities: row.capabilities as string[], providerCatalog: row.providerCatalog as MachineRecord["providerCatalog"], loopCatalog: row.loopCatalog as MachineRecord["loopCatalog"] }; }

async function syncMachineProviderCatalog(database: Database, machine: typeof localMachines.$inferSelect, catalog: import("../../../../application/database/dao/localConnectorDao").LocalProviderCatalogEntry[], now: Date) {
  const currentRows = await database.select().from(softwareConnections).where(and(eq(softwareConnections.machineId, machine.id), eq(softwareConnections.executionTarget, "machine")));
  const reportedIds = new Set(catalog.map((provider) => `local-${machine.id}-${provider.providerId}`));
  for (const connection of currentRows) {
    if (reportedIds.has(connection.runtimeProviderId)) continue;
    if (connection.authState === "disconnected" && connection.disabledAt && !((connection.modelCatalog as unknown[] | null)?.length)) continue;
    await database.update(softwareConnections).set({ authState: "disconnected", modelCatalog: [], disabledAt: now, lastCheckedAt: now, revision: sql`${softwareConnections.revision} + 1`, updatedAt: now }).where(eq(softwareConnections.id, connection.id));
  }
  for (const provider of catalog) {
    const runtimeProviderId = `local-${machine.id}-${provider.providerId}`;
    const label = `${provider.label} (${machine.id.slice(0, 8)})`;
    const [existing] = await database.select().from(softwareConnections).where(eq(softwareConnections.runtimeProviderId, runtimeProviderId)).limit(1);
    const values = { label, providerKind: provider.providerKind, executionTarget: "machine", machineId: machine.id, ownerUserId: machine.ownerUserId, modelCatalog: provider.models, authState: "connected", accountLabel: provider.label, accountFingerprint: null, lastCheckedAt: now, disabledAt: null, updatedAt: now };
    if (existing) {
      const sameCatalog = JSON.stringify(existing.modelCatalog ?? []) === JSON.stringify(provider.models);
      const unchanged = existing.machineId === machine.id && existing.ownerUserId === machine.ownerUserId && existing.label === label && existing.providerKind === provider.providerKind && existing.authState === "connected" && existing.disabledAt === null && sameCatalog && existing.accountLabel === provider.label;
      if (!unchanged) await database.update(softwareConnections).set({ ...values, revision: sql`${softwareConnections.revision} + 1` }).where(and(eq(softwareConnections.id, existing.id), eq(softwareConnections.machineId, machine.id), eq(softwareConnections.ownerUserId, machine.ownerUserId)));
    } else {
      await database.insert(softwareConnections).values({ ...values, runtimeProviderId, createdBy: machine.ownerUserId, createdAt: now });
    }
  }
}
function toProjectLink(row: typeof localProjectLinks.$inferSelect) { return row; }
function toLocalCommand(row: typeof localCommands.$inferSelect) { return { ...row, target: row.target as import("../../../../application/services/local-execution/localProtocol").LocalCommand["target"], payload: row.payload as Record<string, unknown> }; }

async function persistGate(tx: Database, runId: string, payload: Extract<import("../../../../application/services/local-execution/localProtocol").LocalEvent, { kind: "gate" }> ["payload"]) {
  const [run] = await tx.select({ snapshot: taskExecutionRuns.snapshot, taskId: taskExecutionRuns.taskId }).from(taskExecutionRuns).where(eq(taskExecutionRuns.id, runId)).limit(1);
  if (!run) throw new LocalExecutionError("command_unavailable");
  const preparation = (run.snapshot as { localPreparation?: { manifestHash?: string; requiredGates?: Array<{ id: string; commandDigest: string }> } }).localPreparation;
  if (!preparation || preparation.manifestHash !== payload.manifestHash) throw new LocalExecutionError("evidence_rejected");
  const declared = preparation.requiredGates?.find((gate) => gate.id === payload.gateId && gate.commandDigest === payload.commandDigest);
  if (!declared) throw new LocalExecutionError("evidence_rejected");
  const values = { runId, gateId: payload.gateId, attempt: payload.attempt, manifestHash: payload.manifestHash, required: true, state: payload.state, reason: payload.reason, commandDigest: payload.commandDigest, checkoutDigest: payload.checkedCheckoutDigest, exitCode: payload.exitCode, startedAt: new Date(payload.startedAt), finishedAt: payload.finishedAt ? new Date(payload.finishedAt) : null, executionId: payload.executionId };
  const [existing] = await tx.select().from(taskRunGates).where(and(eq(taskRunGates.runId, runId), eq(taskRunGates.gateId, payload.gateId), eq(taskRunGates.attempt, payload.attempt))).limit(1);
  if (existing) {
    if (existing.manifestHash !== values.manifestHash || existing.commandDigest !== values.commandDigest || existing.checkoutDigest !== values.checkoutDigest || existing.state !== values.state) throw new LocalExecutionError("event_conflict");
    return;
  }
  await tx.insert(taskRunGates).values(values);
}

async function persistActivity(tx: Database, runId: string, payload: Extract<import("../../../../application/services/local-execution/localProtocol").LocalEvent, { kind: "activity" }> ["payload"]) {
  const [usage] = await tx.select({ bytes: sum(taskRunEvidence.byteSize) }).from(taskRunEvidence).where(eq(taskRunEvidence.runId, runId));
  const safe = sanitizeEvidence({ kind: "activity", label: payload.relativeFiles[0] ?? "activity", content: payload.summary, privatePaths: [], secrets: [], usedBytes: Number(usage?.bytes ?? 0) });
  await tx.insert(taskRunEvidence).values({ runId, kind: "activity", relativeLabel: safe.label, visibility: "shared", contentHash: safe.contentHash, byteSize: Buffer.byteLength(safe.content, "utf8"), safePayload: { content: safe.content, truncated: safe.truncated } });
}

const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
