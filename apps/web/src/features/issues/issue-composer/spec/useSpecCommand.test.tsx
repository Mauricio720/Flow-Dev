import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { callerRejection } from "@/test/tasks";
import { HASH1, TARGET, V1 } from "@/test/spec";
import { clearAllSpecPending, loadSpecPending } from "./specPendingStore";
import { useSpecCommand } from "./useSpecCommand";

const approve = vi.mocked(trpc.taskSpec.approve.mutate);
const submission = vi.mocked(trpc.taskSpec.submission.query);
const receipt = (patch = {}) => ({ commandId: "c", status: "accepted", specVersion: 2, attemptId: null, packageId: V1, reason: null, ...patch }) as never;
const request = { action: "spec.approve" as const, stage: "prd" as const, packageId: V1, manifestHash: HASH1 };
const scope = { viewerId: "user-a", ...TARGET };
const onChanged = vi.fn(async () => undefined);
const onFailure = vi.fn();
const mount = (viewerId = "user-a") => renderHook(() => useSpecCommand({ viewerId, ...TARGET, specVersion: 1, onChanged, onFailure }));

beforeEach(() => { vi.useFakeTimers(); window.sessionStorage.clear(); });
afterEach(() => { vi.useRealTimers(); });

describe("useSpecCommand", () => {
  it("UT-059 keeps an accepted approval pending until an applied receipt is observed", async () => {
    approve.mockResolvedValue(receipt());
    const hook = mount();
    await act(async () => { await hook.result.current.run(request); });
    expect(hook.result.current.command.phase).toBe("awaiting");
    submission.mockResolvedValue({ status: "known", receipt: receipt({ status: "accepted" }) } as never);
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(hook.result.current.command.phase).toBe("awaiting");
    submission.mockResolvedValue({ status: "known", receipt: receipt({ status: "applied" }) } as never);
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(hook.result.current.command.phase).toBe("idle");
    expect(onChanged).toHaveBeenCalled();
    expect(loadSpecPending(scope)).toBeNull();
  });

  it("UT-060 records an uncertain state with the same request key after a lost response and resends it unchanged", async () => {
    approve.mockRejectedValueOnce(new TypeError("fetch failed"));
    const hook = mount();
    await act(async () => { await hook.result.current.run(request); });
    expect(hook.result.current.command.phase).toBe("uncertain");
    const key = hook.result.current.command.pending!.requestKey;
    expect(loadSpecPending(scope)?.requestKey).toBe(key);
    approve.mockResolvedValue(receipt());
    await act(async () => { hook.result.current.resend(); });
    expect(approve).toHaveBeenLastCalledWith(expect.objectContaining({ requestKey: key, expectedSpecVersion: 1 }));
  });

  it("IT-056 creates no approval milestone when the connection fails without an accepted receipt", async () => {
    approve.mockRejectedValue(new TypeError("fetch failed"));
    const hook = mount();
    await act(async () => { await hook.result.current.run(request); });
    expect(hook.result.current.command.phase).toBe("uncertain");
    expect(onChanged).not.toHaveBeenCalled();
    submission.mockResolvedValue({ status: "unknown" } as never);
    await act(async () => { await hook.result.current.reconcile(); });
    expect(hook.result.current.command.phase).toBe("resend");
  });

  it("IT-238 never exposes or resends user A's uncertain payload to user B and clears it on sign out", async () => {
    approve.mockRejectedValue(new TypeError("fetch failed"));
    const first = mount("user-a");
    await act(async () => { await first.result.current.run(request); });
    first.unmount();
    submission.mockResolvedValue({ status: "unknown" } as never);
    const other = mount("user-b");
    expect(other.result.current.command.pending).toBeNull();
    expect(loadSpecPending({ ...scope, viewerId: "user-b" })).toBeNull();
    clearAllSpecPending();
    expect(loadSpecPending(scope)).toBeNull();
  });

  it("maps a stale-version rejection to a conflict that asks for a refresh without a silent retry", async () => {
    approve.mockRejectedValue(callerRejection("CONFLICT", "spec_conflict"));
    const hook = mount();
    await act(async () => { await hook.result.current.run(request); });
    expect(hook.result.current.command.phase).toBe("conflict");
    expect(approve).toHaveBeenCalledTimes(1);
    expect(onChanged).toHaveBeenCalled();
  });

  it("settles a synchronous command such as cancel as soon as it is accepted", async () => {
    vi.mocked(trpc.taskSpec.cancel.mutate).mockResolvedValue(receipt());
    const hook = mount();
    await act(async () => { await hook.result.current.run({ action: "spec.cancel", attemptId: "r1" }); });
    expect(hook.result.current.command.phase).toBe("idle");
  });
});
