import { describe, expect, it } from "vitest";
import { codexAssistantText } from "./codexItemTranslator";

const THREAD = "thread-main";
const input = (item: Record<string, unknown>, overrides: Record<string, unknown> = {}) => ({ threadId: THREAD, mainThreadId: THREAD, item, completed: true, ...overrides }) as Parameters<typeof codexAssistantText>[0];

describe("Codex completed assistant items", () => {
  it("emits each completed main agent message once after prior deltas", () => {
    expect(codexAssistantText(input({ type: "agentMessage", text: "Comentário intermediário" }))).toBe("Comentário intermediário");
    expect(codexAssistantText(input({ type: "agentMessage", text: "Resposta final" }))).toBe("Resposta final");
    expect(codexAssistantText(input({ type: "agentMessage", text: "delta" }, { completed: false }))).toBeNull();
  });

  it("ignores reasoning, command output, applied diffs and other item kinds", () => {
    for (const type of ["reasoning", "commandExecution", "fileChange", "toolCall"]) expect(codexAssistantText(input({ type, text: "não persistir" }))).toBeNull();
  });

  it("ignores child thread messages and joins only text blocks", () => {
    expect(codexAssistantText(input({ type: "agentMessage", text: "subagente" }, { threadId: "thread-child" }))).toBeNull();
    expect(codexAssistantText(input({ type: "agentMessage", content: [{ type: "text", text: "parte 1" }, { type: "image" }, { type: "text", text: "parte 2" }] }))).toBe("parte 1\nparte 2");
  });
});
