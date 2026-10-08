import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET, connectionOf, optionsOf, overviewOf, planOf, runOf, runsOf } from "@/test/taskFlow";
import { UnifiedSpecStage } from "./UnifiedSpecStage";
import type { FlowOptions, FlowOverview, FlowRuns } from "./unifiedContract";

const flow = trpc.taskFlow;
const LOOP = { name: "implement-tasks", version: "3", source: "bundled", description: "Implementa as tarefas", offerable: true, reason: null, inputs: [{ name: "focus", kind: "string", required: true, hasDefault: false }], runtimeRoles: ["backend_runtime", "frontend_runtime"], requires: ["tasks_approved"] };

function serve(overview: FlowOverview, options: FlowOptions, runs: FlowRuns = runsOf()) {
  vi.mocked(flow.byTask.query).mockResolvedValue(overview);
  vi.mocked(flow.options.query).mockResolvedValue(options);
  vi.mocked(flow.runs.query).mockResolvedValue(runs);
  return render(<UnifiedSpecStage target={FLOW_TARGET} initial={overview} canAct />);
}

async function openImplementation() {
  await userEvent.click(screen.getByRole("tab", { name: /Implementação/ }));
}

async function pickRuntime(group: HTMLElement) {
  await userEvent.selectOptions(within(group).getByLabelText("Conexão"), "c1");
  await userEvent.selectOptions(within(group).getByLabelText("Modelo"), "gpt-5.6-sol");
}

