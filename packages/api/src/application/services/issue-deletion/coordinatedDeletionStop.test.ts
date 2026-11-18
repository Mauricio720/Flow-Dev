import { describe, expect, it, vi } from "vitest";
import { CoordinatedDeletionStop } from "./coordinatedDeletionStop";

function dao(remaining: { operations: string[]; runs: string[]; specs: string[] }) {
  return {
    cancelTaskWork: vi.fn(async () => {}),
    remainingActiveWork: vi.fn(async () => remaining),
  };
}

describe("CoordinatedDeletionStop", () => {
  it("reports stopped when canceling leaves no active work", async () => {
    const data = dao({ operations: [], runs: [], specs: [] });
    const stop = new CoordinatedDeletionStop({ dao: data as never });
    const outcome = await stop.stopTask("t1", "op1");
    expect(outcome).toEqual({ workStopped: true, reason: null });
    expect(data.cancelTaskWork).toHaveBeenCalledWith("t1", "op1");
  });

  it.each([
    { operations: ["o1"], runs: [], specs: [] },
    { operations: [], runs: ["r1"], specs: [] },
    { operations: [], runs: [], specs: ["s1"] },
  ])("keeps the stop uncertain while work remains active (%o)", async (remaining) => {
    const stop = new CoordinatedDeletionStop({ dao: dao(remaining) as never });
    const outcome = await stop.stopTask("t1", "op1");
    expect(outcome).toEqual({ workStopped: false, reason: "unknown_stop" });
  });
});
