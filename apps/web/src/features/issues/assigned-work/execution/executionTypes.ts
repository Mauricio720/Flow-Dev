import type { RouterOutputs } from "@flow-dev/api";

export type TaskExecutionStatus = RouterOutputs["taskExecution"]["status"];
export type TaskExecutionCurrent = NonNullable<TaskExecutionStatus["current"]>;
export type ExecutionTarget = { projectId: string; taskId: string };
export type ExecutionPending = "start" | "cancel" | null;
export type ExecutionQuery = { status: TaskExecutionStatus | null; loading: boolean; error: string | null; refresh: () => Promise<void> };
export type ExecutionActions = {
  pending: ExecutionPending;
  actionError: string | null;
  start: (decisionId: string, decisionVersion: number, reuseKey: boolean) => Promise<void>;
  cancel: (executionId: string) => Promise<void>;
};
export type TaskExecutionView = ExecutionQuery & ExecutionActions;
