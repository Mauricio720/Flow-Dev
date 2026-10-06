import { describe, expect, it } from "vitest";
import { classifyLabels, normalizeLabels, resolveLabels } from "./labelRules";
import type { IssueSource } from "./taskContracts";

const draft = { title: "Corrigir total", context: "Ao remover item o total permanece antigo", objective: "Recalcular total", constraints: [], relevantContext: [], productConsiderations: [], references: [] };

function file(path: string): IssueSource {
  return { type: "project-file", path, line: null, repository: null, issueNumber: null, url: null };
}

describe("task label rules", () => {
  it("falls back to the generic label when no area is recognized", () => expect(classifyLabels(draft)).toEqual(["generica"]));
  it("classifies by the files a draft cites", () => {
    expect(classifyLabels({ ...draft, references: [file("apps/web/src/components/Cart.tsx")] })).toEqual(["frontend"]);
    expect(classifyLabels({ ...draft, relevantContext: [{ statement: "Soma os itens", source: file("packages/api/src/controllers/cartController.ts") }] })).toEqual(["backend"]);
    expect(classifyLabels({ ...draft, references: [file(".github/workflows/ci.yml"), file("docs/setup.md")] })).toEqual(["infra", "docs"]);
  });
  it("classifies by the wording of the draft, ignoring accents and case", () => {
    expect(classifyLabels({ ...draft, objective: "Ajustar o BOTÃO da página de checkout" })).toEqual(["frontend"]);
    expect(classifyLabels({ ...draft, constraints: ["Manter o endpoint atual e a migração reversível"] })).toEqual(["backend"]);
  });
  it("assigns every recognized area in catalog order", () => expect(classifyLabels({ ...draft, title: "Expor o endpoint da API e ajustar o layout da tela" })).toEqual(["frontend", "backend"]));
  it("ignores a lone mention and an area far weaker than the dominant one", () => {
    expect(classifyLabels({ ...draft, context: "A interface do repositório segue SOLID" })).toEqual(["generica"]);
    const visual = { ...draft, objective: "Ajustar layout, botão e modal da tela", references: [file("src/components/Cart.tsx"), file("src/components/Total.tsx")] };
    expect(classifyLabels({ ...visual, constraints: ["Não mudar a API nem o endpoint"] })).toEqual(["frontend"]);
  });
  it("ignores cited GitHub issues when reading paths", () => {
    const issue: IssueSource = { type: "github-issue", path: "docs/setup.md", line: null, repository: "acme/cart", issueNumber: 4, url: null };
    expect(classifyLabels({ ...draft, references: [issue] })).toEqual(["generica"]);
  });
  it("deduplicates and orders chosen labels", () => expect(normalizeLabels(["docs", "frontend", "docs"])).toEqual(["frontend", "docs"]));
  it("keeps chosen labels and classifies only when none were chosen", () => {
    const visual = { ...draft, title: "Ajustar o layout da tela" };
    expect(resolveLabels({ ...visual, labels: ["backend"] })).toEqual(["backend"]);
    expect(resolveLabels({ ...visual, labels: [] })).toEqual(["frontend"]);
  });
});
