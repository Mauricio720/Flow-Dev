import type { TaskDetail } from "@/features/issues/assigned-work/contract";
import type { ExecutionArtifact, ExecutionEvent, ExecutionSession } from "@/features/issues/assigned-work/executionContract";
import { publishedDetail } from "./tasks";

const OPENED = "2026-11-22T10:00:00.000Z";

export function eventOf(patch: Partial<ExecutionEvent> = {}): ExecutionEvent {
  return { kind: "command", summary: "pnpm test", occurredAt: "2026-11-22T10:05:00.000Z", ...patch };
}

export function sessionOf(patch: Partial<ExecutionSession> = {}): ExecutionSession {
  return { id: "00000000-0000-4000-8000-0000000000e1", status: "running", runtime: "terminal", route: "tech_spec", userName: "Ana", openedAt: OPENED, endedAt: null, lastEventAt: null, silentSince: null, droppedEvents: 0, hiddenEvents: 0, events: [], attachments: [], purpose: "route", planItemId: null, agent: "claude", model: null, effort: null, ...patch };
}

export function codexSessionOf(patch: Partial<ExecutionSession> = {}): ExecutionSession {
  return sessionOf({ runtime: "flow_dev", agent: "codex", model: "gpt-6.1-sol", effort: "high", ...patch });
}

export function artifactOf(patch: Partial<ExecutionArtifact> = {}): ExecutionArtifact {
  return { id: "00000000-0000-4000-8000-0000000000a1", path: "docs/specs/login/spec.md", skill: "spec-writer", versions: 1, updatedAt: "2026-11-22T10:10:00.000Z", lastFailure: null, ...patch };
}

export function detailWith(sessions: ExecutionSession[], artifacts: ExecutionArtifact[] = [], patch: Partial<TaskDetail> = {}): TaskDetail {
  return { ...publishedDetail(), execution: { sessions, artifacts }, ...patch };
}
