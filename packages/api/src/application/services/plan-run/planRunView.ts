import type { PlanRunRecord, PlanRunState } from "../../database/dao/planRunDao";

export type PlanRunView = { state: PlanRunState; reason: string | null; pausedBy: string | null; currentItemId: string | null; revision: number };

export function planRunView(run: PlanRunRecord | null): PlanRunView | null {
  if (!run) return null;
  return { state: run.state, reason: run.pauseReason, pausedBy: run.pausedByName, currentItemId: run.currentItemId, revision: run.revision };
}
