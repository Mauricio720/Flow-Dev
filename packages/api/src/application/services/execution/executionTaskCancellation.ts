import type { CompozyGateway } from "../../compozy/compozyGateway";
import type { ExecutionRecord } from "../../database/dao/taskExecutionDao";
import { TaskError } from "../tasks/taskErrors";

const TERMINAL_TASK_STATES = ["completed", "failed", "canceled", "rejected"];
type CancellationGateway = Pick<CompozyGateway, "readTask" | "cancelTask">;

export async function cancelExecutionTasks(gateway: CancellationGateway, execution: ExecutionRecord) {
  const taskIds = [...new Set([execution.specTaskId, execution.workTaskId].filter((taskId): taskId is string => Boolean(taskId)))];
  for (const taskId of taskIds) await cancelTaskIfActive(gateway, taskId);
}

async function cancelTaskIfActive(gateway: CancellationGateway, taskId: string) {
  if (await isTerminal(gateway, taskId)) return;
  try {
    await gateway.cancelTask(taskId);
  } catch (error) {
    if (!(error instanceof TaskError) || error.reason !== "compozy_rejected" || !(await isTerminal(gateway, taskId))) throw error;
  }
}

async function isTerminal(gateway: CancellationGateway, taskId: string) {
  try {
    return TERMINAL_TASK_STATES.includes((await gateway.readTask(taskId)).status);
  } catch (error) {
    if (error instanceof TaskError && error.reason === "compozy_task_missing") return true;
    throw error;
  }
}
