import type { PlanningCommandResult, PlanningReceipt } from "../application/database/dao/taskPlanningDao";

const REPLAYED_EVENT = "planning.command_replayed";
const READY_EVENT = "planning.ready_placement";
const READY_FAILED_EVENT = "planning.ready_placement_failed";

export function finishPlanningCommand(event: string, requestKey: string, result: PlanningCommandResult): PlanningReceipt {
  const { replayed, ...receipt } = result;
  logPlanningEvent(replayed ? REPLAYED_EVENT : event, receipt, requestKey);
  return receipt;
}

function logPlanningEvent(event: string, receipt: PlanningReceipt, requestKey: string) {
  console.info(JSON.stringify({ event, taskId: receipt.taskId, operationId: receipt.operationId, decisionId: receipt.decisionId, taskVersion: receipt.version, decisionVersion: receipt.decisionVersion, requestKey }));
}

export function logReadyPlacement(taskId: string, placement: string) {
  console.info(JSON.stringify({ event: READY_EVENT, taskId, placement }));
}

export function logReadyPlacementFailure(taskId: string, error: unknown) {
  console.error(JSON.stringify({ event: READY_FAILED_EVENT, taskId, errorName: error instanceof Error ? error.name : typeof error }));
}
