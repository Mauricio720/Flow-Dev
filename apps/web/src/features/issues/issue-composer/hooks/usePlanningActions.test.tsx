import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { taskApi } from "@/test/taskApi";
import { P, T, reviewDetail, summaryOf } from "@/test/tasks";
import { loadPending } from "../planningPendingStore";
import { usePlanningActions } from "./usePlanningActions";

const planningApi = taskApi.planning;
const lostResponse = () => new TypeError("Failed to fetch");
const RECEIPT = { taskId: T, operationId: null, decisionId: null, version: 11, decisionVersion: null };

function mount(onChanged = vi.fn(async () => {})) {
  const detail = reviewDetail();
  const context = { projectId: P, task: summaryOf({ status: "published", version: 10 }), input: { clear: vi.fn() }, onAccepted: vi.fn(), onChanged, onFailure: vi.fn(), planning: detail.planning };
  return { onChanged, view: renderHook(() => usePlanningActions(context)) };
}

describe("usePlanningActions", () => {
  it("UT-046 refreshes authoritative detail before treating a route save as done", async () => {
    const order: string[] = [];
    planningApi.selectRoute.mutate.mockImplementation(async () => { order.push("saved"); return RECEIPT; });
    const { view, onChanged } = mount(vi.fn(async () => { order.push("refreshed"); }));
    await act(async () => { await view.result.current.saveRoute("prd"); });
    expect(order).toEqual(["saved", "refreshed"]);
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(view.result.current.command.phase).toBe("idle");
    expect(planningApi.selectRoute.mutate).toHaveBeenCalledWith(expect.objectContaining({ taskId: T, expectedVersion: 10, expectedDecisionVersion: 1, selectedRoute: "prd" }));
  });

  it("UT-047 enters an uncertain state and blocks approval after a lost response", async () => {
    planningApi.selectRoute.mutate.mockRejectedValue(lostResponse());
    const { view } = mount();
    await act(async () => { await view.result.current.saveRoute("prd"); });
    expect(view.result.current.command.phase).toBe("uncertain");
    expect(view.result.current.approvalBlocked).toBe(true);
    planningApi.submission.query.mockResolvedValue({ status: "not_accepted" });
    await act(async () => { await view.result.current.reconcile(); });
    expect(view.result.current.command.phase).toBe("resend");
    const key = planningApi.selectRoute.mutate.mock.calls[0]![0].requestKey;
    planningApi.selectRoute.mutate.mockResolvedValue(RECEIPT);
    await act(async () => { view.result.current.resend(); });
    expect(planningApi.selectRoute.mutate.mock.calls[1]![0].requestKey).toBe(key);
  });

  it("recovers an accepted lost response through the submission read", async () => {
    planningApi.approve.mutate.mockRejectedValue(lostResponse());
    const { view, onChanged } = mount();
    await act(async () => { await view.result.current.approve(); });
    planningApi.submission.query.mockResolvedValue({ status: "accepted", receipt: RECEIPT });
    await act(async () => { await view.result.current.reconcile(); });
    expect(onChanged).toHaveBeenCalled();
    expect(view.result.current.command.phase).toBe("idle");
  });

  it("clears the success claim and requires a new review after a conflict", async () => {
    planningApi.approve.mutate.mockRejectedValue(Object.assign(new Error("x"), { data: { code: "CONFLICT", reason: "planning_conflict" } }));
    const { view } = mount();
    await act(async () => { await view.result.current.approve(); });
    expect(view.result.current.command).toMatchObject({ phase: "conflict", claimedSaved: false });
    expect(view.result.current.approvalBlocked).toBe(true);
    expect(planningApi.approve.mutate).toHaveBeenCalledTimes(1);
  });

  it("marks the route as dirty only when it differs from the saved selection", () => {
    const { view } = mount();
    act(() => view.result.current.setDraftRoute("prd"));
    expect(view.result.current.dirty).toBe(true);
    act(() => view.result.current.setDraftRoute("tech_spec"));
    expect(view.result.current.dirty).toBe(false);
  });

  it("treats a definitive unconfigured rejection as rejected and clears the pending command", async () => {
    planningApi.start.mutate.mockRejectedValue(Object.assign(new Error("x"), { data: { code: "INTERNAL_SERVER_ERROR", reason: "planning_unconfigured" } }));
    const { view } = mount();
    await act(async () => { await view.result.current.start(); });
    expect(view.result.current.command).toMatchObject({ phase: "rejected", failure: { reason: "planning_unconfigured" } });
    expect(loadPending(T)).toBeNull();
  });

  it("clears the pending command and the draft route after a conflict", async () => {
    planningApi.selectRoute.mutate.mockRejectedValue(Object.assign(new Error("x"), { data: { code: "CONFLICT", reason: "planning_conflict" } }));
    const { view } = mount();
    act(() => view.result.current.setDraftRoute("prd"));
    await act(async () => { await view.result.current.saveRoute("prd"); });
    expect(loadPending(T)).toBeNull();
    act(() => view.result.current.reviewed());
    expect(view.result.current.dirty).toBe(false);
    expect(view.result.current.approvalBlocked).toBe(false);
  });

  it("keeps the pending command after a lost response", async () => {
    planningApi.selectRoute.mutate.mockRejectedValue(lostResponse());
    const { view } = mount();
    await act(async () => { await view.result.current.saveRoute("prd"); });
    expect(loadPending(T)).toMatchObject({ action: "planning.selectRoute", route: "prd" });
  });
});
