import { describe, expect, it } from "vitest";
import { specAnswerInputSchema, specPermissionInputSchema, specStartInputSchema } from "./spec";

const P1 = "10000000-0000-4000-8000-000000000001";
const T1 = "20000000-0000-4000-8000-000000000001";
const K1 = "60000000-0000-4000-8000-000000000001";
const command = { projectId: P1, taskId: T1, requestKey: K1, expectedSpecVersion: 0 };

describe("Spec API schemas", () => {
  it("UT-001 accepts a first start for the prd stage", () => {
    expect(specStartInputSchema.parse({ ...command, stage: "prd" })).toEqual({ ...command, stage: "prd" });
  });

  it("UT-002 rejects an unknown stage with invalid_input", () => {
    const result = specStartInputSchema.safeParse({ ...command, stage: "implement" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("spec:invalid_input");
  });

  it("rejects blank answers, oversized text and unknown fields", () => {
    const answer = { ...command, attemptId: T1, interactionId: P1 };
    expect(specAnswerInputSchema.safeParse({ ...answer, response: { text: "  " } }).success).toBe(false);
    expect(specAnswerInputSchema.safeParse({ ...answer, response: { text: "a".repeat(16_385) } }).success).toBe(false);
    expect(specAnswerInputSchema.safeParse({ ...answer, response: { text: "a".repeat(16_384) } }).success).toBe(true);
    expect(specAnswerInputSchema.safeParse({ ...answer, response: { choiceIndex: -1 } }).success).toBe(false);
    expect(specStartInputSchema.safeParse({ ...command, stage: "prd", userId: P1 }).success).toBe(false);
  });

  it("limits permission decisions to one-time choices", () => {
    const permission = { ...command, attemptId: T1, interactionId: P1, actionDigest: "a".repeat(64) };
    expect(specPermissionInputSchema.safeParse({ ...permission, decision: "allow_always" }).success).toBe(false);
    expect(specPermissionInputSchema.safeParse({ ...permission, decision: "deny_once" }).success).toBe(true);
  });
});
