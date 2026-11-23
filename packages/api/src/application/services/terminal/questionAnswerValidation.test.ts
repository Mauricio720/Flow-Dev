import { describe, expect, it } from "vitest";
import type { Question } from "../../terminal/sessionInteraction";
import { validatePermissionDecision } from "./permissionDecisionValidation";
import { validateQuestionAnswers } from "./questionAnswerValidation";

const VISIBILITY: Question = { question: "Quem pode ver os comentários?", header: "Visibilidade", multiSelect: false, options: [{ label: "Só membros (Recomendado)", description: "d1" }, { label: "Qualquer pessoa", description: "d2" }] };
const CHECKS: Question = { question: "Quais verificações rodar?", header: "Verificações", multiSelect: true, options: [{ label: "lint", description: "" }, { label: "typecheck", description: "" }, { label: "test", description: "" }] };
const FREE_TEXT_LIMIT = 2_000;

describe("question answer validation", () => {
  it("V-22a maps a single-choice label to its string", () => {
    const result = validateQuestionAnswers([VISIBILITY], { [VISIBILITY.question]: { labels: ["Qualquer pessoa"] } });
    expect(result).toEqual({ ok: true, answers: { "Quem pode ver os comentários?": "Qualquer pessoa" } });
  });

  it("V-22b maps a multi-select to an array and the single choice to a string", () => {
    const result = validateQuestionAnswers([VISIBILITY, CHECKS], { [VISIBILITY.question]: { labels: ["Só membros (Recomendado)"] }, [CHECKS.question]: { labels: ["lint", "test"] } });
    expect(result).toEqual({ ok: true, answers: { [VISIBILITY.question]: "Só membros (Recomendado)", [CHECKS.question]: ["lint", "test"] } });
  });

  it("V-22b reports answer_incomplete when a question has no answer, or an empty one", () => {
    const first = { [VISIBILITY.question]: { labels: ["Qualquer pessoa"] } };
    expect(validateQuestionAnswers([VISIBILITY, CHECKS], first)).toEqual({ ok: false, reason: "answer_incomplete" });
    expect(validateQuestionAnswers([VISIBILITY, CHECKS], { ...first, [CHECKS.question]: { labels: [] } })).toEqual({ ok: false, reason: "answer_incomplete" });
  });

  it("V-22c accepts Other with 2000 characters as free text", () => {
    const other = "z".repeat(FREE_TEXT_LIMIT);
    const result = validateQuestionAnswers([VISIBILITY], { [VISIBILITY.question]: { labels: [], other } });
    expect(result).toEqual({ ok: true, answers: { [VISIBILITY.question]: other } });
  });

  it("V-22c rejects Other with 2001 characters, empty or blank", () => {
    for (const other of ["z".repeat(FREE_TEXT_LIMIT + 1), "", "   "]) {
      expect(validateQuestionAnswers([VISIBILITY], { [VISIBILITY.question]: { labels: [], other } })).toEqual({ ok: false, reason: "answer_invalid" });
    }
  });

  it("V-22c rejects a label that is not in the request, a repeated label and an answer to an unknown question", () => {
    const invalid = { ok: false, reason: "answer_invalid" };
    expect(validateQuestionAnswers([VISIBILITY], { [VISIBILITY.question]: { labels: ["Ninguém"] } })).toEqual(invalid);
    expect(validateQuestionAnswers([CHECKS], { [CHECKS.question]: { labels: ["lint", "lint"] } })).toEqual(invalid);
    expect(validateQuestionAnswers([VISIBILITY], { [VISIBILITY.question]: { labels: ["Qualquer pessoa"] }, "Outra pergunta?": { labels: ["x"] } })).toEqual(invalid);
  });

  it("rejects two choices for a single-choice question, a label together with Other included", () => {
    const invalid = { ok: false, reason: "answer_invalid" };
    expect(validateQuestionAnswers([VISIBILITY], { [VISIBILITY.question]: { labels: ["Qualquer pessoa", "Só membros (Recomendado)"] } })).toEqual(invalid);
    expect(validateQuestionAnswers([VISIBILITY], { [VISIBILITY.question]: { labels: ["Qualquer pessoa"], other: "Outro" } })).toEqual(invalid);
  });

  it("accepts labels plus Other on a multi-select question", () => {
    const result = validateQuestionAnswers([CHECKS], { [CHECKS.question]: { labels: ["lint"], other: "e2e" } });
    expect(result).toEqual({ ok: true, answers: { [CHECKS.question]: ["lint", "e2e"] } });
  });
});

describe("permission decision validation", () => {
  const RULE = "Bash(pnpm test:*)";

  it("V-22d rejects allow_always without a suggested rule and accepts it with one", () => {
    expect(validatePermissionDecision({ decision: "allow_always", suggestedRule: null })).toEqual({ ok: false, reason: "answer_invalid" });
    expect(validatePermissionDecision({ decision: "allow_always", suggestedRule: RULE })).toEqual({ ok: true });
  });

  it("V-22d rejects a reason of 2001 characters, accepts 2000 and accepts a deny without a reason", () => {
    expect(validatePermissionDecision({ decision: "deny", reason: "r".repeat(FREE_TEXT_LIMIT + 1), suggestedRule: null })).toEqual({ ok: false, reason: "answer_invalid" });
    expect(validatePermissionDecision({ decision: "deny", reason: "r".repeat(FREE_TEXT_LIMIT), suggestedRule: null })).toEqual({ ok: true });
    expect(validatePermissionDecision({ decision: "deny", suggestedRule: null })).toEqual({ ok: true });
  });

  it("accepts allow with or without a suggested rule and rejects an unknown decision", () => {
    expect(validatePermissionDecision({ decision: "allow", suggestedRule: null })).toEqual({ ok: true });
    expect(validatePermissionDecision({ decision: "maybe" as never, suggestedRule: RULE })).toEqual({ ok: false, reason: "answer_invalid" });
  });
});
