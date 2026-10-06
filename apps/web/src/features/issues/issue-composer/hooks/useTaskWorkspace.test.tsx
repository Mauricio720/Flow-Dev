import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deferred } from "@/test/projects";
import { taskApi } from "@/test/taskApi";
import { P, P2, T, U, detailOf, loadOf, publishedDetail, summaryOf } from "@/test/tasks";
import type { TaskDetail } from "../contract";
import { useTaskWorkspace } from "./useTaskWorkspace";

type Scope = { projectId: string; taskId: string | null };

const NEW_INTENT = loadOf(null);
const U_DETAIL = detailOf({ task: summaryOf({ id: U, projectId: P2, title: "Tarefa U" }), currentRevision: null });

function pendingTasks() {
  const answers: Record<string, ReturnType<typeof deferred<TaskDetail>>> = { [T]: deferred(), [U]: deferred() };
  taskApi.byId.query.mockImplementation(({ taskId }) => answers[taskId].promise);
  taskApi.messages.query.mockResolvedValue({ items: [], nextCursor: null });
  return answers;
}

function renderWorkspaceHook(initial: Scope) {
  return renderHook((scope: Scope) => useTaskWorkspace({ ...scope, initial: NEW_INTENT, paused: false }), { initialProps: initial });
}

describe("useTaskWorkspace", () => {
  it("UT-052 keeps U visible when the delayed answer for T arrives last", async () => {
    const answers = pendingTasks();
    const { result, rerender } = renderWorkspaceHook({ projectId: P, taskId: null });
    rerender({ projectId: P, taskId: T });
    rerender({ projectId: P, taskId: U });
    await act(async () => answers[U].resolve(U_DETAIL));
    await waitFor(() => expect(result.current.snapshot?.detail.task.id).toBe(U));
    await act(async () => answers[T].resolve(detailOf()));
    expect(result.current).toMatchObject({ phase: "ready", snapshot: { detail: { task: { id: U, title: "Tarefa U" } } } });
  });

  it("UT-131 never lets a result generated for P/T populate P2/U", async () => {
    const answers = pendingTasks();
    const { result, rerender } = renderWorkspaceHook({ projectId: P, taskId: null });
    rerender({ projectId: P, taskId: T });
    rerender({ projectId: P2, taskId: U });
    await act(async () => answers[T].resolve(detailOf()));
    expect(result.current).toMatchObject({ phase: "loading", snapshot: null });
    await act(async () => answers[U].resolve(U_DETAIL));
    await waitFor(() => expect(result.current.snapshot?.detail.task.projectId).toBe(P2));
    expect(result.current.snapshot?.detail.currentRevision).toBeNull();
  });

  it("keeps the confirmed snapshot when a later read fails", async () => {
    taskApi.byId.query.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(() => useTaskWorkspace({ projectId: P, taskId: T, initial: loadOf(detailOf()), paused: false }));
    await act(async () => result.current.refresh());
    expect(result.current).toMatchObject({ phase: "ready", failure: { code: null }, snapshot: { detail: { task: { id: T } } } });
  });

  it("UT-056 schedules no read before the 45 second rate-limit window ends", async () => {
    vi.useFakeTimers();
    const limited = Object.assign(new Error("slow down"), { data: { code: "TOO_MANY_REQUESTS", reason: "provider_rate_limited", retryAfterSeconds: 45 } });
    taskApi.byId.query.mockRejectedValue(limited);
    renderHook(() => useTaskWorkspace({ projectId: P, taskId: T, initial: loadOf(publishedDetail()), paused: false }));
    await act(async () => vi.advanceTimersByTimeAsync(15_000));
    expect(taskApi.byId.query).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(15_000 * 2));
    expect(taskApi.byId.query).toHaveBeenCalledTimes(1);
    taskApi.byId.query.mockResolvedValue(publishedDetail());
    taskApi.messages.query.mockResolvedValue({ items: [], nextCursor: null });
    await act(async () => vi.advanceTimersByTimeAsync(15_000));
    expect(taskApi.byId.query).toHaveBeenCalledTimes(2);
  });
});
