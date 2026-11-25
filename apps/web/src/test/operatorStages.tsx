import { act, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { sessionOf } from "@/test/execution";
import { CART_PROJECT, approvedDetail } from "@/test/tasks";
import { snapshotOf } from "@/test/work";
import type { TaskDetail } from "@/features/issues/assigned-work/contract";
import { OperatorStages } from "@/features/issues/assigned-work/components/OperatorStages";

export const taskSetGet = vi.mocked(trpc.tasks.taskSet.get.query);
export const reviewGet = vi.mocked(trpc.tasks.review.get.query);
export const running = () => sessionOf({ status: "running", runtime: "terminal" });
export const withSessions = (sessions: ReturnType<typeof sessionOf>[]): TaskDetail => ({ ...approvedDetail(), execution: { sessions, artifacts: [] } });
export const tabNames = () => screen.getAllByRole("tab").map((tab) => tab.textContent);
export const selectedTab = () => screen.getAllByRole("tab").find((tab) => tab.getAttribute("aria-selected") === "true")?.textContent;

export async function mountStages(detail: TaskDetail, viewerCanOperate = true) {
  render(<OperatorStages project={CART_PROJECT} snapshot={snapshotOf({ viewerCanOperate }, detail)} refresh={async () => undefined} onFailure={() => undefined} />);
  await act(async () => undefined);
}
