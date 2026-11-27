import { describe, expect, it } from "vitest";
import { parseStageDocument, readStage, type StageReadInput } from "./reviewStageReader";

const FOLDER = "docs/specs/x";
const SESSION = "session-review";
const START = new Date("2026-11-25T10:00:00Z");
const LATER = new Date("2026-11-25T10:01:00Z");
const DOCUMENT = `${FOLDER}/reviews/etapa.md`;
const REPORT = `${FOLDER}/reviews/review-005.md`;

function edit(path: string, sessionId = SESSION, at = LATER) {
  return { path, sessionId, at };
}

function input(overrides: Partial<StageReadInput> = {}): StageReadInput {
  return { role: "review", folder: FOLDER, stepStartedAt: START, sessionId: SESSION, edits: [edit(DOCUMENT), edit(REPORT)], modifiedAt: {}, content: `etapa: execute\nrelatorio: ${REPORT}`, previousReportNumber: 4, ...overrides };
}

describe("review stage document", () => {
  it("V-01a accepts a fresh review report edited during the current turn", () => {
    expect(readStage(input())).toEqual({ ok: true, stage: "execute", reportPath: REPORT, reportNumber: 5 });
  });

  it("V-01b accepts review verdicts and an execution return without a report", () => {
    expect(readStage(input({ content: `etapa: aprovada\nrelatorio: ${REPORT}` }))).toMatchObject({ ok: true, stage: "aprovada", reportPath: REPORT, reportNumber: 5 });
    expect(readStage(input({ content: `etapa: ressalvas\nrelatorio: ${REPORT}` }))).toMatchObject({ ok: true, stage: "ressalvas", reportPath: REPORT, reportNumber: 5 });
    expect(readStage(input({ role: "execute", content: "etapa: review", edits: [edit(DOCUMENT)] }))).toEqual({ ok: true, stage: "review", reportPath: null, reportNumber: null });
  });

  it("V-01c rejects a stage that belongs to the other role", () => {
    expect(readStage(input({ content: "etapa: review" }))).toEqual({ ok: false, reason: `A sessão de revisão terminou sem atualizar ${DOCUMENT}.` });
    expect(readStage(input({ role: "execute", content: "etapa: execute", edits: [edit(DOCUMENT)] }))).toEqual({ ok: false, reason: `A sessão de execução terminou sem atualizar ${DOCUMENT}.` });
  });

  it("V-01d ignores an old document edit and V-01e ignores the other session", () => {
    expect(readStage(input({ edits: [edit(DOCUMENT, SESSION, START), edit(REPORT)] }))).toMatchObject({ ok: false, reason: `A sessão de revisão terminou sem atualizar ${DOCUMENT}.` });
    expect(readStage(input({ edits: [edit(DOCUMENT, "session-execute"), edit(REPORT)] }))).toMatchObject({ ok: false, reason: `A sessão de revisão terminou sem atualizar ${DOCUMENT}.` });
  });

  it("V-01f rejects an old report or one without a same-turn edit", () => {
    expect(readStage(input({ content: `etapa: execute\nrelatorio: ${FOLDER}/reviews/review-004.md`, edits: [edit(DOCUMENT), edit(`${FOLDER}/reviews/review-004.md`)] }))).toEqual({ ok: false, reason: `O relatório indicado em ${DOCUMENT} não é novo.` });
    expect(readStage(input({ edits: [edit(DOCUMENT)] }))).toEqual({ ok: false, reason: `O relatório indicado em ${DOCUMENT} não é novo.` });
  });

  it.each(["docs/specs/y/reviews/review-005.md", `${FOLDER}/reviews/../review-005.md`, "/tmp/review-005.md", `${FOLDER}/reviews/nested/review-005.md`])("V-01g rejects report path %s", (reportPath) => {
    expect(readStage(input({ content: `etapa: execute\nrelatorio: ${reportPath}`, edits: [edit(DOCUMENT), edit(reportPath)] }))).toEqual({ ok: false, reason: `O relatório indicado em ${DOCUMENT} não é novo.` });
  });

  it("V-01h reads only known keys, trims values and uses the report named by the document", () => {
    const content = `# título\n etapa : execute \n motivo: qualquer\n relatorio : ${REPORT} `;
    expect(parseStageDocument(content)).toEqual({ etapa: "execute", relatorio: REPORT });
    expect(readStage(input({ content, edits: [edit(DOCUMENT), edit(REPORT), edit(`${FOLDER}/reviews/review-006.md`)] }))).toEqual({ ok: true, stage: "execute", reportPath: REPORT, reportNumber: 5 });
  });

  it("accepts a document and report written by a shell command after the step started", () => {
    const modifiedAt = { [DOCUMENT]: LATER, [REPORT]: LATER };
    expect(readStage(input({ edits: [], modifiedAt, content: `etapa: ressalvas\nrelatorio: ${REPORT}` }))).toEqual({ ok: true, stage: "ressalvas", reportPath: REPORT, reportNumber: 5 });
    expect(readStage(input({ role: "execute", content: "etapa: review", edits: [], modifiedAt: { [DOCUMENT]: LATER } }))).toEqual({ ok: true, stage: "review", reportPath: null, reportNumber: null });
  });

  it("rejects files last modified before the step started", () => {
    expect(readStage(input({ edits: [edit(REPORT)], modifiedAt: { [DOCUMENT]: START } }))).toEqual({ ok: false, reason: `A sessão de revisão terminou sem atualizar ${DOCUMENT}.` });
    expect(readStage(input({ edits: [edit(DOCUMENT)], modifiedAt: { [DOCUMENT]: LATER, [REPORT]: START } }))).toEqual({ ok: false, reason: `O relatório indicado em ${DOCUMENT} não é novo.` });
  });

  it("rejects missing content and unsafe folder paths", () => {
    expect(readStage(input({ content: null }))).toMatchObject({ ok: false, reason: `A sessão de revisão terminou sem atualizar ${DOCUMENT}.` });
    expect(readStage(input({ folder: "docs/specs/../other" }))).toMatchObject({ ok: false });
  });
});
