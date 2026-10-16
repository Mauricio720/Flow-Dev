import { describe, expect, it } from "vitest";
import type { FlowAction } from "../../../application/services/task-flow/flowContracts";
import { buildUnifiedPrompt } from "./unifiedPrompt";

const runtime = { connectionId: "c1", providerId: "claude", modelId: "model-1", reasoningEffort: null };
const task = { title: "Corrigir rótulo", bodyMarkdown: "Corpo da issue", issueNumber: 42 };
const action: FlowAction = { kind: "open_pull_request", language: "pt-BR", runtime, workspace: { kind: "local" } };

describe("pull request prompt", () => {
  it("hands the finished worktree to the pull request skill", () => {
    const prompt = buildUnifiedPrompt({ action, task, workspaceRoot: "/Users/developer/flow/" });
    expect(prompt).toContain("Use the flow-pull-request skill to publish the finished work for GitHub issue #42: Corrigir rótulo.");
    expect(prompt).toContain("The pull request closes issue #42.");
    expect(prompt).not.toContain("Review");
    expect(prompt.endsWith("Corpo da issue")).toBe(true);
  });

  it("targets the branch the issue branch came from and falls back to the default branch only without it", () => {
    const prompt = buildUnifiedPrompt({ action, task, workspaceRoot: "/Users/developer/flow/" });
    expect(prompt).toContain("git config --get branch.<current branch>.flowbase");
    expect(prompt).toContain("Only when that prints nothing, use the repository default branch.");
  });

  it("keeps the issue open and lists what was left pending when the operator accepted a partial result", () => {
    const pending = "O segundo termo de aceite ficou fora de escopo.";
    const prompt = buildUnifiedPrompt({ action, task: { ...task, acceptedPending: pending }, workspaceRoot: "/Users/developer/flow/" });
    expect(prompt).toContain('reference it with "Refs #42" instead of "Closes #42"');
    expect(prompt).toContain(pending);
    expect(prompt).not.toContain("The pull request closes issue #42.");
  });

  it("pins the outcome report, the statuses, the language and the publication limits", () => {
    const prompt = buildUnifiedPrompt({ action, task, workspaceRoot: "/Users/developer/flow/" });
    expect(prompt).toContain("/Users/developer/flow/.flow-spec/_pull_request_outcome.md");
    expect(prompt).toContain("OPENED, BLOCKED");
    expect(prompt).toContain("Brazilian Portuguese (pt-BR)");
    expect(prompt).toContain("never force-push, merge or delete branches");
  });
});
