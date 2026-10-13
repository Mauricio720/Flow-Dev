import { useState } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET } from "@/test/taskFlow";
import { describeFailure } from "./unifiedReasons";
import { useFlowCommands } from "./useFlowCommands";
import { usePreparationPolling, type Preparation } from "./usePreparationPolling";

describe("local preparation expiry", () => {
  it("rechecks a ready preparation and enables preparation again when the server expires it", async () => {
    vi.useFakeTimers();
    vi.mocked(trpc.taskFlow.localPreparationStatus.query).mockResolvedValue({ preparationId: "p1", state: "expired", safeLabel: "checkout", dirty: null, capabilities: [], manifestHash: null, checkoutDigest: null, requiredGates: [], reason: null, detail: null });
    const onUpdated = vi.fn();
    const { result } = renderHook(() => {
      const [preparations, setPreparations] = useState<Record<string, Preparation>>({ a1: { id: "p1", state: "ready" } });
      usePreparationPolling(FLOW_TARGET, preparations, setPreparations, onUpdated);
      return preparations;
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(trpc.taskFlow.localPreparationStatus.query).toHaveBeenCalledWith({ ...FLOW_TARGET, preparationId: "p1" });
    expect(result.current.a1?.state).toBe("expired");
    expect(onUpdated).toHaveBeenCalledWith("a1", expect.objectContaining({ state: "expired" }));
  });

  it("explains when the server rejects an expired or changed preparation", () => {
    expect(describeFailure({ data: { reason: "preparation_expired" } }).message).toMatch(/expirou.*Prepare/);
    expect(describeFailure({ data: { reason: "preparation_changed" } }).message).toMatch(/mudou.*Prepare/);
  });

  it("invalidates a ready preparation when starting reveals that it expired", async () => {
    vi.useFakeTimers();
    vi.mocked(trpc.taskFlow.prepareLocalAction.mutate).mockResolvedValue({ preparationId: "p1" });
    vi.mocked(trpc.taskFlow.localPreparationStatus.query).mockResolvedValue({ preparationId: "p1", state: "ready", safeLabel: "checkout", dirty: false, capabilities: [], manifestHash: null, checkoutDigest: null, requiredGates: [], reason: null, detail: null });
    vi.mocked(trpc.taskFlow.startAction.mutate).mockRejectedValue({ data: { reason: "preparation_expired" } });
    const { result } = renderHook(() => useFlowCommands(FLOW_TARGET, async () => undefined));
    await act(async () => { await result.current.prepareLocalAction({ actionId: "a1", expectedRevision: 1 }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(result.current.preparations.a1?.state).toBe("ready");
    await act(async () => { await result.current.startAction({ actionId: "a1", expectedRevision: 1, preparationId: "p1" }); });
    expect(result.current.preparations.a1?.state).toBe("expired");
    expect(result.current.notice?.text).toMatch(/expirou.*Prepare/);
  });
});
