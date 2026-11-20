"use client";

import { useExecutionActions } from "./useExecutionActions";
import { useExecutionQuery } from "./useExecutionQuery";
import type { ExecutionTarget, TaskExecutionView } from "./executionTypes";

export type { TaskExecutionCurrent, TaskExecutionStatus, TaskExecutionView } from "./executionTypes";

export function useTaskExecution(target: ExecutionTarget): TaskExecutionView {
  const query = useExecutionQuery(target);
  const actions = useExecutionActions(target, query.refresh);
  return { ...query, ...actions };
}
