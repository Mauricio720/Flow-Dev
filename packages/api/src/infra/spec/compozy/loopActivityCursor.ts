import type { RunRecord } from "../../../application/database/dao/taskFlowDao";
import type { RunActivity } from "../../../application/database/dao/taskFlowTypes";

function fingerprint(activity: RunActivity) {
  return JSON.stringify([activity.at, activity.kind, activity.preview, activity.tool, activity.source, activity.status]);
}

export function loopActivityUpdate(run: RunRecord, activity: RunActivity | null | undefined) {
  if (!activity) return {};
  if (run.activity && fingerprint(activity) === fingerprint(run.activity)) return { activity: run.activity };
  const sequence = (run.runtimeEventSequence ?? 0) + 1;
  return { runtimeEventSequence: sequence, activity: { ...activity, sequence } };
}
