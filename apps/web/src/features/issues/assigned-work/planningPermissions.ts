import type { TaskDetail } from "./contract";

const AWAITING = "awaiting";
const FAILED = "failed";
const REVIEW = "review";

export function withOperatorPermissions(detail: TaskDetail): TaskDetail {
  const { planning } = detail;
  const permissions = {
    canStart: planning.status === AWAITING && planning.eligibility.canStart,
    canRetry: planning.status === FAILED,
    canSelectRoute: planning.status === REVIEW,
    canApprove: planning.status === REVIEW,
  };
  return { ...detail, planning: { ...planning, permissions } };
}
