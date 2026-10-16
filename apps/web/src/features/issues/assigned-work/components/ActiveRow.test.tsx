import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { P } from "@/test/tasks";
import { activeItemOf, progressOf } from "@/test/work";
import { ActiveCounts } from "./ActiveCounts";
import { ActiveRow } from "./ActiveRow";

const STARTED_AT = "2026-10-15T10:00:00.000Z";
const activity = { kind: "tool_call", at: STARTED_AT, preview: "Ajustando o cálculo do frete no carrinho", tool: "edit_file", source: "src/cart/total.ts", status: null };
const runningItem = activeItemOf({ stage: "approved", progress: progressOf({ route: "direct_execution", flow: "unified", actions: [{ kind: "direct_execute", loopName: null, state: "running", concludedAt: null }], activeRun: { kind: "direct_execute", loopName: null, state: "running", createdAt: STARTED_AT, activity } }) });

function renderRow(item = runningItem) {
  render(<ul aria-label="Linhas"><ActiveRow projectId={P} item={item} operator /></ul>);
  return within(screen.getByRole("list", { name: "Linhas" })).getAllByRole("listitem")[0]!;
}

describe("ActiveRow", () => {
  it("shows the stage, the route and what the running agent is doing", () => {
    const row = renderRow();
    expect(row.textContent).toContain("Execução direta · Em andamento");
    expect(row.textContent).toContain("O agente está implementando a Issue");
    const live = within(row).getByRole("region", { name: "Executando agora" });
    expect(live.textContent).toContain("Execução direta");
    expect(live.textContent).toContain("edit_file");
    expect(live.textContent).toContain("src/cart/total.ts");
    expect(live.textContent).toContain("Ajustando o cálculo do frete no carrinho");
  });

  it("names every stage of the rail with its state for assistive technology", () => {
    const rail = within(renderRow()).getByRole("list", { name: "Etapas do fluxo" });
    expect(within(rail).getAllByRole("listitem").map((stop) => stop.textContent)).toEqual(["Planejamento: Concluída", "Execução direta: Em andamento", "Pull Request: Pendente"]);
  });

  it("hides machine payloads from the activity preview", () => {
    const progress = { ...runningItem.progress, activeRun: { ...runningItem.progress.activeRun!, activity: { ...activity, preview: "{\"schema\":\"x\"}" } } };
    expect(renderRow(activeItemOf({ ...runningItem, progress })).textContent).not.toContain("schema");
  });

  it("does not show a live run when nothing is executing", () => {
    const row = renderRow(activeItemOf({ stage: "review" }));
    expect(row.textContent).toContain("Revise e aprove a rota do planejamento");
    expect(within(row).queryByRole("region", { name: "Executando agora" })).toBeNull();
  });
});

describe("ActiveCounts", () => {
  it("counts running and waiting work", () => {
    render(<ActiveCounts items={[runningItem, activeItemOf({ taskId: "t2", stage: "review" })]} operator />);
    expect(screen.getByRole("list", { name: "Resumo do trabalho em andamento" }).textContent).toBe("1 em execução1 aguardando ação");
  });
});
