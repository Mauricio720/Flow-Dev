import { describe, expect, it } from "vitest";
import { activeItemOf, progressOf } from "@/test/work";
import { progressSummary } from "./workProgress";

describe("progressSummary", () => {
  it("follows the planning while it is being analyzed", () => {
    expect(progressSummary(activeItemOf({ stage: "in_progress" }), true)).toEqual({ state: "current", badge: "Planejamento · Em andamento", headline: "O agente de planejamento está analisando a Issue" });
  });

  it("asks the operator to review the route", () => {
    expect(progressSummary(activeItemOf({ stage: "review" }), true)).toEqual({ state: "yours", badge: "Planejamento · Aguardando você", headline: "Revise e aprove a rota do planejamento" });
  });

  it("ends at the approved planning", () => {
    expect(progressSummary(activeItemOf({ stage: "approved", progress: progressOf({ route: "tech_spec" }) }), true)).toEqual({ state: "done", badge: "Planejamento · Concluída", headline: "Rota do planejamento aprovada" });
  });

  it("reports claimed work that was never planned as pending", () => {
    expect(progressSummary(activeItemOf({ stage: null }), true)).toEqual({ state: "pending", badge: "Planejamento · Pendente", headline: "O planejamento ainda não começou." });
  });

  it("does not address an observer as the operator", () => {
    expect(progressSummary(activeItemOf({ stage: "review" }), false)).toMatchObject({ badge: "Planejamento · Aguardando a pessoa operadora", headline: "Aguardando a pessoa operadora continuar o fluxo." });
  });
});
