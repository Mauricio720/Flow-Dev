import type { ActionRecord, PlanRecord } from "../../database/dao/taskFlowDao";
import type { TaskFlowGate } from "./taskFlowPorts";
import { implementationConcluded, isReviewLoop } from "./loopOrder";
import { TaskFlowError } from "./taskFlowErrors";

const SUCCEEDED_STATE = "succeeded";
const PLANNED_STATE = "planned";

const RETRYABLE_STATES = ["failed", "canceled", "blocked"];

export type StartMode = "start" | "retry";

export function findStartableAction(plan: PlanRecord, actionId: string, mode: StartMode = "start"): ActionRecord {
  const action = plan.actions.find((candidate) => candidate.id === actionId);
  if (!action) throw new TaskFlowError("action_unavailable");
  if (mode === "start" && action.state !== PLANNED_STATE) throw new TaskFlowError("action_already_started");
  if (mode === "retry" && action.state === PLANNED_STATE) throw new TaskFlowError("action_unavailable");
  if (mode === "retry" && !RETRYABLE_STATES.includes(action.state)) throw new TaskFlowError("action_active");
  return action;
}

export function findPreparableAction(plan: PlanRecord, actionId: string): ActionRecord {
  const action = plan.actions.find((candidate) => candidate.id === actionId);
  if (!action) throw new TaskFlowError("action_unavailable");
  return findStartableAction(plan, actionId, action.state === PLANNED_STATE ? "start" : "retry");
}

export async function assertPrerequisites(input: { plan: PlanRecord; action: ActionRecord; taskId: string; gate: TaskFlowGate }) {
  const { plan, action, taskId, gate } = input;
  const earlier = plan.actions.filter((candidate) => candidate.position < action.position);
  if (earlier.some((candidate) => candidate.state !== SUCCEEDED_STATE)) throw new TaskFlowError("stage_prerequisite");
  if (action.kind === "create_tasks" && !(await gate.approvedSpec(taskId))) throw new TaskFlowError("stage_prerequisite");
  if (action.kind === "loop" && !(await gate.approvedTasks(taskId))) throw new TaskFlowError("stage_prerequisite");
  if (isReviewLoop(action) && !implementationConcluded(earlier)) throw new TaskFlowError("stage_prerequisite");
}
