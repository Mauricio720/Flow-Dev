import type { SpecClaim } from "../application/database/dao/taskSpecWorkerDao";
import { SpecRuntimeError } from "../infra/spec/compozy/compozyErrors";
import { checkEntitlement } from "./specEntitlement";
import { finalizeOnDone } from "./specFinalize";
import { ingestEvents } from "./specIngest";
import { deliverResolutions, syncInteractions } from "./specInteractionSync";
import { runtimeIdentity } from "./specStopSupervisor";
import type { SpecWorkerDeps } from "./specWorkerTypes";

const REPLAY_GAP_ATTENTION = "replay_gap";
const RECONCILING_STATE = "reconciling";

export async function superviseExecution(deps: SpecWorkerDeps, claim: SpecClaim) {
  if (await checkEntitlement(deps, claim) !== "granted") return;
  const identity = runtimeIdentity(deps, claim);
  if (!identity) return deps.dao.release(claim);
  try {
    const ingest = await ingestEvents(deps, claim, identity);
    if (ingest.gap) return await deps.dao.settle(claim, { state: "reconciling", reason: "outcome_unknown", attention: REPLAY_GAP_ATTENTION });
    if (ingest.canceled) {
      await deps.launcher.stop(claim.attemptId).catch(() => undefined);
      return await deps.dao.settle(claim, { state: "canceled", reason: null });
    }
    await syncInteractions(deps, claim, identity);
    await deliverResolutions(deps, claim, identity);
    if (claim.state === RECONCILING_STATE) await deps.dao.markRunning(claim);
    if (ingest.done || claim.state === "finalizing") await finalizeOnDone(deps, claim);
    await deps.dao.release(claim).catch(() => undefined);
  } catch (error) {
    if (!(error instanceof SpecRuntimeError)) throw error;
    await deps.dao.settle(claim, { state: "reconciling", reason: error.reason });
  }
}
