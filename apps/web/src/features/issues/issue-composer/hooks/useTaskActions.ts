"use client";

import type { ActionContext } from "./actionContext";
import { useDraftActions } from "./useDraftActions";
import { useMessageActions } from "./useMessageActions";

export function useTaskActions(context: ActionContext) {
  return { ...useMessageActions(context), ...useDraftActions(context) };
}

export type TaskActions = ReturnType<typeof useTaskActions>;
