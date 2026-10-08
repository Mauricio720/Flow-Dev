import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET, optionsOf, overviewOf, packageOf, planOf, runOf, runsOf } from "@/test/taskFlow";
import { softwareFailure } from "@/test/software";
import { UnifiedSpecStage } from "./UnifiedSpecStage";
import type { FlowOverview } from "./unifiedContract";

const flow = trpc.taskFlow;

function serve(overview: FlowOverview, options = optionsOf(), runs = runsOf()) {
  vi.mocked(flow.byTask.query).mockResolvedValue(overview);
  vi.mocked(flow.options.query).mockResolvedValue(options);
  vi.mocked(flow.runs.query).mockResolvedValue(runs);
}

function renderStage(overview: FlowOverview, canAct = true) {
  return render(<UnifiedSpecStage target={FLOW_TARGET} initial={overview} canAct={canAct} />);
}

describe("unified flow stage for authors", () => {
  it("saves the plan without starting anything and keeps Start as a separate named action", async () => {
    const overview = overviewOf();
    serve(overview);
    vi.mocked(flow.savePlan.mutate).mockResolvedValue({ revision: 1, state: "planned", runId: null });
    renderStage(overview);
    await screen.findByLabelText("Conexão");
    expect(screen.getByRole("button", { name: "Iniciar Criar spec" })).toHaveProperty("disabled", true);
    expect(screen.getByText("Salve o fluxo para poder iniciar esta ação.")).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText("Conexão"), "c1");
    expect(screen.getByRole("option", { name: /gpt-old \(catálogo desatualizado\)/ })).toHaveProperty("disabled", true);
    await userEvent.selectOptions(screen.getByLabelText("Modelo"), "gpt-5.6-sol");
    expect(within(screen.getByLabelText("Raciocínio")).getAllByRole("option").map((option) => option.textContent)).toEqual(["Padrão do provedor", "low", "high"]);
    await userEvent.selectOptions(screen.getByLabelText("Raciocínio"), "high");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    await waitFor(() => expect(flow.savePlan.mutate).toHaveBeenCalledOnce());
    expect(flow.savePlan.mutate).toHaveBeenCalledWith(expect.objectContaining({ ...FLOW_TARGET, expectedRevision: 0, actions: [{ kind: "create_spec", language: "pt-BR", runtime: { connectionId: "c1", providerId: "codex", modelId: "gpt-5.6-sol", reasoningEffort: "high" }, workspace: { kind: "isolated" } }] }));
    expect(flow.startAction.mutate).not.toHaveBeenCalled();
  });

  it("holds the place of the flow actions and the run history while they load", async () => {
    const overview = overviewOf();
    let deliver: (options: ReturnType<typeof optionsOf>) => void = () => {};
    serve(overview);
    vi.mocked(flow.options.query).mockImplementation(() => new Promise((resolve) => { deliver = resolve; }));
    renderStage(overview);
    expect(screen.getByText("Carregando as ações do fluxo…").closest("[role=status]")).toBeTruthy();
    expect(screen.getByText("Carregando o histórico de execuções…")).toBeTruthy();
    expect(screen.queryByLabelText("Conexão")).toBeNull();
    deliver(optionsOf());
    expect(await screen.findByLabelText("Conexão")).toBeTruthy();
    expect(screen.queryByText("Carregando as ações do fluxo…")).toBeNull();
    expect(screen.queryByText("Carregando o histórico de execuções…")).toBeNull();
  });

  it("refuses to save an incomplete choice instead of guessing a model", async () => {
    const overview = overviewOf();
    serve(overview);
    renderStage(overview);
    await screen.findByLabelText("Conexão");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    expect(await screen.findByText(/Escolha conexão, modelo, raciocínio e checkout/)).toBeTruthy();
    expect(flow.savePlan.mutate).not.toHaveBeenCalled();
  });

  it("saves the selected document language explicitly", async () => {
    const overview = overviewOf();
    serve(overview);
    vi.mocked(flow.savePlan.mutate).mockResolvedValue({ revision: 1, state: "planned", runId: null });
    renderStage(overview);
    await userEvent.selectOptions(await screen.findByLabelText("Idioma dos documentos"), "en");
    await userEvent.selectOptions(screen.getByLabelText("Conexão"), "c1");
    await userEvent.selectOptions(screen.getByLabelText("Modelo"), "gpt-5.6-sol");
    await userEvent.click(screen.getByRole("button", { name: "Salvar fluxo" }));
    await waitFor(() => expect(flow.savePlan.mutate).toHaveBeenCalledOnce());
    expect(vi.mocked(flow.savePlan.mutate).mock.calls[0]![0].actions[0]).toMatchObject({ kind: "create_spec", language: "en" });
  });

  it("starts the saved action explicitly and shows the reason when the host blocks start", async () => {
    const overview = overviewOf({ plan: planOf() });
    serve(overview);
    vi.mocked(flow.startAction.mutate).mockResolvedValue({ runId: "run1", actionId: "a1", state: "queued", replayed: false });
    renderStage(overview);
    const start = await screen.findByRole("button", { name: "Iniciar Criar spec" });
    await waitFor(() => expect(start).toHaveProperty("disabled", false));
    await userEvent.click(start);
    expect(flow.startAction.mutate).toHaveBeenCalledWith(expect.objectContaining({ ...FLOW_TARGET, actionId: "a1", expectedRevision: 1 }));
  });

  it("explains an unavailable start and a stale-plan conflict", async () => {
    const overview = overviewOf({ plan: planOf() });
    serve(overview, optionsOf({ startReason: "host_not_ready" }));
    renderStage(overview);
    expect(await screen.findByText("O host não está pronto para novas execuções.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Iniciar Criar spec" })).toHaveProperty("disabled", true);
  });

  it("does not blame the host runtime for an action on the linked local project", async () => {
    const plan = planOf();
    const overview = overviewOf({ plan: { ...plan, actions: plan.actions.map((action) => ({ ...action, workspace: { kind: "local" as const } })) } });
    serve(overview, optionsOf({ startReason: "runtime_not_ready", localStartReason: null, workspaces: [{ kind: "isolated" }, { kind: "local" }] }));
    renderStage(overview);
    await screen.findByRole("button", { name: "Iniciar Criar spec" });
    expect(screen.queryByText("O runtime CompozyOS não está pronto para novas execuções.")).toBeNull();
  });

  it("IT-107 shows a conflict when approving a stale package version", async () => {
    const overview = overviewOf({ plan: planOf("succeeded"), packages: [packageOf()] });
    serve(overview);
    vi.mocked(flow.package.query).mockResolvedValue({ ...packageOf(), documents: [{ path: "_spec.md", role: "spec", sourceText: "# Spec\n\n## Product\n\nA\n\n## Technical\n\nB\n" }] } as never);
    vi.mocked(flow.approvePackage.mutate).mockRejectedValue(softwareFailure("CONFLICT", "package_version_changed"));
    renderStage(overview);
    await userEvent.click(await screen.findByRole("button", { name: "Aprovar versão 1" }));
    expect(await screen.findByText(/versão mais nova do pacote/)).toBeTruthy();
    expect(flow.startAction.mutate).not.toHaveBeenCalled();
  });
});

