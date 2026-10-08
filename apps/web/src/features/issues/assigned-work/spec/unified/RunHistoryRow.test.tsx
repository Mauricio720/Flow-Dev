import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunHistoryRow } from "./RunHistoryRow";
import type { FlowRun } from "./unifiedContract";

const DETAIL = "O CompozyOS recusou abrir o projeto: line 28 is not a KEY=VALUE assignment";

function runOf(overrides: Partial<FlowRun>): FlowRun {
  return { id: "r1", actionId: "a1", attemptNumber: 1, state: "failed", terminalCode: "workspace_unavailable", kind: "create_spec", loopName: null, loopVersion: null, worktreeId: null, workspaceKind: "local", compozyVersion: "v0.3.0-beta.29", createdAt: "2026-10-07T22:46:37.000Z", finishedAt: "2026-10-07T22:46:48.000Z", bindings: [], activity: null, ...overrides } as FlowRun;
}

const warning = (preview: string) => ({ sequence: 1, kind: "warning", at: "2026-10-07T22:46:48.000Z", preview, tool: null, source: "Conector local", status: "workspace_unavailable" }) as FlowRun["activity"];

describe("RunHistoryRow", () => {
  it("shows what the connector reported next to the reason of a failed run", () => {
    render(<ul><RunHistoryRow run={runOf({ activity: warning(DETAIL) })} /></ul>);
    expect(screen.getByText(/O CompozyOS não conseguiu abrir o projeto/)).toBeTruthy();
    expect(screen.getByText(DETAIL)).toBeTruthy();
  });

  it("keeps the last ordinary update in the expanded history rather than the failure reason", () => {
    const agentMessage = { ...warning("Escrevendo o PRD"), kind: "agent_message" } as FlowRun["activity"];
    render(<ul><RunHistoryRow run={runOf({ activity: agentMessage })} /></ul>);
    expect(screen.getByRole("log").textContent).toContain("Escrevendo o PRD");
    expect(screen.getByText("Escrevendo o PRD").closest("summary")).toBeNull();
  });

  it("shows the provider limit and its actual message for a failed implementation Loop", () => {
    const preview = "Etapas do Loop: 2/5 concluídas. You’ve hit your usage limit. Try again at 4:59 PM.";
    render(<ul><RunHistoryRow run={runOf({ kind: "loop", loopName: "implement-tasks", terminalCode: "usage_limit_exceeded", activity: warning(preview) })} /></ul>);
    expect(screen.getByText(/O Codex informou limite de uso/)).toBeTruthy();
    expect(screen.getByText(preview)).toBeTruthy();
  });
});
