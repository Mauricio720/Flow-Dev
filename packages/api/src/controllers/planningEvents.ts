import type { PlanningCommandResult, PlanningReceipt } from "../application/database/dao/taskPlanningDao";

const REPLAYED_EVENT = "planning.command_replayed";

export function finishPlanningCommand(event: string, requestKey: string, result: PlanningCommandResult): PlanningReceipt {
  const { replayed, ...receipt } = result;
  logPlanningEvent(replayed ? REPLAYED_EVENT : event, receipt, requestKey);
  return receipt;
}

function logPlanningEvent(event: string, receipt: PlanningReceipt, requestKey: string) {
  console.info(JSON.stringify({ event, taskId: receipt.taskId, operationId: receipt.operationId, decisionId: receipt.decisionId, taskVersion: receipt.version, decisionVersion: receipt.decisionVersion, requestKey }));
}