describe("loop and worktree choices", () => {
  it("IT-114 adds a Loop with one runtime choice per declared role and sends each binding", async () => {
    const options = optionsOf({ loops: [LOOP, { ...LOOP, name: "locked", offerable: false, reason: "runtime_not_overridable" }] as never, worktrees: [], managedWorktreesAvailable: false });
    serve(overviewOf({ plan: planOf("succeeded") }), options);
    vi.mocked(flow.savePlan.mutate).mockResolvedValue({ revision: 2, state: "planned", runId: null });
    await openImplementation();
    await userEvent.selectOptions(await screen.findByLabelText("Adicionar Loop"), "implement-tasks");
    expect(screen.getByRole("option", { name: /locked v3 \(sem runtime configurável\)/ })).toHaveProperty("disabled", true);
    await userEvent.type(screen.getByLabelText("focus (obrigatório)"), "api");
    await pickRuntime(screen.getByRole("group", { name: "Runtime: backend_runtime" }));
    await pickRuntime(screen.getByRole("group", { name: "Runtime: frontend_runtime" }));
    await userEvent.selectOptions(screen.getByLabelText("Onde implementar?"), "isolated");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    await waitFor(() => expect(flow.savePlan.mutate).toHaveBeenCalledOnce());
    const sent = vi.mocked(flow.savePlan.mutate).mock.calls[0]![0].actions.at(-1);
    expect(sent).toMatchObject({ kind: "loop", loopName: "implement-tasks", loopVersion: "3", inputs: { focus: "api" }, workspace: { kind: "isolated" } });
    expect(Object.keys((sent as { runtimeBindings: object }).runtimeBindings)).toEqual(["backend_runtime", "frontend_runtime"]);
    expect(flow.startAction.mutate).not.toHaveBeenCalled();
  });

  it("asks where to implement and creates a managed worktree only after an explicit choice", async () => {
    serve(overviewOf({ plan: planOf("succeeded") }), optionsOf({ loops: [LOOP] as never, managedWorktreesAvailable: true }));
    vi.mocked(flow.savePlan.mutate).mockResolvedValue({ revision: 2, state: "planned", runId: null });
    await openImplementation();
    await userEvent.click(await screen.findByRole("button", { name: "Adicionar Implementação" }));
    await userEvent.type(screen.getByLabelText("focus (obrigatório)"), "api");
    await pickRuntime(screen.getByRole("group", { name: "Runtime: backend_runtime" }));
    await pickRuntime(screen.getByRole("group", { name: "Runtime: frontend_runtime" }));
    expect(screen.getByLabelText("Onde implementar?")).toHaveProperty("value", "unselected");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    expect(flow.savePlan.mutate).not.toHaveBeenCalled();
    expect(await screen.findByText(/Escolha conexão, modelo, raciocínio e checkout/)).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText("Onde implementar?"), "new");
    expect(screen.getByText("O novo worktree será criado quando a implementação começar.")).toBeTruthy();
    await userEvent.type(screen.getByLabelText("Nome do novo worktree"), "feature-x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    await waitFor(() => expect(flow.savePlan.mutate).toHaveBeenCalledOnce());
    expect(vi.mocked(flow.savePlan.mutate).mock.calls[0]![0].actions.at(-1)).toMatchObject({ workspace: { kind: "new", name: "feature-x" } });
    expect(flow.startAction.mutate).not.toHaveBeenCalled();
  });

  it("explains why no Loop can be added instead of leaving the stage without a control", async () => {
    serve(overviewOf({ plan: planOf("succeeded") }), optionsOf({ loops: [], loopsReason: "local_loops_unreported" } as never));
    await openImplementation();
    expect(await screen.findByText(/conector local ainda não informou os Loops/)).toBeTruthy();
    expect(screen.queryByLabelText("Adicionar Loop")).toBeNull();
  });

  it("names the Loops that exist but cannot be started from this screen", async () => {
    const locked = { ...LOOP, name: "locked", offerable: false, reason: "runtime_not_overridable" };
    serve(overviewOf({ plan: planOf("succeeded") }), optionsOf({ loops: [locked], loopsReason: null } as never));
    await openImplementation();
    expect(await screen.findByText(/locked \(sem runtime configurável\)/)).toBeTruthy();
  });

  it("keeps the Review on its own tab, closed until the implementation Loop has succeeded", async () => {
    const review = { ...LOOP, name: "review-and-fix", inputs: [{ name: "task_name", kind: "string", required: true, hasDefault: false }, { name: "reviewer", kind: "agent", required: false, hasDefault: true, defaultValue: "reviewer" }], runtimeRoles: ["worker"] };
    const options = optionsOf({ loops: [{ ...LOOP, inputs: [] }, review] as never });
    const pending = serve(overviewOf({ plan: planOf("succeeded") }), options);
    await openImplementation();
    await screen.findByRole("button", { name: "Adicionar Implementação" });
    expect(screen.queryByLabelText("Adicionar Loop")).toBeNull();
    expect(screen.queryByRole("option", { name: /review-and-fix/ })).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: /Review/ }));
    expect(await screen.findByText(/fica disponível quando a implementação das tarefas terminar/)).toBeTruthy();
    expect(screen.getByRole("region", { name: "Como o Review funciona" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Adicionar Review" })).toBeNull();
    pending.unmount();
    const base = planOf("succeeded");
    const implemented = { ...base.actions[0]!, id: "a2", position: 2, kind: "loop", loopName: "implement-tasks", loopVersion: "3", inputs: {}, bindings: [] };
    serve(overviewOf({ plan: { ...base, actions: [base.actions[0]!, implemented] } as never }), options);
    vi.mocked(flow.savePlan.mutate).mockResolvedValue({ revision: 2, state: "planned", runId: null });
    await userEvent.click(screen.getByRole("tab", { name: /Review/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Adicionar Review" }));
    expect(screen.getByRole("heading", { name: /Review$/, level: 4 })).toBeTruthy();
    expect(screen.queryByLabelText(/Tarefa revisada/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Adicionar Review" })).toBeNull();
    await pickRuntime(screen.getByRole("group", { name: "Runtime: agentes do Loop" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    await waitFor(() => expect(flow.savePlan.mutate).toHaveBeenCalledOnce());
    expect(vi.mocked(flow.savePlan.mutate).mock.calls[0]![0].actions.at(-1)).toMatchObject({ kind: "loop", loopName: "review-and-fix", inputs: { task_name: "t1" }, runtimeBindings: { worker: { connectionId: "c1" } } });
  });

  it("renders bounded Loop inputs as a checkbox and a select that start on the Loop defaults", async () => {
    const inputs = [
      { name: "auto_commit", kind: "boolean", required: false, hasDefault: true, enumValues: null, defaultValue: false },
      { name: "mode", kind: "string", required: false, hasDefault: true, enumValues: ["per-task", "orchestrated"], defaultValue: "per-task" },
      { name: "implementer", kind: "agent", required: false, hasDefault: true, enumValues: null, defaultValue: "code_implementer" },
    ];
    serve(overviewOf({ plan: planOf("succeeded") }), optionsOf({ loops: [{ ...LOOP, inputs, runtimeRoles: ["default_runtime"] }] as never }));
    vi.mocked(flow.savePlan.mutate).mockResolvedValue({ revision: 2, state: "planned", runId: null });
    await openImplementation();
    await userEvent.click(await screen.findByRole("button", { name: "Adicionar Implementação" }));
    const commit = screen.getByRole("checkbox", { name: "Fazer commit automático ao concluir" });
    expect(commit).toHaveProperty("checked", false);
    expect(screen.getByLabelText("Modo de execução")).toHaveProperty("value", "per-task");
    expect(screen.getByLabelText("Agente implementador")).toHaveProperty("placeholder", "Padrão: code_implementer");
    await userEvent.click(commit);
    await userEvent.selectOptions(screen.getByLabelText("Modo de execução"), "orchestrated");
    await pickRuntime(screen.getByRole("group", { name: "Runtime: default_runtime" }));
    await userEvent.selectOptions(screen.getByLabelText("Onde implementar?"), "isolated");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    await waitFor(() => expect(flow.savePlan.mutate).toHaveBeenCalledOnce());
    expect(vi.mocked(flow.savePlan.mutate).mock.calls[0]![0].actions.at(-1)).toMatchObject({ inputs: { auto_commit: true, mode: "orchestrated" } });
  });

  it("IT-092 and IT-093 offer ready worktrees, explain unavailable ones and send the chosen workspace", async () => {
    const worktrees = [{ id: "wt-1", name: "feature", state: "ready", selectable: true, reason: null }, { id: "wt-2", name: "outro", state: "ready", selectable: false, reason: "foreign_repository" }];
    serve(overviewOf(), optionsOf({ worktrees, managedWorktreesAvailable: true } as never));
    vi.mocked(flow.savePlan.mutate).mockResolvedValue({ revision: 1, state: "planned", runId: null });
    await pickRuntime(await screen.findByRole("list", { name: "Ações do fluxo" }));
    await userEvent.selectOptions(screen.getByLabelText("Checkout"), "existing");
    expect(screen.getByRole("option", { name: "outro (outro repositório)" })).toHaveProperty("disabled", true);
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    expect(await screen.findByText(/Se escolher um worktree, informe um nome ou selecione um válido/)).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText("Worktree"), "wt-1");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    await waitFor(() => expect(flow.savePlan.mutate).toHaveBeenCalledOnce());
    expect(vi.mocked(flow.savePlan.mutate).mock.calls[0]![0].actions[0]).toMatchObject({ workspace: { kind: "existing", worktreeId: "wt-1" } });
    await userEvent.selectOptions(screen.getByLabelText("Checkout"), "new");
    await userEvent.type(screen.getByLabelText("Nome do novo worktree"), "feature-x");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    await waitFor(() => expect(flow.savePlan.mutate).toHaveBeenCalledTimes(2));
    expect(vi.mocked(flow.savePlan.mutate).mock.calls[1]![0].actions[0]).toMatchObject({ workspace: { kind: "new", name: "feature-x" } });
  });

  it("IT-103 shows distinct terminal outcomes, cancels an active run and retries a failed action explicitly", async () => {
    const plan = planOf("failed");
    const runs = runsOf([runOf({ id: "r2", state: "running", attemptNumber: 2 }), runOf({ id: "r1", state: "stalled", terminalCode: "stalled" })]);
    serve(overviewOf({ plan }), optionsOf(), runs);
    vi.mocked(flow.cancelRun.mutate).mockResolvedValue({ runId: "r2", state: "canceled", terminalCode: "canceled_by_author" });
    vi.mocked(flow.retryAction.mutate).mockResolvedValue({ runId: "r3", actionId: "a1", state: "queued", replayed: false });
    expect(await screen.findByText("Travada")).toBeTruthy();
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar execução" }));
    expect(flow.cancelRun.mutate).toHaveBeenCalledWith(expect.objectContaining({ runId: "r2" }));
    const retry = await screen.findByRole("button", { name: "Tentar Criar spec de novo com os mesmos runtimes" });
    await waitFor(() => expect(retry).toHaveProperty("disabled", false));
    await userEvent.click(retry);
    expect(flow.retryAction.mutate).toHaveBeenCalledWith(expect.objectContaining({ actionId: "a1", expectedRevision: 1 }));
    expect(flow.startAction.mutate).not.toHaveBeenCalled();
  });

  it("IT-100 warns when the live Loop version changed since the saved selection", async () => {
    const saved = { id: "a2", position: 2, kind: "loop", loopName: "implement-tasks", loopVersion: "2", inputs: { focus: "api" }, workspace: { kind: "isolated" }, state: "planned", bindings: [{ role: "backend_runtime", connectionId: "c1", connectionLabel: "Codex principal", providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: null, connectionAvailable: true }, { role: "frontend_runtime", connectionId: "c1", connectionLabel: "Codex principal", providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: null, connectionAvailable: true }] };
    const plan = { ...planOf("succeeded"), actions: [...planOf("succeeded").actions, saved] } as never;
    serve(overviewOf({ plan }), optionsOf({ loops: [LOOP] as never, connections: [connectionOf()] }));
    await openImplementation();
    expect(await screen.findByText(/definição ao vivo mudou para a versão 3/)).toBeTruthy();
  });

  it("IT-100 marks changed Loop inputs dirty and prevents starting the saved action", async () => {
    const saved = { id: "a2", position: 1, kind: "loop", loopName: "implement-tasks", loopVersion: "3", inputs: { focus: "api" }, workspace: { kind: "isolated" }, state: "planned", bindings: [{ role: "backend_runtime", connectionId: "c1", connectionLabel: "Codex principal", providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: null, connectionAvailable: true }, { role: "frontend_runtime", connectionId: "c1", connectionLabel: "Codex principal", providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: null, connectionAvailable: true }] };
    const plan = { ...planOf("planned"), actions: [saved] } as never;
    serve(overviewOf({ plan }), optionsOf({ loops: [LOOP] as never, connections: [connectionOf()] }));
    await openImplementation();
    const start = await screen.findByRole("button", { name: "Iniciar Implementação" });
    expect(start).toHaveProperty("disabled", false);
    await userEvent.clear(screen.getByLabelText("focus (obrigatório)"));
    await userEvent.type(screen.getByLabelText("focus (obrigatório)"), "web");
    expect(start).toHaveProperty("disabled", true);
    expect(flow.startAction.mutate).not.toHaveBeenCalled();
  });

  it("IT-056 and IT-070 load and append the next run-history page", async () => {
    const first = runsOf([runOf({ id: "newer", attemptNumber: 2 })]);
    const older = runOf({ id: "older", attemptNumber: 1 });
    serve(overviewOf(), optionsOf(), { ...first, nextCursor: "cursor-older" });
    vi.mocked(flow.runs.query).mockImplementation(async (input) => input.cursor ? { items: [older], nextCursor: null } : { ...first, nextCursor: "cursor-older" });
    expect(await screen.findByText(/tentativa 2/i)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Carregar execuções anteriores" }));
    expect(await screen.findByText(/tentativa 1/i)).toBeTruthy();
    expect(flow.runs.query).toHaveBeenCalledWith(expect.objectContaining({ cursor: "cursor-older" }));
  });
});
