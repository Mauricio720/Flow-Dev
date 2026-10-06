import type { SpecClaim } from "../application/database/dao/taskSpecWorkerDao";
import { TaskError } from "../application/services/tasks/taskErrors";
import { attemptFailureReason } from "./specErrorMapper";
import type { SpecWorkerDeps } from "./specWorkerTypes";

export async function finalizeOnDone(deps: SpecWorkerDeps, claim: SpecClaim) {
  try { return await finalize(deps, claim); }
  catch (error) {
    if (error instanceof TaskError) return fail(deps, claim, attemptFailureReason(error));
    throw error;
  }
}

async function finalize(deps: SpecWorkerDeps, claim: SpecClaim) {
  if (await deps.dao.pendingInteractionCount(claim) > 0) return "waiting" as const;
  await deps.dao.markFinalizing(claim);
  await deps.dao.appendEvent(claim, { kind: "attempt.finalizing", payload: {}, providerEventId: `finalizing:${claim.attemptId}` });
  await deps.launcher.stop(claim.attemptId).catch(() => undefined);
  const attempt = { taskId: claim.taskId, repositoryGithubId: claim.input.repositoryGithubId, attemptId: claim.attemptId, stage: claim.stage };
  const manifest = await deps.workspaces.freeze(attempt);
  const workspaceId = await deps.dao.workspaceId(claim);
  const approved = await deps.dao.approvedUpstream(claim);
  const upstream = approved.map(({ packageId, manifestHash, stage }) => ({ packageId, manifestHash, stage }));
  const saved = await deps.capture.capture({ workflowId: claim.workflowId, attemptId: claim.attemptId, stage: claim.stage, manifest, upstream, parentPackageId: claim.input.reviewedPackageId ?? null, approvedUpstream: approved.flatMap((item) => item.entries), finalization: workspaceId ? { workspaceId, commandId: null } : undefined });
  if (!manifest.complete || !saved.valid) return fail(deps, claim, saved.reason ?? "artifact_invalid");
  if (!workspaceId) return fail(deps, claim, "workspace_unavailable");
  const outcome = await deps.finalization.finalize(claim, saved.packageId);
  return outcome.status === "review_ready" ? "review_ready" as const : fail(deps, claim, outcome.reason);
}

async function fail(deps: SpecWorkerDeps, claim: SpecClaim, reason: Parameters<SpecWorkerDeps["dao"]["settle"]>[1]["reason"]) {
  await deps.dao.settle(claim, { state: "failed", reason });
  return "failed" as const;
}
