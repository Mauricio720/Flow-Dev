import type { SpecClaim } from "../application/database/dao/taskSpecWorkerDao";
import { SpecRuntimeError } from "../infra/spec/compozy/compozyErrors";
import { runtimeIdentity } from "./specStopSupervisor";
import type { SpecWorkerDeps } from "./specWorkerTypes";
import { AssignedIssueError } from "../application/services/assigned-issues/assignedIssueErrors";

export async function checkEntitlement(deps: SpecWorkerDeps, claim: SpecClaim) {
  if (deps.authorization && !(await operatorAccess(deps, claim))) return requestStop(deps, claim);
  const access = await deps.access.check(claim);
  if (access === "granted") return "granted" as const;
  if (access === "unknown") return "suspended" as const;
  return requestStop(deps, claim);
}

async function operatorAccess(deps: SpecWorkerDeps, claim: SpecClaim) {
  try {
    await deps.authorization!.requireOperate({ projectId: claim.projectId, taskId: claim.taskId, actorId: claim.authorUserId }, { currentSource: true });
    return true;
  } catch (error) {
    if (error instanceof AssignedIssueError) return false;
    throw error;
  }
}

async function requestStop(deps: SpecWorkerDeps, claim: SpecClaim) {
  const identity = runtimeIdentity(deps, claim);
  if (!identity) { await deps.dao.settle(claim, { state: "failed", reason: "access_revoked" }); return "failed" as const; }
  await deps.dao.requestStop(claim, "access_revoked", deps.clock());
  await deps.runtime.stop(identity).catch((error: unknown) => { if (!(error instanceof SpecRuntimeError)) throw error; });
  return "stop_requested" as const;
}
