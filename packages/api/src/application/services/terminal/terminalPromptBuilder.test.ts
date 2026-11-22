import { describe, expect, it } from "vitest";
import { MAX_PROMPT_LENGTH, appendAttachmentsSection, buildDefaultPrompt, promptProblem, type PromptSource } from "./terminalPromptBuilder";

const SOURCE: PromptSource = {
  route: "direct_execution",
  issueNumber: 42,
  title: "Trocar 'Entar' por 'Entrar'",
  url: "https://github.com/acme/shop/issues/42",
  body: "O botão do login diz Entar.",
  complexity: "low",
  reasons: ["Mudança de texto", "Um arquivo"],
  uncertainties: ["Confirmar o idioma"],
};
const DIRECT_COMMAND = "/flow-dev:direct-executor Implemente a Issue abaixo. Rode as verificações do projeto antes de terminar e resuma o que mudou e o que foi verificado. Não faça commit, push nem PR sem eu pedir.";
const SPEC_COMMAND = "/flow-dev:spec-writer Escreva a spec da Issue abaixo e pare para minha revisão. Não implemente ainda.";
const TRUNCATION_MARKER = "[corpo cortado — leia a Issue completa no link]";

describe("buildDefaultPrompt", () => {
  it("V-02a keeps the sections in the section 7.3 order", () => {
    const prompt = buildDefaultPrompt(SOURCE);
    const positions = [DIRECT_COMMAND, "Issue #42 — Trocar 'Entar' por 'Entrar'", SOURCE.url, SOURCE.body, "Rota aprovada: Execução direta · Complexidade: Baixa", "- Mudança de texto", "- Confirmar o idioma"].map((part) => prompt.indexOf(part));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("V-02b starts a direct execution with the direct-executor command", () => {
    expect(buildDefaultPrompt(SOURCE).startsWith(DIRECT_COMMAND)).toBe(true);
  });

  it("V-02c uses the same spec-writer command for Tech Spec and PRD", () => {
    expect(buildDefaultPrompt({ ...SOURCE, route: "tech_spec" }).startsWith(SPEC_COMMAND)).toBe(true);
    expect(buildDefaultPrompt({ ...SOURCE, route: "prd", complexity: "high" }).startsWith(SPEC_COMMAND)).toBe(true);
  });

  it("V-02d writes Nenhuma when there are no uncertainties", () => {
    expect(buildDefaultPrompt({ ...SOURCE, uncertainties: [] })).toContain("Pendências informadas:\nNenhuma");
  });

  it("V-02e cuts a huge body to fit and keeps the closing sections whole", () => {
    const prompt = buildDefaultPrompt({ ...SOURCE, body: "x".repeat(50_000) });
    expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH);
    expect(prompt).toContain(`\n${TRUNCATION_MARKER}\n\nRota aprovada:`);
    expect(prompt.endsWith("- Confirmar o idioma")).toBe(true);
  });
});

describe("appendAttachmentsSection", () => {
  const attachments = [{ name: "print.png", contentType: "image/png", path: "/s/anexos/01-print.png" }, { name: "erro.log", contentType: "text/plain", path: "/s/anexos/02-erro.log" }];

  it("V-02f adds the section outside the limit with one line per attachment", () => {
    const result = appendAttachmentsSection("a".repeat(MAX_PROMPT_LENGTH), attachments);
    expect(result.length).toBeGreaterThan(MAX_PROMPT_LENGTH);
    expect(result.endsWith("\n\nAnexos (leia antes de começar):\n- print.png (image/png): /s/anexos/01-print.png\n- erro.log (text/plain): /s/anexos/02-erro.log")).toBe(true);
  });

  it("V-02f returns the prompt untouched for an empty list", () => {
    expect(appendAttachmentsSection("texto", [])).toBe("texto");
  });
});

describe("promptProblem", () => {
  it("V-02g flags an empty, blank and oversized prompt", () => {
    expect(promptProblem("")).toBe("prompt_empty");
    expect(promptProblem("   \n")).toBe("prompt_empty");
    expect(promptProblem("a".repeat(MAX_PROMPT_LENGTH + 1))).toBe("prompt_too_long");
  });

  it("V-02g accepts a prompt without a skill command and one at the limit", () => {
    expect(promptProblem("Só faça o que eu pedir")).toBeNull();
    expect(promptProblem("a".repeat(MAX_PROMPT_LENGTH))).toBeNull();
  });
});
