import { accessProblem } from "@/lib/tasks/taskFailure";
import type { TaskFailure, WorkLoad, WorkSnapshot } from "./contract";

export type WorkState = { snapshot: WorkSnapshot | null; failure: TaskFailure | null };
export type WorkAction = { type: "loaded"; snapshot: WorkSnapshot } | { type: "failed"; failure: TaskFailure };

const NOT_FOUND_CODE = "NOT_FOUND";
const CLAIM_POLL_MS = 5_000;
const PLANNING_POLL_MS = 2_000;
const IDLE_POLL_MS = 15_000;
const UNRESOLVED_CLAIMS = ["pending", "uncertain"];
const ACTIVE_PLANNING = "in_progress";

export function lostAccess(failure: TaskFailure | null) {
  if (!failure) return false;
  return accessProblem(failure) !== null || failure.code === NOT_FOUND_CODE;
}

export function initialWorkState(load: WorkLoad): WorkState {
  if (load.kind === "ready") return { snapshot: load.snapshot, failure: null };
  return { snapshot: null, failure: load.failure };
}

export function workReducer(state: WorkState, action: WorkAction): WorkState {
  if (action.type === "loaded") return { snapshot: action.snapshot, failure: null };
  return { snapshot: lostAccess(action.failure) ? null : state.snapshot, failure: action.failure };
}

export function workPollInterval(state: WorkState) {
  if (lostAccess(state.failure) || !state.snapshot) return null;
  if (UNRESOLVED_CLAIMS.includes(state.snapshot.view.claim.state)) return CLAIM_POLL_MS;
  return state.snapshot.detail.planning.status === ACTIVE_PLANNING ? PLANNING_POLL_MS : IDLE_POLL_MS;
}
