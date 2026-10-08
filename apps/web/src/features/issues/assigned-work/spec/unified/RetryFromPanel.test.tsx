import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET, connectionOf, optionsOf, overviewOf, planOf, runsOf } from "@/test/taskFlow";
import { UnifiedSpecStage } from "./UnifiedSpecStage";
import type { FlowOverview } from "./unifiedContract";

const flow = trpc.taskFlow;
const RETRY = { name: "Tentar de novo" };
const SLOW_REFRESH_MS = 3000;
const started = { runId: "r2", actionId: "a1", state: "queued", replayed: false };

function failedOverview(workspaceKind: "isolated" | "local"): FlowOverview {
  const plan = planOf("failed");
  return overviewOf({ plan: { ...plan, actions: plan.actions.map((action) => ({ ...action, workspace: { kind: workspaceKind } })) } });
}

function renderFailed(overview: FlowOverview, localConnections = false) {
  vi.mocked(flow.byTask.query).mockResolvedValue(overview);
  const target = localConnections ? { executionTarget: "machine" as const, machineId: "m1" } : {};
  vi.mocked(flow.options.query).mockResolvedValue(optionsOf({ workspaces: [{ kind: "isolated" }, { kind: "local" }], connections: [connectionOf({ ...target }), connectionOf({ ...target, id: "c2", label: "Codex reserva" })] }));
  vi.mocked(flow.runs.query).mockResolvedValue(runsOf());
  vi.mocked(flow.retryAction.mutate).mockResolvedValue(started);
  return render(<UnifiedSpecStage target={FLOW_TARGET} initial={overview} canAct />);
}

