import type { SpecClaim } from "../application/database/dao/taskSpecWorkerDao";
import type { RuntimeIdentity } from "../application/spec/specRuntimeGateway";
import { snapshotToStop } from "../infra/spec/compozy/compozyStop";
import { STOP_ATTENTION, stopNeedsAttention } from "../application/services/spec/specWorkerRules";
import { SpecRuntimeError } from "../infra/spec/compozy/compozyErrors";
import { finalizeOnDone } from "./specFinalize";
import type { SpecWorkerDeps } from "./specWorkerTypes";

const AUTHORITATIVE_COMPLETION = "completed";

export function runtimeIdentity(deps: SpecWorkerDeps, claim: SpecClaim): RuntimeIdentity | null {
  if (!claim.runtimeWorkspaceId || !claim.runtimeSessionId) return null;
  return { socketPath: deps.launcher.socketPath(claim.attemptId), workspaceId: claim.runtimeWorkspaceId, sessionId: claim.runtimeSessionId };
}

export async function superviseStop(deps: SpecWorkerDeps, claim: SpecClaim) {
  const identity = runtimeIdentity(deps, claim);
  if (!identity) return deps.dao.settle(claim, { state: "canceled", reason: null });
  try {
    await deps.runtime.stop(identity);
    const stop = snapshotToStop(await deps.runtime.inspect(identity));
    return await settleStop(deps, claim, stop);
  } catch (error) {
    if (!(error instanceof SpecRuntimeError)) throw error;
    return deps.dao.settle(claim, { state: "reconciling", reason: "outcome_unknown" });
  }
}

async function settleStop(deps: SpecWorkerDeps, claim: SpecClaim, stop: ReturnType<typeof snapshotToStop>) {
  if (!stop.settled) return markAttention(deps, claim);
  if (claim.terminalReason === "access_revoked") return deps.dao.settle(claim, { state: "failed", reason: "access_revoked" });
  if (stop.cause === AUTHORITATIVE_COMPLETION) return finalizeOnDone(deps, claim);
  if (stop.canceled) return stopAndSettle(deps, claim, { state: "canceled", reason: null });
  return stopAndSettle(deps, claim, { state: "failed", reason: "runtime_failed" });
}

async function stopAndSettle(deps: SpecWorkerDeps, claim: SpecClaim, outcome: Parameters<SpecWorkerDeps["dao"]["settle"]>[1]) {
  await deps.launcher.stop(claim.attemptId).catch(() => undefined);
  return deps.dao.settle(claim, outcome);
}

async function markAttention(deps: SpecWorkerDeps, claim: SpecClaim) {
  if (stopNeedsAttention(claim.stopRequestedAt, deps.clock())) await deps.dao.setAttention(claim, STOP_ATTENTION);
  await deps.dao.release(claim);
}