describe("unified package review", () => {
  it("shows Product and Technical parts, companion tabs and approves the exact version without starting create_tasks", async () => {
    const overview = overviewOf({ plan: planOf("succeeded"), packages: [packageOf({ version: 2, id: "k2" }), packageOf({ version: 1, id: "k1", status: "superseded" })] });
    serve(overview);
    vi.mocked(flow.package.query).mockResolvedValue({ ...packageOf({ version: 2, id: "k2" }), documents: [{ path: "_spec.md", role: "spec", sourceText: "# Spec\n\n## Product\n\nParte A\n\n## Technical\n\nParte B\n" }, { path: "_dx.md", role: "dx", sourceText: "# DX\n\nconteúdo dx" }] } as never);
    vi.mocked(flow.approvePackage.mutate).mockResolvedValue({ packageId: "k2", version: 2, status: "approved", approvedAt: "2026-10-06T12:00:00.000Z" });
    renderStage(overview);
    expect(await screen.findByRole("region", { name: "Produto · PRD" })).toBeTruthy();
    expect(screen.getByText("Parte A")).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: "Técnica · Tech Spec" }));
    expect(screen.getByRole("region", { name: "Técnica · Tech Spec" })).toBeTruthy();
    expect(screen.getByText("Parte B")).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", { name: "DX" }));
    expect(screen.getByText(/conteúdo dx/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Aprovar versão 2" }));
    await waitFor(() => expect(flow.approvePackage.mutate).toHaveBeenCalledWith(expect.objectContaining({ packageId: "k2", version: 2 })));
    expect(flow.startAction.mutate).not.toHaveBeenCalled();
  });

  it("presents an older version as read-only with no approval control", async () => {
    const overview = overviewOf({ packages: [packageOf({ version: 2, id: "k2" }), packageOf({ version: 1, id: "k1", status: "superseded" })] });
    serve(overview);
    vi.mocked(flow.package.query).mockResolvedValue({ ...packageOf(), documents: [{ path: "_spec.md", role: "spec", sourceText: "# Spec\n\n## Product\n\nA\n\n## Technical\n\nB" }] } as never);
    renderStage(overview);
    await userEvent.selectOptions(await screen.findByLabelText("Versão"), "k1");
    expect(await screen.findByText(/Versão anterior, somente leitura/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Aprovar versão/ })).toBeNull();
  });
});