describe("retrying a failed action from the current-state panel", () => {
  it("retries a host action in one click", async () => {
    renderFailed(failedOverview("isolated"));
    await userEvent.click(await screen.findByRole("button", RETRY));
    await waitFor(() => expect(flow.retryAction.mutate).toHaveBeenCalledWith(expect.objectContaining({ ...FLOW_TARGET, actionId: "a1", expectedRevision: 1 })));
    expect(flow.prepareLocalAction.mutate).not.toHaveBeenCalled();
  });

  it("lets the operator switch connection before retrying a failed host action", async () => {
    renderFailed(failedOverview("isolated"));
    await userEvent.click(await screen.findByRole("button", { name: "Trocar runtime e retomar" }));
    const agent = within(screen.getByRole("group", { name: "Agente" }));
    await userEvent.selectOptions(agent.getByLabelText("Conexão"), "c2");
    await userEvent.selectOptions(agent.getByLabelText("Modelo"), "gpt-5.6-sol");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar com estes runtimes" }));
    await waitFor(() => expect(flow.retryAction.mutate).toHaveBeenCalledWith(expect.objectContaining({ runtimeBindings: { main: expect.objectContaining({ connectionId: "c2", providerId: "codex", modelId: "gpt-5.6-sol" }) } })));
  });

  it("prepares the linked local project first and starts the retry once it is ready", async () => {
    vi.mocked(flow.prepareLocalAction.mutate).mockResolvedValue({ preparationId: "p1" });
    vi.mocked(flow.localPreparationStatus.query).mockResolvedValue({ preparationId: "p1", state: "ready", safeLabel: "shop", dirty: false, capabilities: [], manifestHash: null, checkoutDigest: null, requiredGates: [], reason: null, detail: null });
    renderFailed(failedOverview("local"), true);
    await userEvent.click(await screen.findByRole("button", { name: "Trocar runtime e retomar" }));
    const agent = within(screen.getByRole("group", { name: "Agente" }));
    await userEvent.selectOptions(agent.getByLabelText("Conexão"), "c2");
    await userEvent.selectOptions(agent.getByLabelText("Modelo"), "gpt-5.6-sol");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar com estes runtimes" }));
    expect(flow.prepareLocalAction.mutate).toHaveBeenCalledWith(expect.objectContaining({ ...FLOW_TARGET, actionId: "a1", expectedRevision: 1, runtimeBindings: { main: expect.objectContaining({ connectionId: "c2" }) } }));
    expect(flow.retryAction.mutate).not.toHaveBeenCalled();
    await waitFor(() => expect(flow.retryAction.mutate).toHaveBeenCalledWith(expect.objectContaining({ actionId: "a1", expectedRevision: 1, preparationId: "p1", runtimeBindings: { main: expect.objectContaining({ connectionId: "c2" }) } })), { timeout: 4000 });
  });

  it("does not start anything when the local preparation is refused", async () => {
    vi.mocked(flow.prepareLocalAction.mutate).mockResolvedValue({ preparationId: "p1" });
    vi.mocked(flow.localPreparationStatus.query).mockResolvedValue({ preparationId: "p1", state: "blocked", safeLabel: "shop", dirty: null, capabilities: [], manifestHash: null, checkoutDigest: null, requiredGates: [], reason: "runtime_incompatible", detail: "CompozyOS local incompatível: esperado 0.3.0-beta.29" });
    renderFailed(failedOverview("local"), true);
    await userEvent.click(await screen.findByRole("button", RETRY));
    expect(await screen.findByText(/CompozyOS local incompatível: esperado/, undefined, { timeout: 4000 })).toBeTruthy();
    expect(flow.retryAction.mutate).not.toHaveBeenCalled();
  });

  it("still starts the retry when the preparation finishes before the page refresh does", async () => {
    vi.mocked(flow.prepareLocalAction.mutate).mockResolvedValue({ preparationId: "p1" });
    vi.mocked(flow.localPreparationStatus.query).mockResolvedValue({ preparationId: "p1", state: "ready", safeLabel: "shop", dirty: false, capabilities: [], manifestHash: null, checkoutDigest: null, requiredGates: [], reason: null, detail: null });
    const overview = failedOverview("local");
    renderFailed(overview, true);
    const retry = await screen.findByRole("button", RETRY);
    vi.mocked(flow.byTask.query).mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(overview), SLOW_REFRESH_MS)));
    await userEvent.click(retry);
    await waitFor(() => expect(flow.retryAction.mutate).toHaveBeenCalledWith(expect.objectContaining({ actionId: "a1", preparationId: "p1" })), { timeout: 7000 });
  }, 10_000);

  it("moves a failed host action to the linked local project before preparing it", async () => {
    vi.mocked(flow.moveAction.mutate).mockResolvedValue({ revision: 2 });
    vi.mocked(flow.prepareLocalAction.mutate).mockResolvedValue({ preparationId: "p1" });
    const overview = failedOverview("isolated");
    vi.mocked(flow.byTask.query).mockResolvedValue(overview);
    vi.mocked(flow.options.query).mockResolvedValue(optionsOf({ workspaces: [{ kind: "isolated" }, { kind: "local" }], connections: [connectionOf(), connectionOf({ id: "m1", label: "Codex local", executionTarget: "machine", machineId: "m1" })] }));
    vi.mocked(flow.runs.query).mockResolvedValue(runsOf());
    render(<UnifiedSpecStage target={FLOW_TARGET} initial={overview} canAct />);
    await userEvent.click(await screen.findByRole("button", { name: "Trocar runtime e retomar" }));
    await userEvent.selectOptions(screen.getByLabelText("Onde executar"), "local");
    const agent = within(screen.getByRole("group", { name: "Agente" }));
    expect(agent.queryByRole("option", { name: "Codex principal" })).toBeNull();
    await userEvent.selectOptions(agent.getByLabelText("Conexão"), "m1");
    await userEvent.selectOptions(agent.getByLabelText("Modelo"), "gpt-5.6-sol");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar com estes runtimes" }));
    await waitFor(() => expect(flow.moveAction.mutate).toHaveBeenCalledWith({ ...FLOW_TARGET, actionId: "a1", expectedRevision: 1, workspace: { kind: "local" }, runtimeBindings: { main: expect.objectContaining({ connectionId: "m1", providerId: "codex" }) } }));
    await waitFor(() => expect(flow.prepareLocalAction.mutate).toHaveBeenCalledWith(expect.objectContaining({ actionId: "a1", expectedRevision: 2 })));
    expect(vi.mocked(flow.prepareLocalAction.mutate).mock.calls[0]?.[0]).not.toHaveProperty("runtimeBindings");
  });
});
