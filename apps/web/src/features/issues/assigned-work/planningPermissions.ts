import type { TaskDetail } from "./contract";

const AWAITING = "awaiting";
const FAILED = "failed";
const REVIEW = "review";
const APPROVED = "approved";

export function withOperatorPermissions(detail: TaskDetail): TaskDetail {
  const { planning } = detail;
  const permissions = {
    canStart: planning.status === AWAITING && planning.eligibility.canStart,
    canRetry: planning.status === FAILED,
    canReplan: planning.replannable,
    canSelectRoute: planning.status === REVIEW,
    canApprove: planning.status === REVIEW,
    canOpenTerminal: planning.status === APPROVED && planning.decision?.status === APPROVED,
  };
  return { ...detail, planning: { ...planning, permissions } };
}
