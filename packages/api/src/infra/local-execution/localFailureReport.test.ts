import { describe, expect, it } from "vitest";
import { reportedActivity, terminalFailure } from "./localFailureReport";

const lastActivity = { sequence: 2, kind: "agent_message" as const, at: "2026-10-07T00:00:00.000Z", preview: "working", tool: null, source: null, status: null };
const terminal = (payload: Record<string, unknown>) => ({ sequence: 3, payload });

describe("terminalFailure", () => {
  it("turns the connector explanation into the activity shown for the failed run", () => {
    const result = terminalFailure(terminal({ outcome: "failed", reason: "workspace_unavailable", detail: "O CompozyOS recusou abrir o projeto: line 28" }), lastActivity);
    expect(result).toMatchObject({ state: "failed", code: "workspace_unavailable", runtimeEventSequence: 3, activity: { kind: "warning", preview: "O CompozyOS recusou abrir o projeto: line 28", source: "Conector local", status: "workspace_unavailable" } });
  });

  it("keeps the last agent activity when the connector sent no explanation", () => {
    expect(terminalFailure(terminal({ outcome: "blocked", reason: "preparation_changed" }), lastActivity)).toEqual({ state: "blocked", code: "preparation_changed", activity: lastActivity });
    expect(terminalFailure(terminal({ outcome: "unknown" }), null)).toEqual({ state: "unknown", code: "outcome_unknown" });
  });

  it("leaves successful and canceled terminals to the regular flow", () => {
    expect(terminalFailure(terminal({ outcome: "succeeded" }), lastActivity)).toBeNull();
    expect(terminalFailure(terminal({ outcome: "canceled" }), lastActivity)).toBeNull();
  });
});

describe("reportedActivity", () => {
  it("keeps the kind, tool and file the connector reported", () => {
    const activity = reportedActivity({ sequence: 4, payload: { summary: "read_file", relativeFiles: ["src/index.ts"], kind: "tool_call", tool: "read_file", status: null } });
    expect(activity).toMatchObject({ sequence: 4, kind: "tool_call", preview: "read_file", tool: "read_file", source: "src/index.ts", status: null });
  });

  it("treats a report from an older connector as an agent message", () => {
    expect(reportedActivity({ sequence: 2, payload: { summary: "working", relativeFiles: [] } })).toMatchObject({ kind: "agent_message", preview: "working", tool: null, source: null });
  });
});
