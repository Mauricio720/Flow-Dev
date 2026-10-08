import type { TaskFlowDao, RunRecord } from "../../database/dao/taskFlowDao";
import type { PackageCapture } from "./packageCapture";
import { TaskFlowError } from "./taskFlowErrors";
import type { RunSettlement } from "./runOutcomes";
import { packageFailureActivity } from "./packageFailureActivity";

export async function refreshTaskFlowPlanStatus(flow: TaskFlowDao, taskId: string) {
  const plan = await flow.plans.find(taskId);
  if (!plan) return;
  const completed = plan.actions.every((action) => action.state === "succeeded");
  await flow.plans.setStatus(plan.id, completed ? "completed" : "planned");
}

export async function captureRunResult(capture: Pick<PackageCapture, "capture"> | undefined, run: RunRecord, settlement: RunSettlement): Promise<RunSettlement> {
  if (settlement.state !== "succeeded" || !["create_spec", "create_tasks"].includes(String(run.snapshot.kind)) || !capture) return settlement;
  try {
    await capture.capture(run);
    return settlement;
  } catch (error) {
    const code = error instanceof TaskFlowError && error.reason === "package_invalid" ? "package_invalid" : "capture_failed";
    const activity = code === "package_invalid" ? packageFailureActivity(run, error as TaskFlowError) : undefined;
    return { state: "failed", terminalCode: code, actionState: "failed", ...(activity ? { activity } : {}) };
  }
}
