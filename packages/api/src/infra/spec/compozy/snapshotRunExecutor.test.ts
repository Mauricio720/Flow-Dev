import { describe, expect, it, vi } from "vitest";
import { SnapshotRunExecutor } from "./snapshotRunExecutor";
import { PROMPT_START_FAILURE } from "./promptStartRecovery";
import { idFor, RETRY_PROMPT_PURPOSE } from "./snapshotRunPrompt";

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

describe("SnapshotRunExecutor reconciliation", () => {
  const pins = { version: "v1", openApiSha256: "a", binarySha256: "b", bundleSha256: "c" };
  const startFailure = 'acp: config option "mode" does not allow value "agent-full-access"';
  const sessionSnapshot = { state: "active", verified: false, stopReason: null, stopCause: null, turnId: null, attention: null, pendingInteractions: [] };

  function reconcileWith(snapshot: Record<string, unknown>) {
    const launcher = { start: vi.fn(async () => ({ socketPath: "/tmp/daemon.sock" })), stop: vi.fn(async () => {}) };
    const gateway = { events: async function* () {}, inspect: vi.fn(async () => snapshot) };
    const executor = new SnapshotRunExecutor({ gateway: gateway as never, launcher, runtime: { agentName: "flow-publish", declared: pins, accepted: pins }, taskFor: async () => ({ issueNumber: 1, title: "Issue", bodyMarkdown: "Details" }) });
    const request = { run: { id: "run-1", runtime: { workspaceId: "workspace-1", sessionId: "session-1" } }, snapshot: {} } as never;
    return { launcher, result: executor.reconcile(request) };
  }

  it("fails the run with the provider reason when the agent session never bound its runtime", async () => {
    const { launcher, result } = reconcileWith({ ...sessionSnapshot, startFailure });
    await expect(result).resolves.toMatchObject({ state: "failed", code: "runtime_failed", detail: startFailure });
    expect(launcher.stop).toHaveBeenCalledWith("run-1");
  });

  it("keeps a session without a start failure running", async () => {
    const { launcher, result } = reconcileWith({ ...sessionSnapshot, startFailure: null });
    await expect(result).resolves.toMatchObject({ state: "running", code: null });
    expect(launcher.stop).not.toHaveBeenCalled();
  });
});

describe("SnapshotRunExecutor prompt that never started", () => {
  const pins = { version: "v1", openApiSha256: "a", binarySha256: "b", bundleSha256: "c" };
  const SESSION_CREATED_AT = "2026-10-15T16:56:23.000Z";
  const MINUTE_MS = 60_000;
  const action = { kind: "direct_execute", language: "pt-BR", runtime: { connectionId: "connection-1", providerId: "claude", modelId: "claude-sonnet-5", reasoningEffort: "medium" }, runtimeProviderIds: { "connection-1": "claude" }, workspace: { kind: "local" } };
  const unboundSession = { state: "active", verified: false, stopReason: null, stopCause: null, turnId: null, attention: null, pendingInteractions: [], startFailure: null, unboundSince: SESSION_CREATED_AT };

  function reconcileAfter(minutes: number, eventTypes: string[] = []) {
    const launcher = { start: vi.fn(async () => ({ socketPath: "/tmp/daemon.sock" })), stop: vi.fn(async () => {}) };
    const events = vi.fn(async function* () { for (const [index, type] of eventTypes.entries()) yield { sequence: index + 1, id: `event-${index}`, type, turnId: "turn-1", timestamp: SESSION_CREATED_AT, content: {} }; });
    const gateway = { events, inspect: vi.fn(async () => unboundSession), submit: vi.fn(async () => { throw new Error("timeout"); }) };
    const now = () => new Date(Date.parse(SESSION_CREATED_AT) + minutes * MINUTE_MS);
    const executor = new SnapshotRunExecutor({ gateway: gateway as never, launcher, now, runtime: { agentName: "flow-direct", declared: pins, accepted: pins }, taskFor: async () => ({ issueNumber: 1, title: "Issue", bodyMarkdown: "Details" }) });
    const request = { run: { id: "run-1", runtime: { workspaceId: "workspace-1", sessionId: "session-1" } }, snapshot: action } as never;
    return { launcher, gateway, result: executor.reconcile(request) };
  }

  it("keeps waiting without resending while the runtime may still be binding", async () => {
    const { gateway, result } = reconcileAfter(1);
    await expect(result).resolves.toMatchObject({ state: "running", code: null });
    expect(gateway.submit).not.toHaveBeenCalled();
  });

  it("resends the prompt once under its own idempotency key when the session never received it", async () => {
    const { gateway, launcher, result } = reconcileAfter(3, ["hook.dispatch.start"]);
    await expect(result).resolves.toMatchObject({ state: "running", code: null });
    expect(gateway.submit).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-1", idempotencyKey: idFor("run-1", RETRY_PROMPT_PURPOSE), provider: "claude", model: "claude-sonnet-5" }));
    expect(launcher.stop).not.toHaveBeenCalled();
  });

  it("does not resend a prompt the session already received", async () => {
    const { gateway, result } = reconcileAfter(3, ["user_message"]);
    await expect(result).resolves.toMatchObject({ state: "running", code: null });
    expect(gateway.submit).not.toHaveBeenCalled();
  });

  it("fails the run instead of idling until the runtime inactivity stop", async () => {
    const { gateway, launcher, result } = reconcileAfter(7);
    await expect(result).resolves.toMatchObject({ state: "failed", code: "runtime_failed", detail: PROMPT_START_FAILURE });
    expect(gateway.submit).not.toHaveBeenCalled();
    expect(launcher.stop).toHaveBeenCalledWith("run-1");
  });
});
