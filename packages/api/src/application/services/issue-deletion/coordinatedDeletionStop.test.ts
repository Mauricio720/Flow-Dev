import { describe, expect, it, vi } from "vitest";
import { CoordinatedDeletionStop } from "./coordinatedDeletionStop";

function dao(remaining: { operations: string[]; runs: string[]; specs: string[]; reviewSessions: string[] }) {
  return {
    cancelTaskWork: vi.fn(async () => []),
    remainingActiveWork: vi.fn(async () => remaining),
  };
}

describe("CoordinatedDeletionStop", () => {
  it("reports stopped when canceling leaves no active work", async () => {
    const data = dao({ operations: [], runs: [], specs: [], reviewSessions: [] });
    const stop = new CoordinatedDeletionStop({ dao: data as never, log: { info: vi.fn(), error: vi.fn() } });
    const outcome = await stop.stopTask("t1", "op1");
    expect(outcome).toEqual({ workStopped: true, reason: null });
    expect(data.cancelTaskWork).toHaveBeenCalledWith("t1", "op1");
  });

  it.each([
    { operations: ["o1"], runs: [], specs: [], reviewSessions: [] },
    { operations: [], runs: ["r1"], specs: [], reviewSessions: [] },
    { operations: [], runs: [], specs: ["s1"], reviewSessions: [] },
    { operations: [], runs: [], specs: [], reviewSessions: ["session-1"] },
  ])("keeps the stop uncertain while work remains active (%o)", async (remaining) => {
    const stop = new CoordinatedDeletionStop({ dao: dao(remaining) as never, log: { info: vi.fn(), error: vi.fn() } });
    const outcome = await stop.stopTask("t1", "op1");
    expect(outcome).toEqual({ workStopped: false, reason: "unknown_stop" });
  });
});
