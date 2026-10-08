import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET, optionsOf, overviewOf, packageOf, planOf, runOf, runsOf } from "@/test/taskFlow";
import { UnifiedSpecStage } from "./UnifiedSpecStage";
import type { FlowOverview } from "./unifiedContract";

const flow = trpc.taskFlow;
const TASKS_TAB = { name: /Tarefas/ };
const APPROVED_AT = "2026-10-06T12:00:00.000Z";
const SPEC_DOCUMENTS = [{ path: "_spec.md", role: "spec", sourceText: "# Spec\n\n## Product\n\nA\n\n## Technical\n\nB\n" }];

function renderFlow(overview: FlowOverview, runs = runsOf()) {
  vi.mocked(flow.byTask.query).mockResolvedValue(overview);
  vi.mocked(flow.options.query).mockResolvedValue(optionsOf());
  vi.mocked(flow.runs.query).mockResolvedValue(runs);
  vi.mocked(flow.package.query).mockResolvedValue({ ...packageOf(), documents: SPEC_DOCUMENTS } as never);
  return render(<UnifiedSpecStage target={FLOW_TARGET} initial={overview} canAct />);
}

describe("flow stages as tabs", () => {
  it("opens on the stage that needs the operator and keeps later stages closed until picked", async () => {
    renderFlow(overviewOf());
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["SpecAguardando você", "TarefasPendente", "ImplementaçãoPendente", "ReviewPendente"]);
    expect(screen.getByRole("tab", { selected: true }).textContent).toContain("Spec");
    expect(screen.getByRole("heading", { name: "Inicie a spec" })).toBeTruthy();
    await userEvent.click(screen.getByRole("tab", TASKS_TAB));
    expect(screen.getByRole("heading", { name: "Tarefas" })).toBeTruthy();
    expect(screen.getByText("Esta etapa começa depois que a spec for aprovada.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Inicie a spec" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Documentos" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Salvar fluxo" })).toBeNull();
  });

  it("shows each stage only its own runs", async () => {
    const runs = runsOf([runOf({ id: "r1" }), runOf({ id: "r2", kind: "create_tasks", actionId: "a2", attemptNumber: 4 })]);
    renderFlow(overviewOf({ plan: planOf("succeeded"), packages: [packageOf()] }), runs);
    expect(await screen.findByText(/tentativa 1/)).toBeTruthy();
    expect(screen.queryByText(/tentativa 4/)).toBeNull();
    await userEvent.click(screen.getByRole("tab", TASKS_TAB));
    expect(screen.getByText(/tentativa 4/)).toBeTruthy();
    expect(screen.queryByText(/tentativa 1/)).toBeNull();
  });

  it("keeps an unsaved choice while the operator visits another stage", async () => {
    renderFlow(overviewOf());
    await userEvent.selectOptions(await screen.findByLabelText("Idioma dos documentos"), "en");
    await userEvent.click(screen.getByRole("tab", TASKS_TAB));
    await userEvent.click(screen.getByRole("tab", { name: /Spec/ }));
    expect(await screen.findByLabelText("Idioma dos documentos")).toHaveProperty("value", "en");
  });

  it("follows the flow to the next stage once the spec is approved", async () => {
    const reviewing = overviewOf({ plan: planOf("succeeded"), packages: [packageOf()] });
    renderFlow(reviewing);
    vi.mocked(flow.approvePackage.mutate).mockResolvedValue({ packageId: "k1", version: 1, status: "approved", approvedAt: APPROVED_AT });
    vi.mocked(flow.byTask.query).mockResolvedValue(overviewOf({ plan: planOf("succeeded"), packages: [packageOf({ status: "approved", approvedAt: APPROVED_AT })] }));
    await userEvent.click(await screen.findByRole("button", { name: "Aprovar versão 1" }));
    await waitFor(() => expect(screen.getByRole("tab", { selected: true }).textContent).toContain("Tarefas"));
    expect(screen.getByRole("heading", { name: "Prepare as tarefas" })).toBeTruthy();
  });

  it("moves between stages with the arrow keys", async () => {
    renderFlow(overviewOf());
    screen.getByRole("tab", { selected: true }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement?.textContent).toContain("Tarefas");
    expect(screen.getByRole("tab", { selected: true }).textContent).toContain("Tarefas");
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("tab", { selected: true }).textContent).toContain("Review");
  });
});
