import { describe, expect, it, vi } from "vitest";
import { SnapshotRunExecutor } from "./snapshotRunExecutor";

describe("SnapshotRunExecutor cancellation", () => {
  it("retains an unknown outcome until the daemon verifies the canceled stop", async () => {
    const launcher = { start: vi.fn(async () => ({ socketPath: "/tmp/daemon.sock" })), stop: vi.fn(async () => {}) };
    const gateway = { stop: vi.fn().mockResolvedValueOnce({ state: "stopping", verified: false, cause: null, attention: null, settled: false, canceled: false }).mockResolvedValueOnce({ state: "stopped", verified: true, cause: null, attention: null, settled: true, canceled: true }) };
    const pins = { version: "v1", openApiSha256: "a", binarySha256: "b", bundleSha256: "c" };
    const executor = new SnapshotRunExecutor({ gateway: gateway as never, launcher, runtime: { agentName: "flow-spec", declared: pins, accepted: pins }, taskFor: async () => ({ issueNumber: 1, title: "Issue", bodyMarkdown: "Details" }) });
    const request = { run: { id: "run-1", runtime: { workspaceId: "workspace-1", sessionId: "session-1" } }, snapshot: {} } as never;
    await expect(executor.cancel(request)).resolves.toMatchObject({ state: "unknown", code: "outcome_unknown" });
    expect(launcher.stop).not.toHaveBeenCalled();
    await expect(executor.cancel(request)).resolves.toMatchObject({ state: "canceled", code: "canceled_by_author" });
    expect(launcher.stop).toHaveBeenCalledWith("run-1");
  });
});

describe("SnapshotRunExecutor local interactions", () => {
  it("answers only the current pending question and confirms delivery", async () => {
    const launcher = { start: vi.fn(async () => ({ socketPath: "/tmp/daemon.sock" })), stop: vi.fn(async () => {}) };
    const gateway = {
      interactions: vi.fn(async () => [
        { id: "old-question", providerRequestId: "old-request", turnId: null, kind: "question", status: "answered", title: null, choices: [], decisions: [], toolId: null, resolution: "old" },
        { id: "question-1", providerRequestId: "request-1", turnId: "turn-1", kind: "question", status: "pending", title: "Decision?", choices: [], decisions: [], toolId: null, resolution: null },
      ]),
      resolve: vi.fn(async () => ({ outcome: "answered" as const, delivered: true, liveDeliveryProven: true, orphaned: false, winningValue: "continue", reason: null })),
    };
    const pins = { version: "v1", openApiSha256: "a", binarySha256: "b", bundleSha256: "c" };
    const executor = new SnapshotRunExecutor({ gateway: gateway as never, launcher, runtime: { agentName: "flow-spec", declared: pins, accepted: pins }, taskFor: async () => ({ issueNumber: 1, title: "Issue", bodyMarkdown: "Details" }) });
    const request = { run: { id: "run-1", runtime: { workspaceId: "workspace-1", sessionId: "session-1" } }, snapshot: {} } as never;
    await expect(executor.answerQuestion(request, { interactionId: "question-1", answer: "continue" })).resolves.toBe(true);
    expect(launcher.start).toHaveBeenCalledWith(request);
    expect(gateway.resolve).toHaveBeenCalledWith({ socketPath: "/tmp/daemon.sock", workspaceId: "workspace-1", sessionId: "session-1", kind: "question", requestId: "request-1", text: "continue" });
    await expect(executor.answerQuestion(request, { interactionId: "old-question", answer: "again" })).resolves.toBe(false);
  });
});
