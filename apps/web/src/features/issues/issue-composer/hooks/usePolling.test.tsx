import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { setVisibility } from "@/test/media";
import { taskApi } from "@/test/taskApi";
import { P, T, detailOf, loadOf, publishedDetail, summaryOf } from "@/test/tasks";
import type { TaskDetail } from "../contract";
import { useTaskWorkspace } from "./useTaskWorkspace";

const PENDING_MS = 2_000;
const IDLE_MS = 15_000;
const GENERATING = detailOf({ task: summaryOf({ status: "generating" }), currentRevision: null });

function watch(detail: TaskDetail) {
  vi.useFakeTimers();
  taskApi.byId.query.mockResolvedValue(detail);
  taskApi.messages.query.mockResolvedValue({ items: [], nextCursor: null });
  return renderHook(() => useTaskWorkspace({ projectId: P, taskId: T, initial: loadOf(detail), paused: false }));
}

async function advance(ms: number) {
  await act(async () => vi.advanceTimersByTimeAsync(ms));
}

describe("task polling", () => {
  it("rechecks a pending task every two seconds and an idle one every fifteen", async () => {
    const pending = watch(GENERATING);
    await advance(PENDING_MS * 3);
    expect(taskApi.byId.query).toHaveBeenCalledTimes(3);
    pending.unmount();
    taskApi.byId.query.mockClear();
    watch(detailOf());
    await advance(IDLE_MS - 1);
    expect(taskApi.byId.query).not.toHaveBeenCalled();
    await advance(1);
    expect(taskApi.byId.query).toHaveBeenCalledExactlyOnceWith({ projectId: P, taskId: T });
  });

  it("stays silent while the page is hidden and after unmount", async () => {
    const view = watch(GENERATING);
    act(() => setVisibility("hidden"));
    taskApi.byId.query.mockClear();
    await advance(PENDING_MS * 2);
    expect(taskApi.byId.query).not.toHaveBeenCalled();
    act(() => setVisibility("visible"));
    expect(taskApi.byId.query).toHaveBeenCalledTimes(1);
    view.unmount();
    await advance(PENDING_MS * 2);
    expect(taskApi.byId.query).toHaveBeenCalledTimes(1);
  });

  it("keeps a published task on the idle cadence so planning changes and access loss stay visible", async () => {
    watch(publishedDetail());
    await advance(IDLE_MS * 2);
    expect(taskApi.byId.query).toHaveBeenCalledTimes(2);
  });

  it("does not reread messages while the task version is unchanged", async () => {
    watch(GENERATING);
    await advance(PENDING_MS);
    expect(taskApi.messages.query).not.toHaveBeenCalled();
    taskApi.byId.query.mockResolvedValue(detailOf({ task: summaryOf({ version: 8 }) }));
    await advance(PENDING_MS);
    expect(taskApi.messages.query).toHaveBeenCalledExactlyOnceWith({ projectId: P, taskId: T, cursor: undefined, limit: 100 });
  });
});
