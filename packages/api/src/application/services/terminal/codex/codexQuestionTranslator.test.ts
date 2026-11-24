import { describe, expect, it } from "vitest";
import { translateCodexQuestion, translateCodexQuestionAnswer } from "./codexQuestionTranslator";
import { translateCodexRequest } from "./codexRequestTranslator";

const question = (id: string, question: string, extra: Record<string, unknown> = {}) => ({ id, question, header: "Resposta", isOther: false, isSecret: false, options: [{ label: "Sim", description: "Permitir" }], ...extra });

describe("Codex request user input translation", () => {
  it("preserves ids, descriptions, secret and explicit Other support for duplicate question text", () => {
    const result = translateCodexQuestion({ threadId: "child", turnId: "turn", itemId: "item", questions: [question("q1", "Qual?"), question("q2", "Qual?", { isOther: true, isSecret: true, options: null })] });
    expect(result).toMatchObject({ toolName: "AskUserQuestion", toolUseId: "item", input: { questions: [
      { id: "q1", question: "Qual?", options: [{ label: "Sim", description: "Permitir" }], multiSelect: false, secret: false, allowOther: false },
      { id: "q2", question: "Qual?", options: [], multiSelect: false, secret: true, allowOther: true },
    ] } });
  });

  it("keeps subagent questions classifiable and formats selected labels and free text for Codex", () => {
    const request = translateCodexRequest({ method: "item/tool/requestUserInput", params: { threadId: "child", turnId: "turn", itemId: "item", questions: [question("q", "Qual?")] } });
    expect(request).toMatchObject({ toolName: "AskUserQuestion", toolUseId: "item" });
    expect(translateCodexQuestionAnswer({ behavior: "allow", updatedInput: { questions: [], answers: { q: "Sim", other: "texto livre" } } })).toEqual({ answers: { q: { answers: ["Sim"] }, other: { answers: ["texto livre"] } } });
  });

  it("returns no Codex answer payload for a denied or malformed runtime result", () => {
    expect(translateCodexQuestionAnswer({ behavior: "deny", message: "Recusado" })).toBeNull();
    expect(translateCodexRequest({ method: "unknown", params: { threadId: "t", turnId: "u", itemId: "i", questions: [] } })).toBeNull();
  });
});
