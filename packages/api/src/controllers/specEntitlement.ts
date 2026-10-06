import type { SpecClaim } from "../application/database/dao/taskSpecWorkerDao";
import { SpecRuntimeError } from "../infra/spec/compozy/compozyErrors";
import { runtimeIdentity } from "./specStopSupervisor";
import type { SpecWorkerDeps } from "./specWorkerTypes";

export async function checkEntitlement(deps: SpecWorkerDeps, claim: SpecClaim) {
  const access = await deps.access.check(claim);
  if (access === "granted") return "granted" as const;
  if (access === "unknown") return "suspended" as const;
  const identity = runtimeIdentity(deps, claim);
  if (!identity) { await deps.dao.settle(claim, { state: "failed", reason: "access_revoked" }); return "failed" as const; }
  await deps.dao.requestStop(claim, "access_revoked", deps.clock());
  await deps.runtime.stop(identity).catch((error: unknown) => { if (!(error instanceof SpecRuntimeError)) throw error; });
  return "stop_requested" as const;
}
