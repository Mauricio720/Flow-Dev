import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { decisionOf } from "@/test/tasks";
import { PlanningDecisionView } from "./PlanningDecisionView";

const show = (patch = {}, lastOpened?: { userName: string; openedAt: string }) => render(<PlanningDecisionView decision={decisionOf(patch)} lastOpened={lastOpened} />);
const APPROVED = { status: "approved", approvedByUserId: "u", approvedAt: "2026-10-05T12:00:00.000Z" };

describe("PlanningDecisionView", () => {
  it("UT-057 renders named pt-BR fields with planning agent attribution", () => {
    show();
    expect(screen.getByText("Agente de planejamento")).toBeTruthy();
    expect(screen.getByText("Complexidade").nextElementSibling?.textContent).toBe("Média");
    expect(screen.getByText("Recomendação original").nextElementSibling?.textContent).toBe("Tech Spec");
    expect(screen.getByText("Rota salva").nextElementSibling?.textContent).toContain("Recomendada pela análise");
    expect(within(screen.getByRole("region", { name: "Motivos da recomendação" })).getByText("O total depende de dois módulos")).toBeTruthy();
    expect(screen.getByText("Definir paginação")).toBeTruthy();
  });

  it("UT-058 says there are no reported pendings without a readiness claim", () => {
    show({ uncertainties: [] });
    expect(screen.getByText("Nenhuma pendência informada")).toBeTruthy();
    expect(screen.queryByText(/pronto|sem riscos|seguro/i)).toBeNull();
  });

  it("UT-059 renders hostile provider text inert", () => {
    const { container } = show({ summary: "<script>alert(1)</script>", reasons: ["[link](javascript:alert(1))"] });
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeTruthy();
    expect(screen.getByText("[link](javascript:alert(1))")).toBeTruthy();
  });

  it("UT-060 keeps uncertainties visible after approval without an acknowledgement control", () => {
    show({ status: "approved", approvedByUserId: "u", approvedAt: "2026-10-05T12:00:00.000Z", uncertainties: ["Definir paginação"] });
    expect(screen.getByText("Definir paginação")).toBeTruthy();
    expect(screen.getByText(/Aprovado pela pessoa operadora/)).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("UT-061 keeps the maximum assessment reachable", () => {
    const reasons = Array.from({ length: 20 }, (_, index) => `${index}:${"r".repeat(1_990)}`);
    const uncertainties = Array.from({ length: 20 }, (_, index) => `${index}:${"u".repeat(1_990)}`);
    show({ summary: "s".repeat(4_000), reasons, uncertainties });
    expect(screen.getAllByRole("listitem")).toHaveLength(40);
    expect(screen.getByText(reasons[19]!)).toBeTruthy();
    expect(screen.getByText(uncertainties[19]!)).toBeTruthy();
  });

  it("labels the rationale of an override as belonging to the original recommendation", () => {
    show({ selectedRoute: "prd", decisionSource: "HUMAN_OVERRIDE" });
    expect(screen.getByText(/explicam a recomendação original/)).toBeTruthy();
    expect(screen.getByText("Rota salva").nextElementSibling?.textContent).toContain("Escolhida pela pessoa operadora");
  });

  it("V-09h shows who opened the execution in the terminal in place of the not started note", () => {
    show(APPROVED, { userName: "Ana", openedAt: "2026-11-22T14:05:00.000Z" });
    expect(screen.getByText(/Execução aberta no terminal por Ana às \d{2}:\d{2}/)).toBeTruthy();
    expect(screen.queryByText(/A próxima atividade ainda não foi iniciada/)).toBeNull();
  });

  it("V-09i keeps the not started note when no session was opened", () => {
    show(APPROVED);
    expect(screen.getByText(/A próxima atividade ainda não foi iniciada\./)).toBeTruthy();
    expect(screen.queryByText(/Execução aberta no terminal/)).toBeNull();
  });
});
