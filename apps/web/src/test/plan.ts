import type { PlanItemView, PlanView } from "@/features/issues/assigned-work/planContract";
import { AGENTS, OPUS_MAX } from "./terminal";

export function planItemOf(id: string, taskIds: string[], patch: Partial<PlanItemView> = {}): PlanItemView {
  return { id, position: 1, taskIds, choice: OPUS_MAX, state: "ready", started: false, after: [], waitingSessions: [], blockedBy: [], forced: null, latestSessionId: null, ...patch };
}

export function planOf(items: PlanItemView[], patch: Partial<PlanView> = {}): PlanView {
  return { run: null, version: 3, stale: false, folderChange: null, unassigned: [], canEdit: true, agents: AGENTS, items: items.map((item, index) => ({ ...item, position: index + 1 })), ...patch };
}
