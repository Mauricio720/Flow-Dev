import { describe, expect, it } from "vitest";
import { draftInteraction, interactionAnswerValue, permissionTargetDigest, validateAnswer, validatePermission, type StoredInteraction } from "./specInteractionRules";

const base: StoredInteraction = { id: "i1", attemptId: "R1", stage: "prd", kind: "question", status: "pending", description: "Qual prazo?", choices: ["Thirty days", "Ninety days"], target: null, targetDigest: null, runtimeTurnId: "t1", attemptState: "waiting", currentAttemptId: "R1", attemptTurnId: "t1" };
const permission: StoredInteraction = { ...base, id: "p1", kind: "permission", choices: null, target: { tool: "write", path: "_prd.md" }, targetDigest: permissionTargetDigest({ tool: "write", path: "_prd.md" }) };
const rejected = (action: () => void) => { try { action(); return null; } catch (error) { return (error as { reason: string }).reason; } };

describe("SpecInteractionService rules", () => {
  it("UT-009 selects exactly the first recorded choice after an explicit submission", () => {
    expect(() => validateAnswer(base, { choiceIndex: 0 })).not.toThrow();
    expect(interactionAnswerValue(base, { choiceIndex: 0 })).toBe("Thirty days");
    expect(interactionAnswerValue(base, { text: "Outro" })).toBe("Outro");
  });

  it("rejects out-of-range choices, ambiguous responses and blank text with invalid_answer", () => {
    expect(rejected(() => validateAnswer(base, { choiceIndex: 2 }))).toBe("invalid_answer");
    expect(rejected(() => validateAnswer(base, {}))).toBe("invalid_answer");
    expect(rejected(() => validateAnswer(base, { choiceIndex: 0, text: "x" }))).toBe("invalid_answer");
    expect(rejected(() => validateAnswer(base, { text: "  " }))).toBe("invalid_answer");
    expect(rejected(() => validateAnswer({ ...base, choices: null }, { choiceIndex: 0 }))).toBe("invalid_answer");
  });

  it("UT-010 rejects an allow whose action digest differs from the recorded permission", () => {
    expect(rejected(() => validatePermission(permission, { actionDigest: "f".repeat(64), decision: "allow_once" }))).toBe("invalid_permission");
    expect(() => validatePermission(permission, { actionDigest: permission.targetDigest!, decision: "allow_once" })).not.toThrow();
  });

  it("IT-191 blocks an allow for a push or an out-of-scope write but still permits denying it", () => {
    const push = { ...permission, target: { tool: "bash", command: "git push origin main" } };
    const input = { actionDigest: permissionTargetDigest(push.target), decision: "allow_once" as const };
    expect(rejected(() => validatePermission({ ...push, targetDigest: input.actionDigest }, input))).toBe("permission_out_of_scope");
    expect(() => validatePermission({ ...push, targetDigest: input.actionDigest }, { ...input, decision: "deny_once" })).not.toThrow();
  });

  it("IT-042 and IT-210 block interactions whose description or turn is incomplete", () => {
    const context = { sessionId: "s1", workspaceRoot: null };
    const runtime = { id: "i", providerRequestId: "r", turnId: "t1", kind: "permission" as const, status: "pending", title: "", choices: [], decisions: ["allow_once", "allow_always"], toolId: "write", resolution: null };
    expect(draftInteraction(runtime, context)).toMatchObject({ status: "blocked", target: null, targetDigest: null });
    expect(draftInteraction({ ...runtime, kind: "question", title: "  ", toolId: null }, context).status).toBe("blocked");
    expect(draftInteraction({ ...runtime, kind: "question", title: "Prazo?", turnId: null }, context).status).toBe("blocked");
    expect(draftInteraction({ ...runtime, title: "Escrever _prd.md" }, context)).toMatchObject({ status: "pending", target: { tool: "write", path: "_prd.md" } });
  });

  it("IT-047 derives a different digest for a different target so a previous grant cannot match", () => {
    expect(permissionTargetDigest({ tool: "write", path: "_prd.md" })).not.toBe(permissionTargetDigest({ tool: "write", path: "_techspec.md" }));
  });
});
