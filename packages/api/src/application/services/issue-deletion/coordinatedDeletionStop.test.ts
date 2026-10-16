import { describe, expect, it, vi } from "vitest";
import { CoordinatedDeletionStop } from "./coordinatedDeletionStop";
import type { RunCancelPort } from "./deletionStop";

function dao(sequence: { operations: string[]; runs: string[]; specs: string[] }[]) {
  let call = -1;
  return {
    cancelTaskWork: vi.fn(async () => {}),
    remainingActiveWork: vi.fn(async () => { call += 1; return sequence[Math.min(call, sequence.length - 1)]!; }),
  };
}

describe("CoordinatedDeletionStop", () => {
  it("UT-013 old-run acknowledgement does not stop the current run", async () => {
    const runs: RunCancelPort = { cancelActiveRuns: vi.fn(async () => [{ runId: "r1", state: "canceled", terminalCode: null }]) };
    const data = dao([{ operations: [], runs: ["r2"], specs: [] }, { operations: [], runs: ["r2"], specs: [] }]);
    const stop = new CoordinatedDeletionStop({ dao: data as never, runs });
    const outcome = await stop.stopTask("t1", "op1");
    expect(outcome.workStopped).toBe(false);
    expect(outcome.reason).toBe("unknown_stop");
    expect(runs.cancelActiveRuns).toHaveBeenCalledOnce();
  });

  it("UT-014 already-terminal current run requires no second cancellation", async () => {
    const runs: RunCancelPort = { cancelActiveRuns: vi.fn(async () => []) };
    const data = dao([{ operations: [], runs: [], specs: [] }]);
    const stop = new CoordinatedDeletionStop({ dao: data as never, runs });
    const outcome = await stop.stopTask("t1", "op1");
    expect(outcome.workStopped).toBe(true);
    expect(outcome.reason).toBeNull();
    expect(runs.cancelActiveRuns).not.toHaveBeenCalled();
  });

  it("reports stopped after canceling queued operations and settling runs", async () => {
    const runs: RunCancelPort = { cancelActiveRuns: vi.fn(async () => [{ runId: "r2", state: "canceled", terminalCode: "user_canceled" }]) };
    const data = dao([{ operations: [], runs: ["r2"], specs: [] }, { operations: [], runs: [], specs: [] }]);
    const stop = new CoordinatedDeletionStop({ dao: data as never, runs });
    const outcome = await stop.stopTask("t1", "op1");
    expect(outcome.workStopped).toBe(true);
  });

  it("reports unknown_stop when run cancellation cannot terminate a run", async () => {
    const runs: RunCancelPort = { cancelActiveRuns: vi.fn(async () => [{ runId: "r2", state: "reconciling", terminalCode: null }]) };
    const data = dao([{ operations: [], runs: ["r2"], specs: [] }, { operations: [], runs: ["r2"], specs: [] }]);
    const stop = new CoordinatedDeletionStop({ dao: data as never, runs });
    const outcome = await stop.stopTask("t1", "op1");
    expect(outcome.workStopped).toBe(false);
    expect(outcome.reason).toBe("unknown_stop");
  });

  it("without a run cancel port any active run keeps the stop uncertain", async () => {
    const data = dao([{ operations: [], runs: ["r2"], specs: [] }]);
    const stop = new CoordinatedDeletionStop({ dao: data as never });
    const outcome = await stop.stopTask("t1", "op1");
    expect(outcome.workStopped).toBe(false);
    expect(outcome.reason).toBe("unknown_stop");
  });
});
