import type { PlanView } from "./planContract";
import { COMPLETED_TEXT, RUNNING_TEXT, pausedByText, pausedReasonText, runningSessionText } from "./planRunCopy";

const COMPLETED = "completed";
const FIRST_POSITION = 1;

export function canRunPlan(view: PlanView, dirty: boolean) {
  if (dirty) return false;
  if (view.run && view.run.state !== COMPLETED) return false;
  return view.items.some((item) => !item.started);
}

export function runStatusText(view: PlanView): string | null {
  const run = view.run;
  if (!run) return null;
  if (run.state === COMPLETED) return COMPLETED_TEXT;
  if (run.state === "paused") return run.reason ? pausedReasonText(run.reason) : pausedByText(run.pausedBy ?? "");
  const position = view.items.findIndex((item) => item.id === run.currentItemId) + FIRST_POSITION;
  return position >= FIRST_POSITION ? runningSessionText(position) : RUNNING_TEXT;
}
