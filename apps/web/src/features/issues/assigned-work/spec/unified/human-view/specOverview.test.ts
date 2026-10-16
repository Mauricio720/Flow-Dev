import { describe, expect, it } from "vitest";
import { openPoints } from "../openPoints";
import { specTabs } from "./overviewFixtures";
import { specOverview } from "./specOverview";

function overviewOf(spec?: string, stories?: string) {
  const tabs = specTabs(spec, stories);
  return specOverview(tabs, openPoints(tabs.flatMap((tab) => tab.documents)));
}

describe("specOverview", () => {
  it("answers what changes and why from the labeled executive summary, pointing at it", () => {
    const overview = overviewOf();
    expect(overview.what?.text).toBe("comprador e fornecedor terão sino com contagem de não vistas.");
    expect(overview.why?.text).toBe("a pessoa identifica as novidades sem abrir o menu.");
    expect(overview.what?.source).toEqual({ tabId: "product", documentId: "product", sectionId: "s0", label: "Produto · PRD › Resumo executivo" });
    expect(overview.openNote?.text).toBe("nenhuma decisão de produto bloqueante.");
  });

  it("splits summary decisions into highlights and keeps the recorded table rows with their columns", () => {
    const { decisions } = overviewOf();
    expect(decisions.highlights.map((item) => item.title)).toEqual(["marcação como vista somente por ação explícita", "atualização a cada 10 segundos", "“Marcar todas” abrange as existentes"]);
    expect(decisions.recorded).toHaveLength(1);
    expect(decisions.recorded[0]).toMatchObject({ title: "D1 — Superfície", detail: ["**Resposta registrada:** “Sino com contagem”", "**Consequência:** Sino separado do hamburger"] });
    expect(decisions.recorded[0]!.source.label).toBe("Produto · PRD › Decisões confirmadas pelo autor");
  });

  it("reads risks from the summary and from the known-risks list, splitting a bold lead from its detail", () => {
    const { risks } = overviewOf();
    expect(risks.highlights.map((item) => item.title)).toEqual(["polling tem atraso", "respostas antigas não podem apagar pendências"]);
    expect(risks.recorded.map((item) => [item.title, item.detail])).toEqual([["Contagem exata custa mais que existência: confirmar índices.", []], ["Risco de versão", ["conferir assinaturas do tRPC."]]]);
  });

  it("turns user stories into capabilities using the index result and counts their criteria", () => {
    const [capability, ...rest] = overviewOf().capabilities;
    expect(rest).toEqual([]);
    expect(capability).toMatchObject({ code: "US-001", title: "Identificar quantidade de notificações não vistas", meta: ["Comprador/fornecedor"], criteria: 2, edgeCases: 1 });
    expect(capability!.source).toMatchObject({ tabId: "user_stories", label: "Histórias › US-001 — Identificar minhas pendências" });
  });

  it("never treats a story about pending items as an open question", () => {
    expect(overviewOf().questions).toEqual([]);
  });

  it("lists impacted parts with short regimes as meta and counts file references", () => {
    const overview = overviewOf();
    expect(overview.impacts.map((item) => [item.title, item.meta])).toEqual([["`summary`", ["aditivo"]], ["Booleano da sidebar", []]]);
    expect(overview.impacts[1]!.detail[0]).toBe("**Regime:** Código interno: remover na mesma mudança");
    expect(overview.files).toMatchObject({ count: 2, source: { label: "Técnica · Tech Spec › Referências de arquivos" } });
  });

  it("falls back to recorded decisions when the summary has no labels and invents nothing when sections are missing", () => {
    const spec = "# Spec\n\n## Product\n\n## Overview\n\nTexto livre.\n\n## Technical\n\n## Technical Considerations\n\n### Key Decisions\n\n- Componente controlado.\n- Regiões derivadas.\n";
    const overview = overviewOf(spec, "# Histórias\n\nSem catálogo.");
    expect(overview.what).toBeNull();
    expect(overview.decisions.highlights.map((item) => item.title)).toEqual(["Componente controlado.", "Regiões derivadas."]);
    expect(overview).toMatchObject({ capabilities: [], risks: { highlights: [], recorded: [] }, questions: [], impacts: [], files: null });
  });
});
