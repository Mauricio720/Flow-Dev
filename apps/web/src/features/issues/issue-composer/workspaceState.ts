import type { TaskFailure, TaskSnapshot, TaskStatus, WorkspaceLoad } from "./contract";
import { accessProblem } from "@/lib/tasks/taskFailure";

export type WorkspacePhase = "empty" | "loading" | "ready" | "failed";
export type WorkspaceState = { scope: string; phase: WorkspacePhase; snapshot: TaskSnapshot | null; failure: TaskFailure | null };
export type WorkspaceAction =
  | { type: "loaded"; scope: string; snapshot: TaskSnapshot }
  | { type: "failed"; scope: string; failure: TaskFailure };

const NEW_INTENT_SCOPE = "nova";
const PENDING_POLL_MS = 2_000;
const IDLE_POLL_MS = 15_000;
const PENDING_STATUSES: TaskStatus[] = ["generating", "publishing"];

export function taskScope(projectId: string, taskId: string | null) {
  return `${projectId}:${taskId ?? NEW_INTENT_SCOPE}`;
}

export function scopeState(scope: string, taskId: string | null): WorkspaceState {
  return { scope, phase: taskId ? "loading" : "empty", snapshot: null, failure: null };
}

export function initialWorkspaceState(input: { projectId: string; initial: WorkspaceLoad }): WorkspaceState {
  const scope = taskScope(input.projectId, input.initial.taskId);
  const task = input.initial.task;
  if (task.kind === "ready") return { scope, phase: "ready", snapshot: task.snapshot, failure: null };
  if (task.kind === "failed") return { scope, phase: "failed", snapshot: null, failure: task.failure };
  return scopeState(scope, null);
}

function loadedState(state: WorkspaceState, action: { scope: string; snapshot: TaskSnapshot }): WorkspaceState {
  const known = state.scope === action.scope ? state.snapshot : null;
  const stale = known && action.snapshot.detail.task.version < known.detail.task.version;
  return { scope: action.scope, phase: "ready", snapshot: stale ? known : action.snapshot, failure: null };
}

export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  if (action.type === "loaded") return loadedState(state, action);
  const lostAccess = accessProblem(action.failure) !== null;
  const confirmed = state.scope === action.scope && !lostAccess ? state.snapshot : null;
  return { scope: action.scope, phase: confirmed ? "ready" : "failed", snapshot: confirmed, failure: action.failure };
}

export function isPendingStatus(status: TaskStatus) {
  return PENDING_STATUSES.includes(status);
}

export function pollInterval(status: TaskStatus | null) {
  if (!status) return null;
  return isPendingStatus(status) ? PENDING_POLL_MS : IDLE_POLL_MS;
}
