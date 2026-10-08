import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { DrizzleLocalConnectorDao } from "../src/infra/database/dao/local-execution/drizzleLocalConnectorDao";
import { hashSecret } from "../src/application/services/local-execution/localSecrets";
import { localPayloadHash } from "../src/application/services/local-execution/localHash";
import { closeTaskFixture } from "./task-api-support";
import { specTask } from "./spec-support";
import { softwareConnections, taskExecutionActions, taskExecutionPlans, taskExecutionRuns } from "../src/infra/database/schema";
import { ConnectorPairingService } from "../src/application/services/local-execution/connectorPairingService";
import { LocalMachineService } from "../src/application/services/local-execution/localMachineService";

afterEach(closeTaskFixture);

describe("local connector persistence", () => {
  it("keeps exchange retries on the original credential expiry and advances machine revisions independently", async () => {
    const setup = await specTask();
    const dao = new DrizzleLocalConnectorDao(setup.database);
    const now = new Date("2026-10-07T12:00:00.000Z");
    const pairing = await dao.createPairing({
      publicCodeHash: hashSecret("pairing-code"),
      pollingSecretHash: hashSecret("polling-secret"),
      safeLabel: "Developer laptop",
      expiresAt: new Date(now.getTime() + 10 * 60_000),
    });
    const confirmed = await dao.confirmPairing({ pairingId: pairing.id, ownerUserId: setup.ownerId, machineId: crypto.randomUUID(), requestKey: crypto.randomUUID(), now });
    const originalExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60_000);
    const credentialHash = hashSecret("machine-token");
    const exchange = {
      pairingId: pairing.id,
      pollingSecretHash: hashSecret("polling-secret"),
      requestKey: crypto.randomUUID(),
      machineTokenHash: credentialHash,
      encryptedMachineToken: "encrypted-token",
      credentialExpiresAt: originalExpiry,
      now,
    };
    const first = await dao.exchangePairing(exchange);
    const replay = await dao.exchangePairing({ ...exchange, credentialExpiresAt: new Date(originalExpiry.getTime() + 60_000) });
    expect(first).toMatchObject({ state: "complete", machineId: confirmed.machineId, credentialExpiresAt: originalExpiry });
    expect(replay).toEqual(first);

    const machine = await dao.machineByCredentialHash(credentialHash);
    expect(machine?.revision).toBe(1);
    const heartbeatKey = crypto.randomUUID();
    const providerCatalog = [{ providerId: "codex" as const, providerKind: "codex" as const, label: "Codex local", models: [{ modelId: "gpt-local", displayName: "GPT local", selectable: true, unselectableReason: null, reasoningChoices: ["medium"] }] }];
    const heartbeat = await dao.heartbeat({ machineId: machine!.id, credentialHash, capabilities: ["compozy"], catalogRevision: 12, providerCatalog, requestKey: heartbeatKey, now });
    expect(heartbeat).toMatchObject({ revision: 2, catalogRevision: 12 });
    expect(heartbeat.providerCatalog).toEqual(providerCatalog);
    const [connection] = await setup.database.select().from(softwareConnections).where(eq(softwareConnections.machineId, machine!.id));
    expect(connection).toMatchObject({ providerKind: "codex", executionTarget: "machine", ownerUserId: setup.ownerId, authState: "connected", modelCatalog: providerCatalog[0].models });
    const connectionRevision = connection!.revision;
    const repeatedHeartbeat = await dao.heartbeat({ machineId: machine!.id, credentialHash, capabilities: ["compozy"], catalogRevision: 12, providerCatalog, requestKey: heartbeatKey, now });
    expect(repeatedHeartbeat.revision).toBe(2);
    const [unchangedConnection] = await setup.database.select().from(softwareConnections).where(eq(softwareConnections.id, connection!.id));
    expect(unchangedConnection?.revision).toBe(connectionRevision);
    await expect(dao.heartbeat({ machineId: machine!.id, credentialHash, capabilities: ["compozy"], catalogRevision: 13, requestKey: heartbeatKey, now })).rejects.toMatchObject({ reason: "request_key_reused" });
    const revokeInput = { ownerUserId: setup.ownerId, machineId: machine!.id, expectedRevision: 2, requestKey: crypto.randomUUID(), now };
    const revoked = await dao.revokeMachine(revokeInput);
    expect(revoked.revision).toBe(3);
    const [revokedConnection] = await setup.database.select().from(softwareConnections).where(eq(softwareConnections.id, connection!.id));
    expect(revokedConnection).toMatchObject({ authState: "disconnected", disabledAt: now, modelCatalog: [] });
    expect(await dao.revokeMachine(revokeInput)).toEqual(revoked);
    await expect(dao.revokeMachine({ ...revokeInput, expectedRevision: 1 })).rejects.toMatchObject({ reason: "request_key_reused" });
  });

  it("publishes and unlinks one owner-scoped project descriptor with compare-and-set revisions", async () => {
    const setup = await specTask();
    const dao = new DrizzleLocalConnectorDao(setup.database);
    const now = new Date("2026-10-07T12:00:00.000Z");
    const pairing = await dao.createPairing({
      publicCodeHash: hashSecret("pairing-code"),
      pollingSecretHash: hashSecret("polling-secret"),
      safeLabel: "Developer laptop",
      expiresAt: new Date(now.getTime() + 10 * 60_000),
    });
    const confirmed = await dao.confirmPairing({ pairingId: pairing.id, ownerUserId: setup.ownerId, machineId: crypto.randomUUID(), requestKey: crypto.randomUUID(), now });
    await dao.exchangePairing({ pairingId: pairing.id, pollingSecretHash: hashSecret("polling-secret"), requestKey: crypto.randomUUID(), machineTokenHash: hashSecret("machine-token"), encryptedMachineToken: "encrypted-token", credentialExpiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60_000), now });
    const descriptor = { machineId: confirmed.machineId!, checkoutHandle: "a".repeat(64), checkoutKey: "b".repeat(64), repositoryId: "repository-1", repositoryNodeId: "node-1", safeLabel: "Flow Dev" };
    const publishKey = crypto.randomUUID();
    const publishInput = { ownerUserId: setup.ownerId, projectId: setup.project.id, expectedRevision: 0, requestKey: publishKey, descriptor, now };
    const linked = await dao.publishProjectLink(publishInput);
    expect(linked).toMatchObject({ revision: 1, readiness: "ready", revokedAt: null, safeLabel: "Flow Dev" });
    expect(await dao.publishProjectLink(publishInput)).toEqual(linked);
    await expect(dao.publishProjectLink({ ...publishInput, descriptor: { ...descriptor, safeLabel: "Stale" } })).rejects.toMatchObject({ reason: "request_key_reused" });
    await expect(dao.publishProjectLink({ ...publishInput, requestKey: crypto.randomUUID(), descriptor: { ...descriptor, safeLabel: "Stale" } })).rejects.toThrow("link_changed");
    const updateInput = { ownerUserId: setup.ownerId, projectId: setup.project.id, expectedRevision: 1, requestKey: crypto.randomUUID(), descriptor: { ...descriptor, safeLabel: "Flow Dev checkout" }, now };
    const updated = await dao.publishProjectLink(updateInput);
    expect(updated.revision).toBe(2);
    const unlinkInput = { ownerUserId: setup.ownerId, projectId: setup.project.id, linkId: updated.id, expectedRevision: 2, requestKey: crypto.randomUUID(), now };
    const revoked = await dao.revokeProjectLink(unlinkInput);
    expect(revoked.revision).toBe(3);
    expect(await dao.revokeProjectLink(unlinkInput)).toEqual(revoked);
    expect(await dao.currentProjectLink({ ownerUserId: setup.ownerId, projectId: setup.project.id })).toBeNull();
  });

  it("applies connector rate limits atomically and resets the window", async () => {
    const setup = await specTask();
    const dao = new DrizzleLocalConnectorDao(setup.database);
    const now = Date.now();
    const key = `flow-local:test:${crypto.randomUUID()}`;
    expect(await dao.consumeRateLimit({ key, maximum: 2, windowMs: 60_000, now })).toMatchObject({ allowed: true });
    expect(await dao.consumeRateLimit({ key, maximum: 2, windowMs: 60_000, now: now + 100 })).toMatchObject({ allowed: true });
    expect(await dao.consumeRateLimit({ key, maximum: 2, windowMs: 60_000, now: now + 200 })).toMatchObject({ allowed: false, retryAfterSeconds: 60 });
    expect(await dao.consumeRateLimit({ key, maximum: 2, windowMs: 60_000, now: now + 60_000 })).toMatchObject({ allowed: true, retryAfterSeconds: 60 });
  });

  it("replays an unacknowledged machine credential rotation and briefly accepts the previous token", async () => {
    const setup = await specTask();
    const dao = new DrizzleLocalConnectorDao(setup.database);
    const now = new Date("2026-10-07T12:00:00.000Z");
    const pairing = await dao.createPairing({ publicCodeHash: hashSecret("rotation-code"), pollingSecretHash: hashSecret("rotation-poll"), safeLabel: "Laptop", expiresAt: new Date(now.getTime() + 600_000) });
    const confirmed = await dao.confirmPairing({ pairingId: pairing.id, ownerUserId: setup.ownerId, machineId: crypto.randomUUID(), requestKey: crypto.randomUUID(), now });
    const originalToken = "original-machine-token";
    const originalHash = hashSecret(originalToken);
    await dao.exchangePairing({ pairingId: pairing.id, pollingSecretHash: hashSecret("rotation-poll"), requestKey: crypto.randomUUID(), machineTokenHash: originalHash, encryptedMachineToken: "initial-ciphertext", credentialExpiresAt: new Date(now.getTime() + 86_400_000), now });
    const requestKey = crypto.randomUUID();
    const firstToken = "rotated-machine-token-one";
    const first = await dao.heartbeat({ machineId: confirmed.machineId!, credentialHash: originalHash, capabilities: ["commands"], catalogRevision: 1, requestKey, now, rotation: { requestKey, credentialHash: hashSecret(firstToken), encryptedCredential: "encrypted-first", expiresAt: new Date(now.getTime() + 86_400_000) } });
    const replay = await dao.heartbeat({ machineId: confirmed.machineId!, credentialHash: originalHash, capabilities: ["commands"], catalogRevision: 1, requestKey, now, rotation: { requestKey, credentialHash: hashSecret("lost-response-new-token"), encryptedCredential: "encrypted-different", expiresAt: new Date(now.getTime() + 90_000_000) } });
    expect(first.pendingCredentialHash).toBe(hashSecret(firstToken));
    expect(replay.pendingCredentialHash).toBe(first.pendingCredentialHash);
    expect(await dao.machineByCredentialHash(hashSecret(firstToken), now)).toMatchObject({ credentialGeneration: 1, pendingCredentialGeneration: 2 });
    const acknowledged = await dao.heartbeat({ machineId: confirmed.machineId!, credentialHash: hashSecret(firstToken), acknowledgedGeneration: 2, capabilities: ["commands"], catalogRevision: 1, requestKey: crypto.randomUUID(), now: new Date(now.getTime() + 1_000) });
    expect(acknowledged).toMatchObject({ credentialHash: hashSecret(firstToken), credentialGeneration: 2, pendingCredentialHash: null, previousCredentialHash: originalHash });
    expect(await dao.machineByCredentialHash(originalHash, new Date(now.getTime() + 2_000))).not.toBeNull();
    expect(await dao.machineByCredentialHash(originalHash, new Date(now.getTime() + 6 * 60_000))).toBeNull();
  });

  it("returns the same encrypted pending token after a heartbeat response is lost", async () => {
    const setup = await specTask();
    const dao = new DrizzleLocalConnectorDao(setup.database);
    const now = new Date("2026-10-07T12:00:00.000Z");
    const encryptionKey = Buffer.alloc(32, 7).toString("base64");
    const pairings = new ConnectorPairingService(dao, encryptionKey, () => now);
    const service = new LocalMachineService(dao, pairings, encryptionKey, () => now);
    const pairing = await dao.createPairing({ publicCodeHash: hashSecret("service-rotation-code"), pollingSecretHash: hashSecret("service-rotation-poll"), safeLabel: "Laptop", expiresAt: new Date(now.getTime() + 600_000) });
    const confirmed = await dao.confirmPairing({ pairingId: pairing.id, ownerUserId: setup.ownerId, machineId: crypto.randomUUID(), requestKey: crypto.randomUUID(), now });
    const token = "service-original-token";
    await dao.exchangePairing({ pairingId: pairing.id, pollingSecretHash: hashSecret("service-rotation-poll"), requestKey: crypto.randomUUID(), machineTokenHash: hashSecret(token), encryptedMachineToken: "initial", credentialExpiresAt: new Date(now.getTime() + 2 * 24 * 60 * 60_000), now });
    const request = { token, protocolVersion: 1, capabilities: ["commands"], catalogRevision: 1, requestKey: crypto.randomUUID() };
    const first = await service.heartbeat(request);
    const retry = await service.heartbeat(request);
    expect(first.credentialRotation?.generation).toBe(2);
    expect(retry.credentialRotation).toEqual(first.credentialRotation);
    expect(first.credentialRotation?.token).not.toBe(token);
    expect(await dao.machineByCredentialHash(hashSecret(first.credentialRotation!.token), now)).toMatchObject({ id: confirmed.machineId, pendingCredentialGeneration: 2 });
  });

  it("queues an owner-scoped preparation, leases it once, and accepts a sequenced safe event", async () => {
    const setup = await specTask();
    const dao = new DrizzleLocalConnectorDao(setup.database);
    const now = new Date("2026-10-07T12:00:00.000Z");
    const pairing = await dao.createPairing({ publicCodeHash: hashSecret("code"), pollingSecretHash: hashSecret("poll"), safeLabel: "Laptop", expiresAt: new Date(now.getTime() + 600_000) });
    const confirmed = await dao.confirmPairing({ pairingId: pairing.id, ownerUserId: setup.ownerId, machineId: crypto.randomUUID(), requestKey: crypto.randomUUID(), now });
    await dao.exchangePairing({ pairingId: pairing.id, pollingSecretHash: hashSecret("poll"), requestKey: crypto.randomUUID(), machineTokenHash: hashSecret("token"), encryptedMachineToken: "ciphertext", credentialExpiresAt: new Date(now.getTime() + 86_400_000), now });
    await dao.heartbeat({ machineId: confirmed.machineId!, credentialHash: hashSecret("token"), capabilities: ["commands"], catalogRevision: 1, requestKey: crypto.randomUUID(), now });
    const linked = await dao.publishProjectLink({ ownerUserId: setup.ownerId, projectId: setup.project.id, expectedRevision: 0, requestKey: crypto.randomUUID(), descriptor: { machineId: confirmed.machineId!, checkoutHandle: "a".repeat(64), checkoutKey: "b".repeat(64), repositoryId: "202", repositoryNodeId: "R_202", safeLabel: "Flow Dev" }, now });
    const preparationId = crypto.randomUUID();
    const target = { machineId: confirmed.machineId!, linkId: linked.id, linkRevision: linked.revision, checkoutHandle: linked.checkoutHandle };
    const payload = { preparationId, actionId: crypto.randomUUID(), sourceSnapshotId: crypto.randomUUID(), checkoutLabel: "Flow Dev", action: { kind: "create_spec" } };
    const command = await dao.enqueueCommand({ id: preparationId, machineId: target.machineId, linkId: target.linkId, projectId: setup.project.id, actorId: setup.ownerId, runId: null, preparationId, protocolVersion: 1, target, requestKey: preparationId, kind: "prepare", payload, payloadHash: localPayloadHash(payload), fence: 1, leaseExpiresAt: new Date(now.getTime() + 60_000), expectedLinkRevision: linked.revision, now });
    expect(command).not.toHaveProperty("checkoutKey");
    expect(command).not.toHaveProperty("path");
    const polled = await dao.pollCommands({ machineId: target.machineId, now, limit: 10 });
    expect(polled).toHaveLength(1);
    expect(await dao.pollCommands({ machineId: target.machineId, now, limit: 10 })).toMatchObject([{ id: command.id, state: "leased" }]);
    const eventPayload = { preparationId, checkoutLabel: "Flow Dev", dirty: false, checkoutDigest: "c".repeat(64), manifestHash: "d".repeat(64), capabilities: ["git"], requiredGates: [] };
    const event = { protocolVersion: 1 as const, commandId: command.id, runId: preparationId, fence: 1, sequence: 1, payloadHash: localPayloadHash(eventPayload), kind: "prepared" as const, payload: eventPayload };
    await expect(dao.recordCommandEvent({ machineId: target.machineId, event, now })).resolves.toEqual({ acknowledgedSequence: 1, replayed: false });
    await expect(dao.recordCommandEvent({ machineId: target.machineId, event, now })).resolves.toEqual({ acknowledgedSequence: 1, replayed: true });
    await expect(dao.commandForActor({ actorId: setup.ownerId, projectId: setup.project.id, commandId: preparationId })).resolves.toMatchObject({ command: { state: "completed" }, events: [{ kind: "prepared", sequence: 1 }] });
    await expect(dao.commandForActor({ actorId: crypto.randomUUID(), projectId: setup.project.id, commandId: preparationId })).resolves.toBeNull();
  });

  it("keeps a checkout locked through unknown outcomes and releases it only on an authoritative terminal", async () => {
    const setup = await specTask();
    const dao = new DrizzleLocalConnectorDao(setup.database);
    const now = new Date("2026-10-07T12:00:00.000Z");
    const pairing = await dao.createPairing({ publicCodeHash: hashSecret("lock-code"), pollingSecretHash: hashSecret("lock-poll"), safeLabel: "Laptop", expiresAt: new Date(now.getTime() + 600_000) });
    const confirmed = await dao.confirmPairing({ pairingId: pairing.id, ownerUserId: setup.ownerId, machineId: crypto.randomUUID(), requestKey: crypto.randomUUID(), now });
    await dao.exchangePairing({ pairingId: pairing.id, pollingSecretHash: hashSecret("lock-poll"), requestKey: crypto.randomUUID(), machineTokenHash: hashSecret("lock-token"), encryptedMachineToken: "ciphertext", credentialExpiresAt: new Date(now.getTime() + 86_400_000), now });
    await dao.heartbeat({ machineId: confirmed.machineId!, credentialHash: hashSecret("lock-token"), capabilities: ["commands"], catalogRevision: 1, requestKey: crypto.randomUUID(), now });
    const checkoutHandle = "e".repeat(64);
    const linked = await dao.publishProjectLink({ ownerUserId: setup.ownerId, projectId: setup.project.id, expectedRevision: 0, requestKey: crypto.randomUUID(), descriptor: { machineId: confirmed.machineId!, checkoutHandle, checkoutKey: "f".repeat(64), repositoryId: "202", repositoryNodeId: "R_202", safeLabel: "Flow Dev" }, now });
    const targets = { machineId: confirmed.machineId!, linkId: linked.id, linkRevision: linked.revision, checkoutHandle };
    const planId = crypto.randomUUID();
    await setup.database.insert(taskExecutionPlans).values({ id: planId, taskId: setup.taskId, kind: "os_unified", revision: 1, status: "running", createdBy: setup.ownerId });
    const createRun = async (isWrite = true) => {
      const actionId = crypto.randomUUID();
      const runId = crypto.randomUUID();
      await setup.database.insert(taskExecutionActions).values({ id: actionId, planId, taskId: setup.taskId, position: Math.floor(Math.random() * 100_000), kind: "create_spec", workspaceKind: "local", localMachineId: confirmed.machineId!, localLinkId: linked.id, localLinkRevision: linked.revision, localCheckoutHandle: checkoutHandle });
      await setup.database.insert(taskExecutionRuns).values({ id: runId, actionId, taskId: setup.taskId, attemptNumber: 1, state: "running", snapshot: {}, idempotencyKey: crypto.randomUUID(), requestedBy: setup.ownerId, leaseFence: 1, isWrite });
      return runId;
    };
    const runId = await createRun();
    const competingRunId = await createRun(false);
    const enqueueStart = async (id: string) => {
      const payload = { snapshot: { id } };
      return dao.enqueueCommand({ id: crypto.randomUUID(), machineId: targets.machineId, linkId: targets.linkId, projectId: setup.project.id, actorId: setup.ownerId, runId: id, preparationId: null, protocolVersion: 1, target: targets, requestKey: crypto.randomUUID(), kind: "start", payload, payloadHash: localPayloadHash(payload), fence: 1, leaseExpiresAt: new Date(now.getTime() + 60_000), expectedLinkRevision: linked.revision, now });
    };
    const command = await enqueueStart(runId);
    const eventFor = (sequence: number, outcome: "unknown" | "succeeded") => {
      const payload = { outcome, reason: outcome === "unknown" ? "outcome_unknown" : null, checkoutDigest: "a".repeat(64), artifactsSafe: true, runtimeSucceeded: true };
      return { protocolVersion: 1 as const, commandId: command.id, runId, fence: 1, sequence, payloadHash: localPayloadHash(payload), kind: "terminal" as const, payload };
    };
    const acceptedPayload = { runtimeExecutionId: "execution-1", runtimeWorkspaceId: "workspace-1", runtimeSessionId: "session-1", runtimeTurnId: null };
    await dao.recordCommandEvent({ machineId: targets.machineId, event: { protocolVersion: 1, commandId: command.id, runId, fence: 1, sequence: 1, payloadHash: localPayloadHash(acceptedPayload), kind: "accepted", payload: acceptedPayload }, now });
    await dao.recordCommandEvent({ machineId: targets.machineId, event: eventFor(2, "unknown"), now });
    await expect(enqueueStart(competingRunId)).rejects.toMatchObject({ reason: "checkout_busy" });
    await dao.recordCommandEvent({ machineId: targets.machineId, event: eventFor(3, "succeeded"), now });
    await expect(enqueueStart(competingRunId)).resolves.toMatchObject({ kind: "start", runId: competingRunId });
  });
});
