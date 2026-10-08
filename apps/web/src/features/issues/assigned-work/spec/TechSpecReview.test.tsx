import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { documentOf, packageOf } from "@/test/spec";
import { TechSpecReview } from "./TechSpecReview";

const encoder = new TextEncoder();
const SPEC = "# TechSpec\n\n## System Architecture\n\nExportService gera o arquivo.\n";
const TESTS = "# Tests\n\n- **UT-001** (`task-required`): ExportService gera CSV.\n";
const testRef = { startByte: encoder.encode("# Tests\n\n").length, endByte: encoder.encode(TESTS).length };
const noop = () => undefined;
const view = (detail = packageOf({ relations: { stories: [], tests: [{ id: "UT-001", tier: "task-required", references: ["ExportService"], source: testRef }], tasks: [] } as never }), spec = SPEC) => render(<TechSpecReview detail={detail} documents={[documentOf("_techspec.md", spec), documentOf("_tests.md", TESTS)]} onOpenDocument={noop} onLoadMore={noop} />);

describe("TechSpecReview", () => {
  it("UT-049 renders UT-001 as planned validation linked to its source component", () => {
    view();
    const planned = screen.getByRole("region", { name: "Testes planejados" });
    expect(planned.textContent).toContain("UT-001");
    expect(planned.textContent).toContain("Planejado, não executado");
    expect(planned.textContent).toContain("ExportService");
    expect(planned.textContent).not.toMatch(/executado com sucesso|aprovado/i);
  });

  it("UT-050 shows a visible interpretation gap for an unsupported material diagram", () => {
    view(undefined, "# TechSpec\n\n## System Architecture\n\n```mermaid\nsankey-beta\nA,B,1\n```\n");
    expect(screen.getByRole("list", { name: "Diagnósticos do pacote" }).textContent).toContain("interpretation_gap");
  });

  it("IT-061 never renders a diagram with an external link or script payload", () => {
    const hostile = "# TechSpec\n\n## System Architecture\n\n```mermaid\ngraph TD\nA-->B\nclick A \"javascript:alert(1)\"\n```\n";
    view(undefined, hostile);
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText(/conteúdo ativo bloqueado/)).toBeTruthy();
  });

  it("IT-063 keeps a 50-column contract table reachable with a labeled horizontal scroll region", () => {
    const columns = Array.from({ length: 50 }, (_, index) => `c${index}`);
    const table = `| ${columns.join(" | ")} |\n| ${columns.map(() => "---").join(" | ")} |\n| ${columns.map((_, index) => `v${index}`).join(" | ")} |`;
    view(undefined, `# TechSpec\n\n## Implementation Design\n\n${table}\n`);
    const region = screen.getByRole("region", { name: /tabela com rolagem horizontal/ });
    expect(region.querySelectorAll("th")).toHaveLength(50);
    expect(region.querySelector("th")?.getAttribute("scope")).toBe("col");
  });

  it("IT-070 lists all 4,096 planned tests as planned, not executed", () => {
    const tests = Array.from({ length: 4096 }, (_, index) => ({ id: `UT-${index}`, tier: "task-required", references: [`C${index % 100}`], source: testRef }));
    view(packageOf({ relations: { stories: [], tests, tasks: [] } as never }));
    const planned = screen.getByRole("region", { name: "Testes planejados" });
    expect(planned.querySelectorAll("li")).toHaveLength(4096);
    expect(planned.textContent?.match(/Planejado, não executado/g)).toHaveLength(4096);
  });

  it("shows the incomplete state without the test contract", () => {
    render(<TechSpecReview detail={packageOf()} documents={[documentOf("_techspec.md", SPEC)]} onOpenDocument={noop} onLoadMore={noop} />);
    expect(screen.getByRole("alert").textContent).toContain("Pacote incompleto");
  });
});