describe("stage position and open points", () => {
  const SPEC_WITH_QUESTIONS = "# Spec\n\n# Part I — Product\n\n## Overview\n\nResumo do produto.\n\n## Open Questions\n\n- Qual plano entra primeiro?\n\n# Part II — Technical\n\n## Assumptions and Defaults\n\nIdioma pt-BR.\n\n## API Endpoints\n\nNão aplicável: nenhuma API muda.\n";

  it("tells the author which stage is current and what to do next", async () => {
    const overview = overviewOf({ plan: planOf("succeeded"), packages: [packageOf()] });
    serve(overview);
    vi.mocked(flow.package.query).mockResolvedValue({ ...packageOf(), documents: [] } as never);
    renderStage(overview);
    const current = await screen.findByRole("tab", { selected: true });
    expect(current.textContent).toContain("Spec");
    expect(current.textContent).toContain("Aguardando você");
    expect(screen.getByText("Em revisão")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Revise e aprove a spec" })).toBeTruthy();
  });

  it("holds the approval until every open question is confirmed, without asking about assumptions", async () => {
    const overview = overviewOf({ plan: planOf("succeeded"), packages: [packageOf()] });
    serve(overview);
    vi.mocked(flow.package.query).mockResolvedValue({ ...packageOf(), documents: [{ path: "_spec.md", role: "spec", sourceText: SPEC_WITH_QUESTIONS }] } as never);
    vi.mocked(flow.approvePackage.mutate).mockResolvedValue({ packageId: "k1", version: 1, status: "approved", approvedAt: "2026-10-06T12:00:00.000Z" });
    renderStage(overview);
    const points = await screen.findByRole("region", { name: "Pontos para confirmar" });
    const approve = screen.getByRole("button", { name: "Aprovar versão 1" });
    expect(approve).toHaveProperty("disabled", true);
    expect(within(points).getByRole("group", { name: "Produto · PRD" })).toBeTruthy();
    expect(within(points).queryByLabelText(/Idioma pt-BR\./)).toBeNull();
    await userEvent.click(within(points).getByLabelText(/Qual plano entra primeiro\?/));
    expect(within(points).getByText("1 de 1 confirmados")).toBeTruthy();
    await userEvent.click(approve);
    await waitFor(() => expect(flow.approvePackage.mutate).toHaveBeenCalledOnce());
  });

  it("puts a pending agent question at the top of the stage", async () => {
    const overview = overviewOf({ plan: planOf("running") });
    serve(overview, optionsOf(), runsOf([runOf({ state: "running" })]));
    vi.mocked(flow.questions.query).mockResolvedValue([{ id: "q1", title: "Qual região entra primeiro?", choices: ["Sul", "Norte"] }]);
    renderStage(overview);
    expect(await screen.findByRole("heading", { name: "O agente precisa da sua resposta" })).toBeTruthy();
    expect(screen.getByText("Qual região entra primeiro?")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Responder e continuar" })).toBeTruthy();
  });
});

describe("unified flow stage for readers", () => {
  it("IT-064 and IT-065 show safe provenance with an unavailable marker and no author controls", async () => {
    const overview = overviewOf({ plan: planOf("succeeded") });
    serve(overview, optionsOf(), runsOf([runOf()]));
    renderStage(overview, false);
    expect(await screen.findByText(/Somente leitura/)).toBeTruthy();
    expect(await screen.findByText(/codex · gpt-5.6-sol · raciocínio high · conexão Codex antigo \(indisponível hoje\)/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Salvar fluxo|Iniciar|Aprovar/ })).toBeNull();
    expect(flow.options.query).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toMatch(/token|auth\.json|mountPath/i);
  });

  it("IT-066 shows an honest not-selected state", async () => {
    serve(overviewOf());
    renderStage(overviewOf(), false);
    expect(await screen.findByText("Nenhum fluxo foi selecionado ainda.")).toBeTruthy();
    expect(screen.getByText("Nenhuma execução ainda. Nada foi iniciado.")).toBeTruthy();
  });
});
