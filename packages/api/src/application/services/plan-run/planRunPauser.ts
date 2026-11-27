import type { PlanRunDao, PlanRunRecord } from "../../database/dao/planRunDao";
import type { PlanLog } from "../tasks-set/planLog";
import type { PlanRunPauseCode } from "./planRunSelection";

export type PlanRunPause = { code: PlanRunPauseCode; reason: string; itemId: string | null };
export type PlanRunPauserDeps = { runs: Pick<PlanRunDao, "transition">; log: PlanLog };

export class PlanRunPauser {
  constructor(private readonly deps: PlanRunPauserDeps) {}

  async pause(run: PlanRunRecord, pause: PlanRunPause) {
    const paused = await this.deps.runs.transition({ runId: run.id, revision: run.revision, next: { state: "paused", pauseReason: pause.reason, pausedBy: null } });
    if (paused) this.deps.log.runPaused({ taskId: run.taskId, runId: run.id, reason: pause.code, item: pause.itemId });
    return paused;
  }
}
