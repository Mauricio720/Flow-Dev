import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { P } from "@/test/tasks";
import { activeItemOf, progressOf } from "@/test/work";
import { ActiveCounts } from "./ActiveCounts";
import { ActiveRow } from "./ActiveRow";

const analyzingItem = activeItemOf({ stage: "in_progress" });

function renderRow(item = analyzingItem) {
  render(<ul aria-label="Linhas"><ActiveRow projectId={P} item={item} operator /></ul>);
  return within(screen.getByRole("list", { name: "Linhas" })).getAllByRole("listitem")[0]!;
}

describe("ActiveRow", () => {
  it("shows the planning state and what happens next", () => {
    const row = renderRow();
    expect(row.textContent).toContain("Planejamento · Em andamento");
    expect(row.textContent).toContain("O agente de planejamento está analisando a Issue");
  });

  it("shows the approved route", () => {
    const row = renderRow(activeItemOf({ stage: "approved", progress: progressOf({ route: "direct_execution" }) }));
    expect(row.textContent).toContain("Execução direta");
    expect(row.textContent).toContain("Rota do planejamento aprovada");
  });
});

describe("ActiveCounts", () => {
  it("counts ongoing and waiting work", () => {
    render(<ActiveCounts items={[analyzingItem, activeItemOf({ taskId: "t2", stage: "review" })]} operator />);
    expect(screen.getByRole("list", { name: "Resumo do trabalho em andamento" }).textContent).toBe("1 em andamento1 aguardando ação");
  });
});
