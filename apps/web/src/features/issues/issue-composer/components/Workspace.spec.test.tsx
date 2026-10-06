import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { serveTask } from "@/test/taskApi";
import { snapshotOf } from "@/test/spec";
import { decisionOf, loadOf, publishedDetail } from "@/test/tasks";
import { renderWorkspace } from "@/test/workspaceHarness";

const approvedDetail = (canEdit = true, route: "prd" | "tech_spec" | "direct_execution" = "prd") => {
  const base = publishedDetail();
  return { ...base, permissions: { canEdit }, planning: { ...base.planning, status: "approved", decision: decisionOf({ selectedRoute: route, status: "approved" }), eligibility: { canStart: false, reason: null }, permissions: { canStart: false, canRetry: false, canSelectRoute: false, canApprove: false } } } as never;
};
const byTask = vi.mocked(trpc.taskSpec.byTask.query);
const startable = snapshotOf({ state: "not_started", currentStage: null, stages: [], attempt: null, packageCount: 0, eventCursor: null, specVersion: 0, permissions: { isAuthor: true, canStart: true, nextStartableStage: "prd" } } as never);

function open(detail: ReturnType<typeof approvedDetail>, spec = startable) {
  serveTask(detail);
  byTask.mockResolvedValue(spec);
  vi.mocked(trpc.taskSpec.events.query).mockResolvedValue({ items: [], nextCursor: null, hasMore: false } as never);
  const load = { ...loadOf(detail), spec: { kind: "ready" as const, snapshot: spec } };
  return renderWorkspace(load);
}

describe("Spec stage in the workspace", () => {
  it("lets the author start the first stage of the approved route with version 0 and never dispatches on render", async () => {
    vi.mocked(trpc.taskSpec.start.mutate).mockResolvedValue({ commandId: "c", status: "accepted", specVersion: 1, attemptId: "r", packageId: null, reason: null });
    open(approvedDetail());
    const region = await screen.findByRole("region", { name: "Especificação do trabalho" });
    expect(trpc.taskSpec.start.mutate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Iniciar PRD" }));
    await waitFor(() => expect(trpc.taskSpec.start.mutate).toHaveBeenCalledWith(expect.objectContaining({ taskId: expect.any(String), stage: "prd", expectedSpecVersion: 0, requestKey: expect.any(String) })));
    expect(region).toBeTruthy();
  });

  it("shows readers the saved state read-only without any start control", async () => {
    open(approvedDetail(false), snapshotOf({ ...startable, permissions: { isAuthor: false, canStart: false, nextStartableStage: "prd" } } as never));
    await screen.findByRole("region", { name: "Especificação do trabalho" });
    expect(screen.queryByRole("button", { name: /Iniciar/ })).toBeNull();
    expect(screen.getByText(/Somente leitura. Apenas a pessoa autora pode iniciar, responder/)).toBeTruthy();
  });

  it("explains an unsupported route without offering any start", async () => {
    open(approvedDetail(true, "direct_execution"), snapshotOf({ ...startable, route: null, eligibility: { canStart: false, reason: "route_unsupported", route: null, firstStage: null }, blockers: ["route_unsupported"], permissions: { isAuthor: true, canStart: false, nextStartableStage: null } } as never));
    await screen.findByRole("region", { name: "Especificação do trabalho" });
    expect(screen.queryByRole("button", { name: /Iniciar/ })).toBeNull();
    expect(screen.getByText(/não passa por especificação/)).toBeTruthy();
  });

  it("does not render the Spec stage before the planning is approved", () => {
    serveTask(publishedDetail());
    renderWorkspace(loadOf(publishedDetail()));
    expect(screen.queryByRole("region", { name: "Especificação do trabalho" })).toBeNull();
    expect(byTask).not.toHaveBeenCalled();
  });
});
