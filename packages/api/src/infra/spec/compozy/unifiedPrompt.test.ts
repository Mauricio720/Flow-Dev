import { describe, expect, it } from "vitest";
import type { FlowAction } from "../../../application/services/task-flow/flowContracts";
import { buildUnifiedPrompt } from "./unifiedPrompt";

const runtime = { connectionId: "c1", providerId: "codex", modelId: "gpt", reasoningEffort: null };
const task = { title: "Melhorar leitura", bodyMarkdown: "Corpo da issue", issueNumber: 42 };

function action(language: "pt-BR" | "en"): FlowAction {
  return { kind: "create_spec", language, runtime, workspace: { kind: "isolated" } };
}

describe("buildUnifiedPrompt", () => {
  it("requires a concise executive summary and Brazilian Portuguese artifacts", () => {
    const prompt = buildUnifiedPrompt({ action: action("pt-BR"), task });
    expect(prompt).toContain("Brazilian Portuguese (pt-BR)");
    expect(prompt).toContain('"Resumo executivo"');
    expect(prompt).toContain("what changes, why it matters, key decisions, risks or constraints, and unresolved questions");
  });

  it("switches the complete artifact language and heading to English", () => {
    const prompt = buildUnifiedPrompt({ action: action("en"), task });
    expect(prompt).toContain("Write all human-facing artifact content in English");
    expect(prompt).toContain('"Executive summary"');
  });

  it("targets artifacts to the native linked checkout when one is provided", () => {
    const prompt = buildUnifiedPrompt({ action: action("en"), task, workspaceRoot: "/Users/developer/flow" });
    expect(prompt).toContain("/Users/developer/flow/.flow-spec");
    expect(prompt).not.toContain("/workspace/.flow-spec");
  });
});
