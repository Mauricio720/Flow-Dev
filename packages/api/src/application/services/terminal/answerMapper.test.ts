import { describe, expect, it } from "vitest";
import type { PermissionPayload, QuestionPayload } from "../../terminal/sessionInteraction";
import type { SessionRequestRecord } from "../../terminal/sessionInteractionPorts";
import { mapAnswerToPermissionResult } from "./answerMapper";

const QUESTIONS: QuestionPayload = { questions: [{ question: "Quais verificações?", header: "V", multiSelect: true, options: [{ label: "lint", description: "" }, { label: "test", description: "" }] }] };
const BASH_INPUT = { command: "pnpm test", description: "Roda os testes" };
const SUGGESTION = { type: "addRules", rules: [{ toolName: "Bash", ruleContent: "pnpm test:*" }], behavior: "allow", destination: "session" };
const PERMISSION: PermissionPayload = { toolName: "Bash", title: "Rodar comando:", body: "pnpm test", truncated: false, suggestedRule: "Bash(pnpm test:*)", suggestions: [SUGGESTION] };

function requestOf(kind: "question" | "permission", payload: QuestionPayload | PermissionPayload): SessionRequestRecord {
  return { id: "r1", sessionId: "s1", kind, toolUseId: "toolu_1", payload, status: "answered", answer: null, answeredBy: "u1", createdAt: new Date(), answeredAt: new Date() };
}

describe("mapAnswerToPermissionResult", () => {
  it("V-22g allows a question with the original questions and the answers given", () => {
    const answers = { "Quais verificações?": ["lint", "test"] };
    const result = mapAnswerToPermissionResult(requestOf("question", QUESTIONS), { answers }, {});
    expect(result).toEqual({ behavior: "allow", updatedInput: { questions: QUESTIONS.questions, answers } });
  });

  it("V-22g allows a tool with its original input", () => {
    const result = mapAnswerToPermissionResult(requestOf("permission", PERMISSION), { decision: "allow" }, BASH_INPUT);
    expect(result).toEqual({ behavior: "allow", updatedInput: BASH_INPUT });
  });

  it("V-22g sends the suggestion to the local project settings on allow_always", () => {
    const result = mapAnswerToPermissionResult(requestOf("permission", PERMISSION), { decision: "allow_always" }, BASH_INPUT);
    expect(result).toEqual({ behavior: "allow", updatedInput: BASH_INPUT, updatedPermissions: [{ ...SUGGESTION, destination: "localSettings" }] });
  });

  it("V-22g denies with the reason given, or with the default message without one", () => {
    expect(mapAnswerToPermissionResult(requestOf("permission", PERMISSION), { decision: "deny", reason: "Só rode o lint" }, BASH_INPUT)).toEqual({ behavior: "deny", message: "Só rode o lint" });
    expect(mapAnswerToPermissionResult(requestOf("permission", PERMISSION), { decision: "deny" }, BASH_INPUT)).toEqual({ behavior: "deny", message: "Recusado pela pessoa" });
  });
});
