import { describe, expect, it } from "vitest";
import { codexTurnInput } from "../terminal/codex/codexTurnInput";
import { caveatsPrompt, executeContinuation, executeInitialPrompt, reviewContinuation, reviewInitialPrompt, stageDocumentPath } from "./reviewPrompts";

const FOLDER = "docs/specs/x";
const DOCUMENT = `${FOLDER}/reviews/etapa.md`;
const REPORT = `${FOLDER}/reviews/review-004.md`;
const PARTIAL_NOTE = "Há tarefas não concluídas: faça a revisão parcial e marque o relatório como parcial.";
const REVIEW_INITIAL = `/flow-dev:spec-conformance Revise a feature inteira contra a spec e as tarefas da pasta ${FOLDER}. Salve o relatório em ${FOLDER}/reviews/ com o próximo número livre e registre a linha na "Revisão final" do _tasks.md. Ao terminar, grave em ${DOCUMENT} a linha "etapa: execute" se o veredito for REPROVADO, "etapa: aprovada" se for APROVADO ou "etapa: ressalvas" se for APROVADO COM RESSALVAS, e a linha "relatorio: " com o caminho do relatório.`;

function expectInvalidPath(run: () => string) {
  expect(run).toThrowError(expect.objectContaining({ reason: "invalid_path" }));
}

describe("review cycle prompts", () => {
  it("V-03a builds the exact initial review prompt", () => {
    expect(stageDocumentPath(FOLDER)).toBe(DOCUMENT);
    expect(reviewInitialPrompt({ folder: FOLDER, partial: false })).toBe(REVIEW_INITIAL);
  });

  it("V-03b builds the exact continuation and appends the partial note only to review prompts", () => {
    expect(reviewContinuation({ folder: FOLDER, partial: false })).toBe(`A execução terminou as correções. Revise de novo a feature com a mesma skill, conferindo as correções e tudo o que elas tocaram. Salve um relatório novo em ${FOLDER}/reviews/ e atualize ${DOCUMENT} como na primeira vez.`);
    expect(reviewInitialPrompt({ folder: FOLDER, partial: true })).toBe(`${REVIEW_INITIAL} ${PARTIAL_NOTE}`);
    expect(reviewContinuation({ folder: FOLDER, partial: true })).toBe(`A execução terminou as correções. Revise de novo a feature com a mesma skill, conferindo as correções e tudo o que elas tocaram. Salve um relatório novo em ${FOLDER}/reviews/ e atualize ${DOCUMENT} como na primeira vez. ${PARTIAL_NOTE}`);
    expect(executeInitialPrompt({ folder: FOLDER, reportPath: REPORT })).not.toContain(PARTIAL_NOTE);
    expect(executeContinuation({ folder: FOLDER, reportPath: REPORT })).not.toContain(PARTIAL_NOTE);
  });

  it("V-03c builds exact execution and caveats prompts with protected files", () => {
    const protections = "Não altere a spec nem os relatórios de revisão. Não faça commit, push nem PR sem eu pedir.";
    expect(executeInitialPrompt({ folder: FOLDER, reportPath: REPORT })).toBe(`Corrija os achados do relatório ${REPORT}, na ordem do "Prompt de correção" dele, e rode as verificações que ele pede antes de terminar. ${protections} Ao terminar, grave a linha "etapa: review" em ${DOCUMENT}.`);
    expect(executeContinuation({ folder: FOLDER, reportPath: REPORT })).toBe(`A revisão reprovou de novo em ${REPORT}. Corrija os achados dele como antes e, ao terminar, grave "etapa: review" em ${DOCUMENT}.`);
    expect(caveatsPrompt({ folder: FOLDER, reportPath: REPORT })).toBe(`Corrija as ressalvas do relatório ${REPORT} que dependem de código, na ordem do "Prompt de correção" dele, e rode as verificações que ele pede antes de terminar. ${protections} Ao terminar, grave "etapa: review" em ${DOCUMENT}.`);
  });

  it("V-03d gives a replacement session the initial prompt and current report", () => {
    expect(executeInitialPrompt({ folder: FOLDER, reportPath: REPORT })).toContain(REPORT);
    expect(reviewInitialPrompt({ folder: FOLDER, partial: false })).toBe(REVIEW_INITIAL);
  });

  it("V-03e refuses unsafe folders and reports outside the task folder", () => {
    for (const folder of ["docs/specs/../x", "/tmp/spec", "docs\\specs\\x"]) expectInvalidPath(() => stageDocumentPath(folder));
    expectInvalidPath(() => executeInitialPrompt({ folder: FOLDER, reportPath: "docs/specs/y/reviews/review-004.md" }));
  });

  it("V-03f routes the initial review prompt to the spec-conformance skill in Codex", () => {
    const result = codexTurnInput({ prompt: reviewInitialPrompt({ folder: FOLDER, partial: false }), contextDir: "/session/context" });
    expect(result.input[0]).toEqual({ type: "skill", name: "spec-conformance", path: "/session/context/skills/spec-conformance/SKILL.md" });
  });
});
