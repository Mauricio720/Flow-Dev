import { describe, expect, it } from "vitest";
import type { FlowAction } from "../../../application/services/task-flow/flowContracts";
import { buildUnifiedPrompt } from "./unifiedPrompt";

const runtime = { connectionId: "c1", providerId: "claude", modelId: "model-1", reasoningEffort: null };
const task = { title: "Corrigir rótulo", bodyMarkdown: "Corpo da issue", issueNumber: 42 };
const action: FlowAction = { kind: "direct_execute", language: "pt-BR", runtime, workspace: { kind: "local" } };

describe("direct execution prompt", () => {
  it("hands the issue to the direct executor skill without asking for spec documents", () => {
    const prompt = buildUnifiedPrompt({ action, task, workspaceRoot: "/Users/developer/flow/" });
    expect(prompt).toContain("Use the flow-direct-executor skill to implement GitHub issue #42: Corrigir rótulo.");
    expect(prompt).toContain("without writing a PRD, a TechSpec or task files");
    expect(prompt).not.toContain("_spec.md");
    expect(prompt.endsWith("Corpo da issue")).toBe(true);
  });

  it("pins the outcome report location, statuses and language", () => {
    const prompt = buildUnifiedPrompt({ action, task, workspaceRoot: "/Users/developer/flow/" });
    expect(prompt).toContain("/Users/developer/flow/.flow-spec/_direct_outcome.md");
    expect(prompt).toContain("COMPLETED, PARTIAL, BLOCKED, ROUTING_MISMATCH");
    expect(prompt).toContain("Brazilian Portuguese (pt-BR)");
    expect(prompt).toContain("Never run commit, push, merge or publication commands.");
  });
});
