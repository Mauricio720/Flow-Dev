import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cycleOf, reviewOf } from "@/test/review";
import { taskApi } from "@/test/taskApi";
import { P, T } from "@/test/tasks";
import { REVIEW_LOAD_FAILED } from "../reviewCopy";
import { useReviewStage } from "./useReviewStage";

const reviewApi = taskApi.review;
const POLL_MS = 3_000;
const SCOPE = { projectId: P, taskId: T };

async function advance(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

describe("useReviewStage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    reviewApi.get.query.mockReset();
    reviewApi.request.mutate.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it("V-09a reads again at 3 000 ms and 6 000 ms and shows the change to executing", async () => {
    reviewApi.get.query.mockResolvedValueOnce(reviewOf(cycleOf({ state: "reviewing" }))).mockResolvedValueOnce(reviewOf(cycleOf({ state: "reviewing" }))).mockResolvedValue(reviewOf(cycleOf({ state: "executing" })));
    const { result } = renderHook(() => useReviewStage(SCOPE));
    await advance(0);
    expect(reviewApi.get.query).toHaveBeenCalledTimes(1);
    await advance(POLL_MS);
    expect(reviewApi.get.query).toHaveBeenCalledTimes(2);
    expect(result.current.view?.cycle?.state).toBe("reviewing");
    await advance(POLL_MS);
    expect(reviewApi.get.query).toHaveBeenCalledTimes(3);
    expect(result.current.view?.cycle?.state).toBe("executing");
  });

  it("V-09b stops reading once the cycle is final", async () => {
    reviewApi.get.query.mockResolvedValue(reviewOf(cycleOf({ state: "approved" })));
    renderHook(() => useReviewStage(SCOPE));
    await advance(0);
    await advance(POLL_MS * 3);
    expect(reviewApi.get.query).toHaveBeenCalledTimes(1);
  });

  it("V-09c reads right after a request resolves", async () => {
    reviewApi.get.query.mockResolvedValue(reviewOf(cycleOf({ state: "reviewing" })));
    reviewApi.request.mutate.mockResolvedValue(cycleOf({ pendingAction: "stop" }));
    const { result } = renderHook(() => useReviewStage(SCOPE));
    await advance(0);
    await act(async () => { await result.current.request("cycle-1", 4, "stop"); });
    expect(reviewApi.request.mutate).toHaveBeenCalledWith({ ...SCOPE, cycleId: "cycle-1", revision: 4, action: "stop" });
    expect(reviewApi.get.query).toHaveBeenCalledTimes(2);
  });

  it("V-09d shows the stage read error and clears it when the next read succeeds", async () => {
    reviewApi.get.query.mockRejectedValueOnce(new Error("boom")).mockResolvedValue(reviewOf(cycleOf({ state: "reviewing" })));
    const { result } = renderHook(() => useReviewStage(SCOPE));
    await advance(0);
    expect(result.current.failure).toBe(REVIEW_LOAD_FAILED);
    await advance(POLL_MS);
    expect(result.current.failure).toBeNull();
    expect(result.current.view?.cycle?.state).toBe("reviewing");
  });
});
