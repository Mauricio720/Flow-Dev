import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET, connectionOf, optionsOf, overviewOf, planOf, runOf, runsOf } from "@/test/taskFlow";
import { flowStages } from "./flowStages";
import { UnifiedSpecStage } from "./UnifiedSpecStage";
import type { FlowOverview } from "./unifiedContract";

const flow = trpc.taskFlow;
const machine = connectionOf({ executionTarget: "machine", machineId: "m1" });
const directOptions = optionsOf({ actions: [{ kind: "direct_execute", available: true }], connections: [machine], workspaces: [{ kind: "isolated" }, { kind: "local" }] });

function directPlan(state: string): NonNullable<FlowOverview["plan"]> {
  const plan = planOf(state);
  return { ...plan, actions: plan.actions.map((action) => ({ ...action, kind: "direct_execute", workspace: { kind: "local" } })) } as NonNullable<FlowOverview["plan"]>;
}

function renderDirect(overview: FlowOverview, runs = runsOf()) {
  vi.mocked(flow.byTask.query).mockResolvedValue(overview);
  vi.mocked(flow.options.query).mockResolvedValue(directOptions);
  vi.mocked(flow.runs.query).mockResolvedValue(runs);
  return render(<UnifiedSpecStage target={FLOW_TARGET} initial={overview} canAct direct />);
}

describe("direct execution flow", () => {
  it("replaces the spec stages with a single direct stage", () => {
    expect(flowStages(overviewOf(), true)).toEqual([{ key: "direct", state: "yours" }]);
    expect(flowStages(overviewOf({ plan: directPlan("running") }), true)).toEqual([{ key: "direct", state: "current" }]);
    expect(flowStages(overviewOf({ plan: directPlan("blocked") }), true)).toEqual([{ key: "direct", state: "failed" }]);
    expect(flowStages(overviewOf({ plan: directPlan("succeeded") }), true)).toEqual([{ key: "direct", state: "done" }]);
  });

  it("offers one local-only action and saves it as a direct execution", async () => {
    vi.mocked(flow.savePlan.mutate).mockResolvedValue({ revision: 1, state: "planned", runId: null });
    renderDirect(overviewOf());
    expect(screen.getByRole("heading", { name: "Execução direta", level: 2 })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Tarefas" })).toBeNull();
    const workspace = await screen.findByLabelText("Onde implementar?");
    expect(within(workspace).getAllByRole("option").map((option) => option.textContent)).toEqual(["Projeto local vinculado"]);
    await userEvent.selectOptions(screen.getByLabelText("Conexão"), "c1");
    await userEvent.selectOptions(screen.getByLabelText("Modelo"), "gpt-5.6-sol");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    expect(flow.savePlan.mutate).toHaveBeenCalledWith(expect.objectContaining({ actions: [expect.objectContaining({ kind: "direct_execute", workspace: { kind: "local" } })] }));
  });

  it("explains a routing mismatch reported by the agent", async () => {
    const run = runOf({ kind: "direct_execute", state: "blocked", terminalCode: "routing_mismatch" });
    renderDirect(overviewOf({ plan: directPlan("blocked") }), runsOf([run]));
    const lastAttempt = within(await screen.findByRole("group", { name: "O que aconteceu na última tentativa" }));
    expect(lastAttempt.getByText(/precisa de uma decisão de especificação/)).toBeTruthy();
    expect(screen.getByText("A execução direta parou")).toBeTruthy();
  });
});
