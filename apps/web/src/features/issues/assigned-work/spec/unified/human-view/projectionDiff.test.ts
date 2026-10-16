import { describe, expect, it } from "vitest";
import { openPoints } from "../openPoints";
import { parseFlowchart } from "./architectureFlow";
import { artifactView } from "./artifactView";
import { viewChanges } from "./projectionDiff";
import { FULL_SPEC, fullTabs } from "./viewFixtures";

function viewOf(spec: string) {
  const tabs = fullTabs(spec);
  return artifactView({ artifact: { artifactId: "k", artifactVersion: 1, format: "os_spec_v1" }, tabs, points: openPoints(tabs.flatMap((tab) => tab.documents)) });
}

describe("viewChanges", () => {
  it("reports nothing between identical versions", () => {
    expect(viewChanges(viewOf(FULL_SPEC), viewOf(FULL_SPEC))).toEqual([]);
  });

  it("names added, removed and changed decisions by their recorded title", () => {
    const changed = FULL_SPEC.replace("| D1 — Superfície | “Sino com contagem” | Sino separado do hamburger |", "| D1 — Superfície | “Sino com contagem” | Sino dentro do menu |\n| D5 — Retenção | “30 dias” | Limpeza diária |");
    expect(viewChanges(viewOf(FULL_SPEC), viewOf(changed)).filter((change) => change.kind === "decision")).toEqual([{ kind: "decision", type: "changed", title: "D1 — Superfície" }, { kind: "decision", type: "added", title: "D5 — Retenção" }]);
    expect(viewChanges(viewOf(changed), viewOf(FULL_SPEC))).toContainEqual({ kind: "decision", type: "removed", title: "D5 — Retenção" });
  });
});

describe("parseFlowchart", () => {
  it("reads chained edges and node shapes and ignores anything that is not a flowchart", () => {
    const parsed = parseFlowchart("graph TD\n  %% comentário\n  A[Entrada] --> B((Fila)) --> C{Decisão}\n  C -.-> A");
    expect(parsed?.nodes.map((node) => node.label)).toEqual(["Entrada", "Fila", "Decisão"]);
    expect(parsed?.edges.map((edge) => `${edge.from}>${edge.to}`)).toEqual(["A>B", "B>C", "C>A"]);
    expect(parseFlowchart("sequenceDiagram\n  A->>B: oi")).toBeNull();
  });
});
