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
  it("replaces the spec stages with the direct stage and its Pull Request", () => {
    expect(flowStages(overviewOf(), true)).toEqual([{ key: "direct", state: "yours" }, { key: "pull_request", state: "pending" }]);
    expect(flowStages(overviewOf({ plan: directPlan("running") }), true)).toEqual([{ key: "direct", state: "current" }, { key: "pull_request", state: "pending" }]);
    expect(flowStages(overviewOf({ plan: directPlan("blocked") }), true)).toEqual([{ key: "direct", state: "failed" }, { key: "pull_request", state: "pending" }]);
    expect(flowStages(overviewOf({ plan: directPlan("succeeded") }), true)).toEqual([{ key: "direct", state: "done" }, { key: "pull_request", state: "yours" }]);
  });

  it("lets the operator accept a partial result and release the Pull Request", async () => {
    vi.mocked(flow.acceptPartialDirect.mutate).mockResolvedValue({ actionId: "a1", state: "succeeded", concludedAt: "2026-10-15T21:20:00.000Z" });
    renderDirect(overviewOf({ plan: directPlan("blocked") }), runsOf([runOf({ kind: "direct_execute", state: "blocked", terminalCode: "direct_partial" })]));
    await userEvent.click(await screen.findByRole("button", { name: "Aceitar o resultado parcial" }));
    await userEvent.click(screen.getByRole("button", { name: "Aceitar e liberar a Pull Request" }));
    expect(flow.acceptPartialDirect.mutate).toHaveBeenCalledWith(expect.objectContaining({ ...FLOW_TARGET, actionId: "a1", expectedRevision: 1 }));
  });

  it("does not offer to accept a direct execution that stopped for another reason", async () => {
    renderDirect(overviewOf({ plan: directPlan("blocked") }), runsOf([runOf({ kind: "direct_execute", state: "blocked", terminalCode: "direct_blocked" })]));
    expect(await screen.findByText("A execução direta parou")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Aceitar o resultado parcial" })).toBeNull();
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

  it("offers the direct action again after a replan left the plan without actions", async () => {
    vi.mocked(flow.savePlan.mutate).mockResolvedValue({ revision: 3, state: "planned", runId: null });
    renderDirect(overviewOf({ plan: { ...directPlan("planned"), revision: 2, actions: [] } }));
    await userEvent.selectOptions(await screen.findByLabelText("Conexão"), "c1");
    await userEvent.selectOptions(screen.getByLabelText("Modelo"), "gpt-5.6-sol");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    expect(flow.savePlan.mutate).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 2, actions: [expect.objectContaining({ kind: "direct_execute", workspace: { kind: "local" } })] }));
  });

  it("explains a routing mismatch reported by the agent", async () => {
    const run = runOf({ kind: "direct_execute", state: "blocked", terminalCode: "routing_mismatch" });
    renderDirect(overviewOf({ plan: directPlan("blocked") }), runsOf([run]));
    const lastAttempt = within(await screen.findByRole("group", { name: "O que aconteceu na última tentativa" }));
    expect(lastAttempt.getByText(/precisa de uma decisão de especificação/)).toBeTruthy();
    expect(screen.getByText("A execução direta parou")).toBeTruthy();
  });

  it("lets the operator replan after the direct execution stopped", async () => {
    const onReplan = vi.fn();
    vi.mocked(flow.byTask.query).mockResolvedValue(overviewOf({ plan: directPlan("blocked") }));
    vi.mocked(flow.options.query).mockResolvedValue(directOptions);
    vi.mocked(flow.runs.query).mockResolvedValue(runsOf([runOf({ kind: "direct_execute", state: "blocked", terminalCode: "routing_mismatch" })]));
    render(<UnifiedSpecStage target={FLOW_TARGET} initial={overviewOf({ plan: directPlan("blocked") })} canAct direct replan={{ busy: false, onReplan }} />);
    await userEvent.click(await screen.findByRole("button", { name: "Refazer planejamento" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar novo planejamento" }));
    expect(onReplan).toHaveBeenCalledOnce();
  });
});
