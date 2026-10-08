import type { WorkSnapshot } from "./contract";

const DOWNSTREAM_TASK_STATUSES = ["published", "imported"];
const APPROVED_PLANNING = "approved";

export function flowVisible({ view, detail }: WorkSnapshot) {
  if (!DOWNSTREAM_TASK_STATUSES.includes(detail.task.status)) return false;
  if (detail.planning.status !== APPROVED_PLANNING) return false;
  return !view.sourceChanged && detail.planning.decision?.matchesCurrentSource !== false;
}
