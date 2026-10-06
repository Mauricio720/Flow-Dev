import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { callerRejection } from "@/test/tasks";
import { R1, V1, V2, TARGET, snapshotOf } from "@/test/spec";
import { specPollInterval } from "./specPolling";
import { useSpecSnapshot } from "./useSpecSnapshot";

const byTask = vi.mocked(trpc.taskSpec.byTask.query);
const events = vi.mocked(trpc.taskSpec.events.query);
const emptyPage = { items: [], nextCursor: null, hasMore: false } as never;
const running = snapshotOf({ state: "running", attempt: { id: R1, stage: "prd", attemptNumber: 1, kind: "generate", state: "running", terminalReason: null, createdAt: "x" } } as never);

function mount(initial = running) {
  return renderHook(() => useSpecSnapshot({ ...TARGET, initial, enabled: true }));
}
async function tick(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}
beforeEach(() => {
  vi.useFakeTimers();
  events.mockResolvedValue(emptyPage);
  byTask.mockResolvedValue(running);
});

describe("useSpecSnapshot", () => {
  it("UT-057 polls a visible running view every second without overlapping reads", async () => {
    expect(specPollInterval(running)).toBe(1000);
    expect([specPollInterval(snapshotOf({ state: "waiting_question" })), specPollInterval(snapshotOf({ state: "review" })), specPollInterval(snapshotOf({ state: "approved" })), specPollInterval(snapshotOf({ state: "failed" }))]).toEqual([5000, 5000, 30000, 30000]);
    let release!: (value: unknown) => void;
    byTask.mockReturnValue(new Promise((resolve) => { release = resolve; }) as never);
    mount();
    await tick(3500);
    expect(byTask).toHaveBeenCalledTimes(1);
    release(running);
    await tick(1100);
    expect(byTask.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
  it("UT-058 stops polling and clears protected cached content when access is denied", async () => {
    const hook = mount();
    await tick(10);
    byTask.mockRejectedValue(callerRejection("PRECONDITION_FAILED", "repository_authorization_needed"));
    await tick(1100);
    expect(hook.result.current.denied).toBe(true);
    expect(hook.result.current.snapshot).toBeNull();
    expect(hook.result.current.events.entries).toEqual([]);
    const calls = byTask.mock.calls.length;
    await tick(5000);
    expect(byTask.mock.calls.length).toBe(calls);
  });
  it("IT-237 stops periodic reads while hidden and refreshes exactly once on return without dispatching work", async () => {
    mount();
    await tick(10);
    const baseline = byTask.mock.calls.length;
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    await tick(5000);
    expect(byTask.mock.calls.length).toBe(baseline);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    await tick(10);
    expect(byTask.mock.calls.length).toBe(baseline + 1);
    expect(vi.mocked(trpc.taskSpec.start.mutate)).not.toHaveBeenCalled();
    expect(vi.mocked(trpc.taskSpec.answer.mutate)).not.toHaveBeenCalled();
  });
  it("IT-026 keeps the last known running state with a loss-of-contact flag when the network fails", async () => {
    const hook = mount();
    await tick(10);
    byTask.mockRejectedValue(new TypeError("fetch failed"));
    await tick(1100);
    expect(hook.result.current.contactLost).toBe(true);
    expect(hook.result.current.snapshot?.state).toBe("running");
  });
  it("IT-135 never replaces a newer snapshot with an older read and reflects the newer current package", async () => {
    const hook = mount(snapshotOf({ specVersion: 3 }));
    await tick(10);
    byTask.mockResolvedValue(snapshotOf({ specVersion: 2 }));
    await tick(5100);
    expect(hook.result.current.snapshot?.specVersion).toBe(3);
    byTask.mockResolvedValue(snapshotOf({ specVersion: 4, stages: [{ stage: "prd", state: "review", currentAttemptId: null, currentPackageId: V2, approvedPackageId: null, approval: null }] as never }));
    await tick(5100);
    expect(hook.result.current.snapshot?.stages[0]?.currentPackageId).toBe(V2);
    expect(V2).not.toBe(V1);
  });
  it("IT-136 shows the author's saved answer state on reconnect without any response dispatch", async () => {
    byTask.mockResolvedValue(snapshotOf({ state: "running", pendingInteractions: [] }));
    const hook = mount(snapshotOf({ state: "waiting_question", pendingInteractions: [{ id: "q", attemptId: R1, kind: "question", description: "Qual prazo?", choices: ["a"], targetDigest: null, delivery: "pending" }] as never }));
    await tick(5100);
    expect(hook.result.current.snapshot?.pendingInteractions).toEqual([]);
    expect(vi.mocked(trpc.taskSpec.answer.mutate)).not.toHaveBeenCalled();
  });
  it("deduplicates replayed events and keeps newest-first paging cursors", async () => {
    const item = { id: "e1", sequence: 1, attemptId: R1, kind: "agent_message", payload: { text: "oi", preview: "oi" }, observedAt: "x" };
    events.mockResolvedValue({ items: [item], nextCursor: "n", hasMore: false } as never);
    const hook = mount();
    await tick(2200);
    expect(hook.result.current.events.entries.filter((entry) => entry.id === "e1")).toHaveLength(1);
  });
});
