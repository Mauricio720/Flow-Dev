import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET, optionsOf, overviewOf, packageOf, planOf, runsOf } from "@/test/taskFlow";
import { UnifiedSpecStage } from "./UnifiedSpecStage";
import type { FlowAction, FlowOverview } from "./unifiedContract";

const flow = trpc.taskFlow;
const OPEN = { name: "Considerar a Issue concluída" };
const CONFIRM = { name: "Confirmar conclusão" };
const APPROVED_AT = "2026-10-06T12:00:00.000Z";
const CONCLUDED_AT = "2026-10-09T12:00:00.000Z";
const REVIEW_ID = "a4";

function stepOf(position: number, overrides: Partial<FlowAction>): FlowAction {
  return { ...planOf("succeeded").actions[0]!, id: `a${position}`, position, ...overrides } as FlowAction;
}

function reviewedOverview(review: Partial<FlowAction>): FlowOverview {
  const actions = [
    stepOf(1, {}),
    stepOf(2, { kind: "create_tasks" }),
    stepOf(3, { kind: "loop", loopName: "implement-tasks", loopVersion: "1" }),
    stepOf(4, { kind: "loop", loopName: "review-and-fix", loopVersion: "1", ...review }),
  ];
  const packages = [packageOf({ status: "approved", approvedAt: APPROVED_AT }), packageOf({ id: "k2", format: "os_tasks_v1", status: "approved", approvedAt: APPROVED_AT })];
  return overviewOf({ plan: { ...planOf(), actions }, packages });
}

function renderReview(overview: FlowOverview, canAct = true) {
  vi.mocked(flow.byTask.query).mockResolvedValue(overview);
  vi.mocked(flow.options.query).mockResolvedValue(optionsOf());
  vi.mocked(flow.runs.query).mockResolvedValue(runsOf());
  return render(<UnifiedSpecStage target={FLOW_TARGET} initial={overview} canAct={canAct} />);
}

describe("concluding the flow after a failed Review", () => {
  it("asks for confirmation before concluding and sends the Review action", async () => {
    vi.mocked(flow.concludeReview.mutate).mockResolvedValue({ actionId: REVIEW_ID, state: "succeeded", concludedAt: CONCLUDED_AT });
    renderReview(reviewedOverview({ state: "failed" }));
    await userEvent.click(await screen.findByRole("button", OPEN));
    expect(flow.concludeReview.mutate).not.toHaveBeenCalled();
    expect(screen.getByText(/o Review não poderá mais ser retomado/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", CONFIRM));
    await waitFor(() => expect(flow.concludeReview.mutate).toHaveBeenCalledWith({ ...FLOW_TARGET, actionId: REVIEW_ID, expectedRevision: 1 }));
  });

  it("lets the operator back out without concluding", async () => {
    renderReview(reviewedOverview({ state: "failed" }));
    await userEvent.click(await screen.findByRole("button", OPEN));
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.queryByRole("button", CONFIRM)).toBeNull();
    expect(flow.concludeReview.mutate).not.toHaveBeenCalled();
  });

  it("does not offer the conclusion to readers", async () => {
    renderReview(reviewedOverview({ state: "failed" }), false);
    expect(await screen.findByText(/Somente leitura/)).toBeTruthy();
    expect(screen.queryByRole("button", OPEN)).toBeNull();
  });

  it("says the operator concluded the flow once the Review was closed that way", async () => {
    renderReview(reviewedOverview({ state: "succeeded", concludedAt: CONCLUDED_AT }));
    expect(await screen.findByText(/O fluxo foi concluído pela pessoa operadora sem uma rodada limpa de Review/)).toBeTruthy();
    expect(screen.queryByRole("button", OPEN)).toBeNull();
  });
});
