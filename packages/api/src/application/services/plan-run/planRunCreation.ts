import type { PlanRunDao, PlanRunRecord } from "../../database/dao/planRunDao";
import { TaskError } from "../tasks/taskErrors";

type CreationDeps = { runs: PlanRunDao; hostId: string };
type CreationInput = { planId: string; current: PlanRunRecord | null; input: { actorId: string; requestKey: string } };

const RUN_UNIQUE_CONSTRAINT = "task_session_plan_runs_plan_id_unique";

export async function createRun(deps: CreationDeps, { planId, current, input }: CreationInput): Promise<PlanRunRecord> {
  const values = { hostId: deps.hostId, startedBy: input.actorId, requestKey: input.requestKey };
  if (current) return requireRun(await deps.runs.restart({ runId: current.id, revision: current.revision, ...values }));
  try {
    return await deps.runs.create({ planId, ...values });
  } catch (error) {
    const existing = await deps.runs.findByRequestKey(input.actorId, input.requestKey);
    if (existing) return existing;
    if (constraintName(error) === RUN_UNIQUE_CONSTRAINT) throw new TaskError("plan_run_active", undefined, error);
    throw error;
  }
}

function requireRun(run: PlanRunRecord | null) {
  if (!run) throw new TaskError("plan_run_active");
  return run;
}

function constraintName(error: unknown) {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as { constraint_name?: unknown; cause?: { constraint_name?: unknown } };
  const name = candidate.cause?.constraint_name ?? candidate.constraint_name;
  return typeof name === "string" ? name : null;
}
