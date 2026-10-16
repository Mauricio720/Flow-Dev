import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET, connectionOf, optionsOf, overviewOf, planOf, runsOf } from "@/test/taskFlow";
import { UnifiedSpecStage } from "./UnifiedSpecStage";
import type { FlowOverview } from "./unifiedContract";

const flow = trpc.taskFlow;
const machine = connectionOf({ executionTarget: "machine", machineId: "m1" });
const directOptions = optionsOf({ actions: [{ kind: "direct_execute", available: true }, { kind: "open_pull_request", available: true }], connections: [machine], workspaces: [{ kind: "isolated" }, { kind: "local" }] });

function directOverview(state: string, concludedAt: string | null = null): FlowOverview {
  const plan = planOf("succeeded");
  const actions = plan.actions.map((action) => ({ ...action, kind: "direct_execute", workspace: { kind: "local" }, state, concludedAt }));
  return overviewOf({ plan: { ...plan, actions } as never });
}

function renderDirect(overview: FlowOverview) {
  vi.mocked(flow.byTask.query).mockResolvedValue(overview);
  vi.mocked(flow.options.query).mockResolvedValue(directOptions);
  vi.mocked(flow.runs.query).mockResolvedValue(runsOf());
  return render(<UnifiedSpecStage target={FLOW_TARGET} initial={overview} canAct direct />);
}

describe("pull request after a direct execution", () => {
  it("opens the Pull Request stage without a Review once the direct execution succeeded", async () => {
    vi.mocked(flow.savePlan.mutate).mockResolvedValue({ revision: 2, state: "planned", runId: null });
    renderDirect(directOverview("succeeded"));
    expect(screen.getByRole("tab", { selected: true }).textContent).toContain("Pull Request");
    expect(screen.getByRole("heading", { name: "Abra a Pull Request" })).toBeTruthy();
    await userEvent.click(await screen.findByRole("button", { name: "Adicionar Abrir Pull Request" }));
    await userEvent.selectOptions(screen.getByLabelText("Conexão"), "c1");
    await userEvent.selectOptions(screen.getByLabelText("Modelo"), "gpt-5.6-sol");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    const saved = vi.mocked(flow.savePlan.mutate).mock.calls[0]![0];
    expect(saved.actions.map((action) => action.kind)).toEqual(["direct_execute", "open_pull_request"]);
  });

  it("releases the Pull Request after the operator accepted a partial result", () => {
    renderDirect(directOverview("succeeded", "2026-10-15T21:20:00.000Z"));
    expect(screen.getByRole("heading", { name: "Abra a Pull Request" })).toBeTruthy();
  });

  it("keeps the Pull Request closed while the direct execution is stopped", () => {
    renderDirect(directOverview("blocked"));
    expect(screen.getByRole("tab", { selected: true }).textContent).toContain("Execução direta");
    expect(screen.queryByRole("button", { name: "Adicionar Abrir Pull Request" })).toBeNull();
  });
});
