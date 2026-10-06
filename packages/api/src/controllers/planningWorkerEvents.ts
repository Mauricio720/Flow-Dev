import type { PlanningClaim } from "../application/database/dao/taskPlanningWorkerDao";

const ERROR_EVENTS = ["planning.failed", "planning.stale_result", "planning.unclassified_error"];

export function logPlanningWorkerEvent(event: string, claim: PlanningClaim, extra: Record<string, string | number | null> = {}) {
  const line = JSON.stringify({ event, taskId: claim.taskId, operationId: claim.operationId, executionId: claim.executionId, fence: claim.fence, attempt: claim.attempts, ...extra });
  if (ERROR_EVENTS.includes(event)) console.error(line);
  else console.info(line);
}
