import type { RunActivity } from "../../application/database/dao/taskFlowTypes";
import type { ReconcileResult } from "../../application/services/task-flow/actionExecutor";

const FAILURE_SOURCE = "Conector local";
const FAILED_OUTCOMES = ["failed", "blocked", "unknown"] as const;
const DEFAULT_CODES: Record<(typeof FAILED_OUTCOMES)[number], string> = { failed: "runtime_failed", blocked: "outcome_unknown", unknown: "outcome_unknown" };

type TerminalEvent = { sequence: number; payload: Record<string, unknown> };

function reportedDetail(terminal: TerminalEvent): Pick<ReconcileResult, "activity" | "runtimeEventSequence"> | null {
  const detail = terminal.payload.detail;
  if (typeof detail !== "string" || !detail) return null;
  const status = typeof terminal.payload.reason === "string" ? terminal.payload.reason : null;
  const activity: RunActivity = { sequence: terminal.sequence, kind: "warning", at: new Date().toISOString(), preview: detail, tool: null, source: FAILURE_SOURCE, status };
  return { activity, runtimeEventSequence: terminal.sequence };
}

const ACTIVITY_KINDS: RunActivity["kind"][] = ["agent_message", "tool_call", "tool_result", "interaction", "lifecycle", "warning"];
const text = (value: unknown) => (typeof value === "string" && value ? value : null);

export function reportedActivity(event: TerminalEvent): RunActivity {
  const { payload } = event;
  const kind = ACTIVITY_KINDS.find((candidate) => candidate === payload.kind) ?? "agent_message";
  const files = Array.isArray(payload.relativeFiles) ? payload.relativeFiles : [];
  const at = typeof payload.at === "string" ? payload.at : new Date().toISOString();
  return { sequence: event.sequence, kind, at, preview: String(payload.summary ?? ""), tool: text(payload.tool), source: text(files[0]), status: text(payload.status) };
}

export function terminalFailure(terminal: TerminalEvent, lastActivity: RunActivity | null): ReconcileResult | null {
  const outcome = FAILED_OUTCOMES.find((candidate) => candidate === terminal.payload.outcome);
  if (!outcome) return null;
  const code = typeof terminal.payload.reason === "string" ? terminal.payload.reason : DEFAULT_CODES[outcome];
  return { state: outcome, code, ...(reportedDetail(terminal) ?? (lastActivity ? { activity: lastActivity } : {})) };
}
