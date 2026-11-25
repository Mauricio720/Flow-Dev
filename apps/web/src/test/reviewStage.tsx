import { render, within } from "@testing-library/react";
import { vi } from "vitest";
import { detailWith, sessionOf } from "@/test/execution";
import { EXECUTE_SESSION_ID, REVIEW_SESSION_ID, reviewOf } from "@/test/review";
import { taskApi } from "@/test/taskApi";
import type { ReviewCycleView } from "@/features/issues/assigned-work/reviewContract";
import { ReviewStage } from "@/features/issues/assigned-work/components/ReviewStage";

export const POLL_MS = 3_000;

export function serve(cycle: ReviewCycleView | null) {
  taskApi.review.get.query.mockResolvedValue(reviewOf(cycle));
}

export function mount(sessions = [sessionOf({ id: REVIEW_SESSION_ID, runtime: "flow_dev" }), sessionOf({ id: EXECUTE_SESSION_ID, runtime: "flow_dev" })], reader = false) {
  return render(<ReviewStage detail={detailWith(sessions)} reader={reader} refresh={vi.fn(async () => undefined)} />);
}

export const buttonNames = (root: HTMLElement | Document = document) => within(root as HTMLElement).queryAllByRole("button").map((button) => button.textContent);
