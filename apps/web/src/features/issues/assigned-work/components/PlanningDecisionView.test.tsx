import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { routeSwitchOf } from "@/test/session";
import { decisionOf } from "@/test/tasks";
import { PlanningDecisionView } from "./PlanningDecisionView";

const show = (patch = {}, lastOpened?: { userName: string; openedAt: string }) => render(<PlanningDecisionView decision={decisionOf(patch)} lastOpened={lastOpened} />);
const APPROVED = { status: "approved", approvedByUserId: "u", approvedAt: "2026-10-05T12:00:00.000Z" } as const;

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

  it("V-09h shows who started the session in place of the not started note", () => {
    show(APPROVED, { userName: "Ana", openedAt: "2026-11-22T14:05:00.000Z" });
    expect(screen.getByText(/Sessão iniciada por Ana às \d{2}:\d{2}/)).toBeTruthy();
    expect(screen.queryByText(/A próxima atividade ainda não foi iniciada/)).toBeNull();
  });

  it("V-09i keeps the not started note when no session was opened", () => {
    show(APPROVED);
    expect(screen.getByText(/A próxima atividade ainda não foi iniciada\./)).toBeTruthy();
    expect(screen.queryByText(/Execução aberta no terminal/)).toBeNull();
  });

  it("V-08i keeps the recommended and the approved route and adds who confirmed the switch, when, and the reasons", () => {
    const confirmedAt = new Date(2026, 10, 25, 10, 6).toISOString();
    const routeSwitch = routeSwitchOf({ state: "confirmed", decidedBy: "Ana", decidedAt: confirmedAt }).proposal;
    render(<PlanningDecisionView decision={decisionOf({ ...APPROVED, recommendedRoute: "prd", selectedRoute: "prd" })} routeSwitch={routeSwitch} />);
    expect(screen.getByText("Recomendação original").nextElementSibling?.textContent).toBe("PRD");
    expect(screen.getByText("Rota salva").nextElementSibling?.textContent).toBe("PRD · Recomendada pela análise");
    const record = screen.getByRole("region", { name: "Troca de rota" });
    expect(within(record).getByText("Trocada para Execução direta após as perguntas, confirmada por Ana em 25/11 10:06")).toBeTruthy();
    const reasons = within(record).getByRole("list", { name: "Motivos da troca" });
    expect(within(reasons).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["As respostas fixaram o texto e a tela.", "Segue o padrão de planningCopy.ts."]);
  });

  it("V-08i shows no switch record when the current decision has no confirmed switch", () => {
    render(<PlanningDecisionView decision={decisionOf({ ...APPROVED, recommendedRoute: "prd", selectedRoute: "prd" })} routeSwitch={null} />);
    expect(screen.getByText("Rota salva").nextElementSibling?.textContent).toBe("PRD · Recomendada pela análise");
    expect(screen.queryByRole("region", { name: "Troca de rota" })).toBeNull();
    expect(screen.queryByText(/Trocada para Execução direta/)).toBeNull();
    expect(screen.queryByText("As respostas fixaram o texto e a tela.")).toBeNull();
  });
});
