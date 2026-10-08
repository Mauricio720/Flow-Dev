import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { snapshotOf as specSnapshotOf } from "@/test/spec";
import { overviewOf } from "@/test/taskFlow";
import { CART_PROJECT, T, decisionOf, publishedDetail } from "@/test/tasks";
import { snapshotOf } from "@/test/work";
import type { WorkDetailLoad } from "../contract";
import { WorkDetail } from "./WorkDetail";

const byTask = vi.mocked(trpc.taskSpec.byTask.query);
const SELECTION = { stage: null, packageId: null, documentId: null };
const startable = specSnapshotOf({ state: "not_started", currentStage: null, stages: [], attempt: null, packageCount: 0, eventCursor: null, specVersion: 0, permissions: { isAuthor: true, canStart: true, nextStartableStage: "prd" } } as never);

function approvedDetail(route: "prd" | "tech_spec" | "direct_execution" = "prd") {
  const base = publishedDetail();
  const planning = { ...base.planning, status: "approved", decision: decisionOf({ selectedRoute: route, status: "approved" }), eligibility: { canStart: false, reason: null }, permissions: { canStart: false, canRetry: false, canSelectRoute: false, canApprove: false } };
  return { ...base, planning } as never;
}

function open(view: object, spec = startable, route: "prd" | "tech_spec" | "direct_execution" = "prd") {
  byTask.mockResolvedValue(spec);
  vi.mocked(trpc.taskSpec.events.query).mockResolvedValue({ items: [], nextCursor: null, hasMore: false } as never);
  const initial: WorkDetailLoad = { taskId: T, work: { kind: "ready", snapshot: snapshotOf(view, approvedDetail(route)) }, spec: { kind: "ready", snapshot: spec }, specSelection: SELECTION, flow: { kind: "ready", overview: overviewOf({ flow: "legacy" }) } };
  return render(<WorkDetail project={CART_PROJECT} initial={initial} />);
}

describe("Spec stage in the work detail", () => {
  it("lets the operator start the first stage of the approved route with version 0 and never dispatches on render", async () => {
    vi.mocked(trpc.taskSpec.start.mutate).mockResolvedValue({ commandId: "c", status: "accepted", specVersion: 1, attemptId: "r", packageId: null, reason: null });
    open({});
    const region = await screen.findByRole("region", { name: "Especificação do trabalho" });
    expect(trpc.taskSpec.start.mutate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Iniciar PRD" }));
    await waitFor(() => expect(trpc.taskSpec.start.mutate).toHaveBeenCalledWith(expect.objectContaining({ taskId: expect.any(String), stage: "prd", expectedSpecVersion: 0, requestKey: expect.any(String) })));
    expect(region).toBeTruthy();
  });

  it("keeps planning one tab away while the Spec stage is open", async () => {
    open({});
    await screen.findByRole("region", { name: "Especificação do trabalho" });
    expect(screen.queryByRole("region", { name: "Planejamento" })).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: /Planejamento/ }));
    expect(screen.getByRole("region", { name: "Planejamento" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Especificação do trabalho" })).toBeNull();
  });

  it("shows observers the saved state read-only without any start control", async () => {
    open({ viewerCanOperate: false, reason: "operator_required" }, specSnapshotOf({ ...startable, permissions: { isAuthor: false, canStart: false, nextStartableStage: "prd" } } as never));
    await screen.findByRole("region", { name: "Especificação do trabalho" });
    expect(screen.queryByRole("button", { name: /Iniciar/ })).toBeNull();
    expect(screen.getByText(/Somente leitura. Apenas a pessoa operadora pode iniciar, responder/)).toBeTruthy();
  });

  it("explains an unsupported route without offering any start", async () => {
    open({}, specSnapshotOf({ ...startable, route: null, eligibility: { canStart: false, reason: "route_unsupported", route: null, firstStage: null }, blockers: ["route_unsupported"], permissions: { isAuthor: true, canStart: false, nextStartableStage: null } } as never), "direct_execution");
    await screen.findByRole("region", { name: "Especificação do trabalho" });
    expect(screen.queryByRole("button", { name: /Iniciar/ })).toBeNull();
    expect(screen.getByText(/não passa por especificação/)).toBeTruthy();
  });

  it("hides the Spec stage while the source changed since the approved decision", () => {
    open({ sourceChanged: true });
    expect(screen.queryByRole("region", { name: "Especificação do trabalho" })).toBeNull();
  });
});
