import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { trpc } from "@/lib/trpc/client";
import { FLOW_TARGET, optionsOf, overviewOf, packageOf, planOf, runsOf } from "@/test/taskFlow";
import { UnifiedSpecStage } from "../UnifiedSpecStage";
import { fullDocuments } from "./viewFixtures";

const flow = trpc.taskFlow;

function renderStage(canAct = true) {
  const overview = overviewOf({ plan: planOf("succeeded"), packages: [packageOf()] });
  vi.mocked(flow.byTask.query).mockResolvedValue(overview);
  vi.mocked(flow.options.query).mockResolvedValue(optionsOf());
  vi.mocked(flow.runs.query).mockResolvedValue(runsOf());
  vi.mocked(flow.package.query).mockResolvedValue({ ...packageOf(), documents: fullDocuments() } as never);
  return render(<UnifiedSpecStage target={FLOW_TARGET} initial={overview} canAct={canAct} />);
}

describe("work summary", () => {
  it("answers what, why, impact and the current status below the stage trail", async () => {
    renderStage();
    const summary = await screen.findByRole("region", { name: "Resumo do trabalho" });
    expect(await within(summary).findByText("comprador e fornecedor terão sino com contagem de não vistas.")).toBeTruthy();
    expect(within(summary).getByText("Spec v1 · Em revisão")).toBeTruthy();
    expect(within(summary).getByText("2 partes afetadas · 2 arquivos citados")).toBeTruthy();
    expect(within(summary).getByRole("button", { name: "Revisar Spec" })).toBeTruthy();
    expect(within(within(summary).getByRole("region", { name: "Principais capacidades" })).getByText("2 critérios · 2 testes")).toBeTruthy();
  });

  it("offers readers the PRD instead of the review action", async () => {
    renderStage(false);
    const summary = await screen.findByRole("region", { name: "Resumo do trabalho" });
    expect(await within(summary).findByRole("button", { name: "Abrir PRD" })).toBeTruthy();
    expect(within(summary).queryByRole("button", { name: "Revisar Spec" })).toBeNull();
  });

  it("takes a capability from any stage to its requirement in the PRD", async () => {
    renderStage();
    const summary = await screen.findByRole("region", { name: "Resumo do trabalho" });
    await userEvent.click(screen.getByRole("tab", { name: /Tarefas/ }));
    await userEvent.click(await within(summary).findByRole("button", { name: /US-001/ }));
    expect(await screen.findByRole("navigation", { name: "Seções do PRD" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "PRD", selected: true })).toBeTruthy();
    expect(document.activeElement?.id).toBe("hv-US-001");
  });
});
