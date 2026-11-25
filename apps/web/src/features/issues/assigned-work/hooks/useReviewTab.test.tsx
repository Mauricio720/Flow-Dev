import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detailWith } from "@/test/execution";
import { cycleOf, reviewOf } from "@/test/review";
import { timelineOf } from "@/test/session";
import { taskApi } from "@/test/taskApi";
import { useReviewTab } from "./useReviewTab";

const reviewApi = taskApi.review;
const POLL_MS = 3_000;

function Host() {
  const { tab } = useReviewTab({ detail: detailWith([]), enabled: true, reader: false, refresh: async () => undefined });
  return <>{tab?.panel}</>;
}

async function advance(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

describe("useReviewTab", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    reviewApi.get.query.mockReset().mockResolvedValue(reviewOf(cycleOf({ state: "reviewing" })));
    taskApi.session.timeline.query.mockReset().mockResolvedValue(timelineOf());
  });
  afterEach(() => vi.useRealTimers());

  it("reads the review once per interval even though the tab and the panel share the state", async () => {
    render(<Host />);
    await advance(0);
    expect(reviewApi.get.query).toHaveBeenCalledTimes(1);
    await advance(POLL_MS);
    expect(reviewApi.get.query).toHaveBeenCalledTimes(2);
    await advance(POLL_MS);
    expect(reviewApi.get.query).toHaveBeenCalledTimes(3);
    expect(screen.getByRole("region", { name: "Revisão da feature" })).toBeTruthy();
  });
});
