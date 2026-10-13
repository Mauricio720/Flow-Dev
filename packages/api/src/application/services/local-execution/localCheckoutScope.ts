import { createHash } from "node:crypto";
import type { LocalExecutionTarget } from "../task-flow/localProjectAccess";

export function localCheckoutScope(target: Pick<LocalExecutionTarget, "checkoutHandle" | "worktreeTaskId">) {
  if (!target.worktreeTaskId) return target.checkoutHandle;
  return createHash("sha256").update(`worktree:${target.checkoutHandle}:${target.worktreeTaskId}`).digest("hex");
}
