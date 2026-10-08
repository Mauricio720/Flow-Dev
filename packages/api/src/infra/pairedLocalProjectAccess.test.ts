import { describe, expect, it, vi } from "vitest";
import { PairedLocalProjectAccess } from "./pairedLocalProjectAccess";

describe("PairedLocalProjectAccess preparation validation", () => {
  it("UT-118 expires a preparation exactly five minutes after issuance", async () => {
    const now = new Date("2026-10-07T12:05:00.000Z");
    const machineId = "11111111-1111-4111-8111-111111111111";
    const linkId = "22222222-2222-4222-8222-222222222222";
    const preparationId = "33333333-3333-4333-8333-333333333333";
    const target = { machineId, linkId, linkRevision: 2, checkoutHandle: "opaque-checkout" };
    const local = {
      currentProjectLink: vi.fn(async () => ({ id: linkId, ownerUserId: "owner-1", projectId: "project-1", machineId, checkoutHandle: target.checkoutHandle, checkoutKey: "secret", repositoryId: "repo-1", repositoryNodeId: "node-1", safeLabel: "Flow", revision: 2, readiness: "ready", readyAt: now, lastRequestKey: null, lastRequestPayloadHash: null, revokedAt: null })),
      machineById: vi.fn(async () => ({ id: machineId, ownerUserId: "owner-1", label: "Laptop", credentialExpiresAt: new Date(now.getTime() + 60_000), revokedAt: null, lastHeartbeatAt: new Date(now.getTime() - 1_000) })),
      commandForActor: vi.fn(async () => ({ command: { preparationId, kind: "prepare", target, createdAt: new Date(now.getTime() - 5 * 60_000), payload: { actionId: "action-1", sourceSnapshotId: "44444444-4444-4444-8444-444444444444" } }, events: [{ kind: "prepared", payload: { manifestHash: "a".repeat(64), checkoutDigest: "b".repeat(64), requiredGates: [] } }] })),
    } as never;
    const access = new PairedLocalProjectAccess({
      flow: { taskContext: async () => ({ projectId: "project-1", operatorUserId: "owner-1" }) } as never,
      local,
      repositories: { requirePersonalRead: async () => ({ githubId: "repo-1", nodeId: "node-1" }) } as never,
      now: () => now,
    });

    await expect(access.validatePreparation({ taskId: "task-1", projectId: "project-1", actorId: "owner-1", actionId: "action-1", sourceSnapshotId: "44444444-4444-4444-8444-444444444444", preparationId })).rejects.toMatchObject({ reason: "preparation_expired" });
  });
});
