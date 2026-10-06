import type { SpecClaim } from "../application/database/dao/taskSpecWorkerDao";
import { TaskError } from "../application/services/tasks/taskErrors";
import { attemptFailureReason } from "./specErrorMapper";
import type { SpecWorkerDeps } from "./specWorkerTypes";

export async function applyNextApproval(deps: SpecWorkerDeps) {
  const claim = await deps.approvals.claim({ owner: deps.owner, now: deps.clock() });
  if (!claim) return false;
  const subject = { projectId: claim.projectId, authorUserId: claim.authorUserId, taskId: claim.taskId } as unknown as SpecClaim;
  const access = await deps.access.check(subject);
  if (access === "unknown") { await deps.approvals.release(claim); return true; }
  if (access === "revoked") { await deps.approvals.reject(claim, "access_revoked"); return true; }
  try {
    const installed = await deps.workspaces.verify({ taskId: claim.taskId, repositoryGithubId: claim.repositoryGithubId, expected: claim.entries });
    await deps.approvals.apply(claim, installed.manifestHash);
  } catch (error) { await deps.approvals.reject(claim, approvalFailure(error)); }
  return true;
}

export async function applyNextRestore(deps: SpecWorkerDeps) {
  const claim = await deps.approvals.claim({ owner: deps.owner, now: deps.clock(), action: "spec.returnToReview" });
  if (!claim) return false;
  const subject = { projectId: claim.projectId, authorUserId: claim.authorUserId, taskId: claim.taskId } as unknown as SpecClaim;
  const access = await deps.access.check(subject);
  if (access === "unknown") { await deps.approvals.release(claim); return true; }
  if (access === "revoked") { await deps.approvals.reject(claim, "access_revoked"); return true; }
  try {
    const outcome = await deps.finalization.restore({ taskId: claim.taskId, repositoryGithubId: claim.repositoryGithubId, packageId: claim.packageId });
    if (outcome.status === "review_ready") await deps.approvals.markApplied(claim);
    else await deps.approvals.reject(claim, outcome.reason);
  } catch (error) { await deps.approvals.reject(claim, approvalFailure(error)); }
  return true;
}

function approvalFailure(error: unknown) {
  if (error instanceof TaskError && error.reason === "artifact_conflict") return "artifact_conflict" as const;
  if (error instanceof TaskError && ["spec_conflict", "stale_execution"].includes(error.reason)) return "spec_conflict" as const;
  return attemptFailureReason(error);
}
