import type { RunRecord } from "../../application/database/dao/taskFlowDao";
import type { ReconcileResult } from "../../application/services/task-flow/actionExecutor";

export function takeRuntimeActivity(run: RunRecord, result: ReconcileResult) {
  if (result.runtimeEventSequence !== undefined) run.runtimeEventSequence = result.runtimeEventSequence;
  const activity = result.activity;
  if (!activity || JSON.stringify(activity) === JSON.stringify(run.activity)) return null;
  run.activity = activity;
  return activity;
}
