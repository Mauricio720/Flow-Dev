import { describe, expect, it } from "vitest";
import { answerRunQuestionSchema, savePlanSchema } from "./taskFlow";

const id = "00000000-0000-4000-8000-000000000001";
const action = { kind: "create_spec", runtime: { connectionId: id, providerId: "codex", modelId: "gpt", reasoningEffort: null }, workspace: { kind: "isolated" } };
const input = { projectId: id, taskId: id, expectedRevision: 0, idempotencyKey: id };

describe("task flow language input", () => {
  it("defaults omitted language to pt-BR for compatibility", () => {
    expect(savePlanSchema.parse({ ...input, actions: [action] }).actions[0]).toMatchObject({ language: "pt-BR" });
  });

  it("accepts English and rejects unsupported values", () => {
    expect(savePlanSchema.parse({ ...input, actions: [{ ...action, language: "en" }] }).actions[0]).toMatchObject({ language: "en" });
    expect(savePlanSchema.safeParse({ ...input, actions: [{ ...action, language: "fr" }] }).success).toBe(false);
  });
});

describe("run question answers", () => {
  const question = { projectId: id, taskId: id, runId: id, interactionId: "question-1" };
  it("accepts one bounded answer and rejects ambiguous or empty submissions", () => {
    expect(answerRunQuestionSchema.safeParse({ ...question, choiceIndex: 0 }).success).toBe(true);
    expect(answerRunQuestionSchema.safeParse({ ...question, text: "Minha decisão" }).success).toBe(true);
    expect(answerRunQuestionSchema.safeParse({ ...question, text: " " }).success).toBe(false);
    expect(answerRunQuestionSchema.safeParse({ ...question, choiceIndex: 0, text: "outro" }).success).toBe(false);
  });
});
