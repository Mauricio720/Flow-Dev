import { planningRoutes } from "./planningCopy";
import type { PendingCommand } from "./planningCommandState";

const KEY_PREFIX = "flow-dev:planning-pending:";

function storage() {
  try { return window.sessionStorage; } catch { return null; }
}

export function savePending(command: PendingCommand) {
  try { storage()?.setItem(`${KEY_PREFIX}${command.taskId}`, JSON.stringify(command)); } catch { return; }
}

export function clearPending(taskId: string) {
  try { storage()?.removeItem(`${KEY_PREFIX}${taskId}`); } catch { return; }
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isPendingCommand(value: Record<string, unknown>, taskId: string) {
  if (value.taskId !== taskId || !isText(value.requestKey) || typeof value.expectedVersion !== "number") return false;
  if (value.action === "planning.start") return true;
  if (value.action === "planning.retry") return isText(value.failedOperationId);
  if (value.action !== "planning.selectRoute" && value.action !== "planning.approve") return false;
  return isText(value.decisionId) && typeof value.expectedDecisionVersion === "number" && planningRoutes.includes(value.route as never);
}

export function loadPending(taskId: string): PendingCommand | null {
  try {
    const raw = storage()?.getItem(`${KEY_PREFIX}${taskId}`);
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== "object") return null;
    return isPendingCommand(value as Record<string, unknown>, taskId) ? (value as PendingCommand) : null;
  } catch { return null; }
}
