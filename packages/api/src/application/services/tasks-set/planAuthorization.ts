import type { WorkAuthorization } from "../assigned-issues/workAuthorization";
import { TaskError } from "../tasks/taskErrors";

type Scope = { projectId: string; taskId: string; actorId: string };

const OPERATOR_REQUIRED_REASON = "operator_required";

function isOperatorRequired(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { reason?: unknown }).reason === OPERATOR_REQUIRED_REASON;
}

export async function requirePlanOperator(authorization: Pick<WorkAuthorization, "requireOperate">, scope: Scope) {
  try {
    await authorization.requireOperate(scope);
  } catch (error) {
    if (isOperatorRequired(error)) throw new TaskError("plan_control_denied", undefined, error);
    throw error;
  }
}
