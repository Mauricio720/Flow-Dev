import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { A, NOW, P, T, decisionOf } from "@/test/tasks";
import type { TaskExecutionStatus } from "./executionTypes";
import { useTaskExecution } from "./useTaskExecution";

const api = vi.mocked(trpc.taskExecution, true);
const decision = decisionOf({ status: "approved", approvedAt: NOW, approvedByUserId: A });
const emptyStatus = { canStart: true, startBlockedBy: null, current: null, history: [] } as TaskExecutionStatus;

describe("useTaskExecution", () => {
  it("reuses the idempotency key when retrying an unavailable start", async () => {
    api.status.query.mockResolvedValue(emptyStatus);
    api.start.mutate.mockResolvedValue({ executionId: T, state: "unavailable", replayed: false });
    const { result } = renderHook(() => useTaskExecution({ projectId: P, taskId: T }));
    await act(async () => {
      await result.current.start(decision.id, decision.version, true);
      await result.current.start(decision.id, decision.version, true);
    });
    const first = api.start.mutate.mock.calls[0]![0].idempotencyKey;
    const second = api.start.mutate.mock.calls[1]![0].idempotencyKey;
    expect(second).toBe(first);
  });
});
