import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { A, CART_PROJECT, NOW, decisionOf, planningOf, publishedDetail } from "@/test/tasks";
import { snapshotOf } from "@/test/work";
import type { TaskExecutionStatus } from "../execution/executionTypes";
import { OperatorStages } from "./OperatorStages";

const executionApi = vi.mocked(trpc.taskExecution, true);
const approvedDetail = { ...publishedDetail(), planning: planningOf({ status: "approved", eligibility: { canStart: true, reason: null }, decision: decisionOf({ selectedRoute: "direct_execution", status: "approved", approvedAt: NOW, approvedByUserId: A }) }) };
const emptyStatus = { canStart: true, startBlockedBy: null, current: null, history: [] } as TaskExecutionStatus;
const activeStatus = { canStart: false, startBlockedBy: null, current: { executionId: "execution-1", route: "direct_execution", state: "in_progress", attempt: 1, branch: "flow-dev/e2e", agent: "code_implementer", runAttempt: 1, review: null, blocks: [], attention: null, failureCode: null, failureDetail: null, specRound: 0, pullRequestUrl: null, compozyTaskIdentifiers: ["FD-E2E-1-impl"], lastSyncedAt: NOW, compozyReachable: true }, history: [] } as unknown as TaskExecutionStatus;

function renderStages(status: TaskExecutionStatus, detail = approvedDetail) {
  executionApi.status.query.mockResolvedValue(status);
  render(<OperatorStages project={CART_PROJECT} snapshot={snapshotOf({}, detail)} refresh={async () => {}} onFailure={vi.fn()} />);
}

describe("OperatorStages execution tab", () => {
  it("shows execution after planning is approved", async () => {
    renderStages(emptyStatus);
    const tab = screen.getByRole("tab", { name: /Execução/ });
    expect(tab.getAttribute("aria-selected")).toBe("true");
    await userEvent.click(tab);
    expect(screen.getByText("Pronta para executar no CompozyOS.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Executar no CompozyOS" })).toBeTruthy();
  });

  it("shows a recorded execution before planning reaches approval", async () => {
    renderStages(activeStatus, { ...approvedDetail, planning: planningOf({ status: "review", decision: decisionOf() }) });
    await userEvent.click(await screen.findByRole("tab", { name: /Execução/ }));
    expect(screen.getByText("Em execução")).toBeTruthy();
    expect(screen.getByText("Agente: code_implementer · Tentativa 1")).toBeTruthy();
  });
});
