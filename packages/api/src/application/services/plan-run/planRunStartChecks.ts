import type { PlanRunRecord } from "../../database/dao/planRunDao";
import type { PlanItemView } from "../tasks-set/planView";
import { TaskError } from "../tasks/taskErrors";
import { emptySessionMessage } from "./planRunCopy";

const FIRST_POSITION = 1;
const ACTIVE_STATES = new Set(["running", "paused"]);

export function requireFilledSessions(items: PlanItemView[]) {
  const index = items.findIndex((item) => item.state === "empty");
  if (index >= 0) throw new TaskError("plan_run_session_empty", { message: emptySessionMessage(index + FIRST_POSITION) });
}

export function requireSessionToStart(items: PlanItemView[]) {
  if (!items.some((item) => !item.started)) throw new TaskError("plan_run_nothing_to_start");
}

export function requireNoActiveRun(run: PlanRunRecord | null) {
  if (run && ACTIVE_STATES.has(run.state)) throw new TaskError("plan_run_active");
}

export function requireRevision(run: PlanRunRecord | null, revision: number): PlanRunRecord {
  if (!run || run.revision !== revision) throw new TaskError("plan_run_state");
  return run;
}
