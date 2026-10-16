import { describe, expect, it } from "vitest";
import { openPoints } from "../openPoints";
import { artifactView } from "./artifactView";
import { fullTabs } from "./viewFixtures";

const ARTIFACT = { artifactId: "k1", artifactVersion: 3, format: "os_spec_v1" };

function viewOf(spec?: string) {
  const tabs = fullTabs(spec);
  return artifactView({ artifact: ARTIFACT, tabs, points: openPoints(tabs.flatMap((tab) => tab.documents)) });
}

describe("artifactView", () => {
  it("is a versioned projection of the exact artifact version", () => {
    expect(viewOf()).toMatchObject({ artifact: ARTIFACT, viewSchemaVersion: 1 });
  });

  it("projects the PRD into journeys, requirements with criteria and linked tests, personas and decisions", () => {
    const { product } = viewOf();
    expect(product.journeys.map((journey) => [journey.title, journey.steps])).toEqual([["Experiência da pessoa", ["A pessoa vê o sino com a contagem.", "Abre o painel com as cinco recentes.", "Marca uma notificação como vista."]]]);
    expect(product.requirements[0]).toMatchObject({ code: "US-001", acceptance: [{ id: "US-001.AC-1" }, { id: "US-001.AC-2", text: "O comportamento é igual nos dois perfis." }], edges: [{ id: "US-001.EC-1" }], tests: ["E2E-001", "IT-009"] });
    expect(product.personas.map((persona) => persona.title)).toEqual(["Comprador"]);
    expect(product.decisions.map((decision) => decision.title)).toContain("D1 — Superfície");
    expect(product.metrics).toEqual([]);
  });

  it("rebuilds the declared architecture only from the diagram nodes and edges", () => {
    const [diagram] = viewOf().technical.diagrams;
    expect(diagram!.nodes.map((node) => [node.label, node.depth])).toEqual([["Shell", 0], ["NotificationsProvider", 1], ["notification", 2], ["Sino", 2]]);
    expect(diagram!.edges).toContainEqual({ from: "B", to: "C", label: "consulta" });
  });

  it("reads contracts, data flows, the coverage matrix and the test catalog", () => {
    const { technical } = viewOf();
    expect(technical.contracts[0]).toMatchObject({ title: "`notification.summary`", summary: "Tipo: query autenticada, sem entrada." });
    expect(technical.contracts[0]!.parts.map((part) => part.kind)).toEqual(["text", "table", "example"]);
    expect(technical.dataFlows.map((flow) => [flow.title, flow.steps.length])).toEqual([["Monitoramento no cliente", 2]]);
    expect(technical.coverage[2]).toMatchObject({ tests: [], otherChecks: ["Revisão documental"] });
    expect(technical.testCases.map((item) => [item.id, item.kind, item.title])).toEqual([["IT-009", "integration", "Monitor único"], ["UT-001", "unit", "`NotificationBadge`: limite visual."], ["E2E-001", "e2e", "Primeira fatia"]]);
  });

  it("links tests to requirements and warns about references it cannot resolve", () => {
    const view = viewOf();
    expect(view.relationships).toEqual([{ fromId: "E2E-001", toId: "US-001", type: "validates" }, { fromId: "IT-009", toId: "US-001", type: "validates" }]);
    expect(view.validationWarnings).toEqual(["A matriz de cobertura cita US-009, que não está no catálogo de histórias.", "A matriz de cobertura cita IT-099 sem descrição no contrato de testes."]);
  });
});
