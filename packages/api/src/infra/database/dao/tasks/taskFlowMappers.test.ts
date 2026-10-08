import { describe, expect, it } from "vitest";
import { toRun, toWorkspace } from "./taskFlowMappers";

describe("task flow local provenance mapping", () => {
  it("UT-154 maps only accepted opaque local identity and safe run provenance", () => {
    const workspace = toWorkspace({ workspaceKind: "local", localMachineId: "11111111-1111-4111-8111-111111111111", localLinkId: "22222222-2222-4222-8222-222222222222", localLinkRevision: 3, localCheckoutHandle: "opaque-checkout" } as never);
    const createdAt = new Date("2026-10-07T12:00:00.000Z");
    const run = toRun({
      id: "33333333-3333-4333-8333-333333333333", actionId: "44444444-4444-4444-8444-444444444444", taskId: "55555555-5555-4555-8555-555555555555",
      attemptNumber: 1, state: "running", snapshot: { workspace, operatorId: "66666666-6666-4666-8666-666666666666", localPreparation: { preparationId: "77777777-7777-4777-8777-777777777777", manifestHash: "a".repeat(64) } },
      worktreeId: null, connectionIds: [], isWrite: true, leaseFence: 2, idempotencyKey: "88888888-8888-4888-8888-888888888888", terminalCode: null,
      runtimeWorkspaceId: null, runtimeSessionId: null, runtimeTurnId: null, runtimeRunId: null, runtimeEventSequence: 0, activity: null,
      leaseOwner: null, requestedBy: "66666666-6666-4666-8666-666666666666", createdAt, finishedAt: null,
    } as never);
    expect(workspace).toEqual({ kind: "local", target: { machineId: "11111111-1111-4111-8111-111111111111", linkId: "22222222-2222-4222-8222-222222222222", linkRevision: 3, checkoutHandle: "opaque-checkout" } });
    expect(run).toMatchObject({ requestedBy: "66666666-6666-4666-8666-666666666666", createdAt, snapshot: { workspace, localPreparation: { manifestHash: "a".repeat(64) } } });
    expect(JSON.stringify(run)).not.toMatch(/\/home\/|Users\\/);
  });
});
