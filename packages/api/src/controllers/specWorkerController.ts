import type { SpecClaim } from "../application/database/dao/taskSpecWorkerDao";
import { assertPins } from "../infra/spec/compozy/compozyPreflight";
import { SPEC_JOB_HEARTBEAT_SECONDS } from "../application/services/spec/specLimits";
import { applyNextApproval, applyNextRestore } from "./specApprovals";
import { dispatchAttempt } from "./specDispatch";
import { superviseExecution } from "./specSupervise";
import { superviseStop } from "./specStopSupervisor";
import type { SpecWorkerDeps } from "./specWorkerTypes";

const HEARTBEAT_INTERVAL_MS = SPEC_JOB_HEARTBEAT_SECONDS * 1000;

export class SpecWorkerController {
  constructor(private readonly deps: SpecWorkerDeps) {}

  admissionOpen() {
    try { assertPins({ ...this.deps.settings.runtime, socketPath: "" }); return true; }
    catch { return false; }
  }

  async tick() {
    if (!this.admissionOpen()) return null;
    while (await applyNextApproval(this.deps));
    while (await applyNextRestore(this.deps));
    const claim = await this.deps.dao.claim({ owner: this.deps.owner, now: this.deps.clock(), maxActive: this.deps.settings.maxActive });
    if (!claim) return null;
    let heartbeatFailure: unknown;
    const heartbeat = setInterval(() => { void this.deps.dao.heartbeat(claim, this.deps.clock()).then((active) => { if (!active) heartbeatFailure = new Error("lease_lost"); }).catch((error) => { heartbeatFailure = error; }); }, HEARTBEAT_INTERVAL_MS);
    try {
      await this.handle(claim);
      if (heartbeatFailure) throw heartbeatFailure;
    } finally { clearInterval(heartbeat); }
    return claim;
  }

  async handle(claim: SpecClaim) {
    if (claim.state === "stopping") return superviseStop(this.deps, claim);
    if (claim.state === "dispatching") return dispatchAttempt(this.deps, claim);
    return superviseExecution(this.deps, claim);
  }
}
