import type { AgentAvailability, AgentChoice } from "../../terminal/sessionAgentCatalog";
import { itemReadiness } from "./planReadiness";
import type { BlockedBy } from "./planReadiness";
import { planFolderChanged, reconcilePlan } from "./planReconciliation";
import type { PlanItemState, StoredPlan, StoredPlanItem } from "./planTypes";
import type { TaskSet } from "./taskSetTypes";

export type PlanItemView = {
  id: string;
  position: number;
  taskIds: string[];
  choice: AgentChoice;
  state: PlanItemState;
  started: boolean;
  blockedBy: BlockedBy[];
  forced: { by: string; at: string } | null;
  latestSessionId: string | null;
};

export type FolderChange = { from: string; to: string };
export type PlanView = { version: number; stale: boolean; folderChange: FolderChange | null; unassigned: string[]; canEdit: boolean; agents: AgentAvailability[]; items: PlanItemView[] };
type ViewInput = { plan: StoredPlan | null; set: TaskSet | null; canEdit: boolean; agents: AgentAvailability[] };

function itemView(item: StoredPlanItem, set: TaskSet): PlanItemView {
  const { state, blockedBy } = itemReadiness(item, set);
  const forced = item.started && item.forced ? { by: item.forced.by, at: item.forced.at.toISOString() } : null;
  return { id: item.id, position: item.position, taskIds: item.taskIds, choice: item.choice, state, started: item.started, blockedBy, forced, latestSessionId: item.latestSession?.id ?? null };
}

function emptyPlanView(input: { version: number; unassigned: string[]; canEdit: boolean; agents: AgentAvailability[]; folderChange?: FolderChange }): PlanView {
  const { version, unassigned, canEdit, agents, folderChange = null } = input;
  return { version, stale: false, folderChange, unassigned, canEdit, agents, items: [] };
}

export function buildPlanView({ plan, set, canEdit, agents }: ViewInput): PlanView {
  const version = plan?.version ?? 0;
  if (!set || set.problem !== null) return emptyPlanView({ version, unassigned: [], canEdit, agents });
  const allTasks = set.tasks.map((task) => task.id);
  if (!plan) return emptyPlanView({ version, unassigned: allTasks, canEdit, agents });
  if (planFolderChanged(plan, set)) return emptyPlanView({ version, unassigned: allTasks, canEdit, agents, folderChange: { from: plan.tasksFolder, to: set.folder } });
  const reconciled = reconcilePlan(plan, set);
  return { version, stale: reconciled.stale, folderChange: null, unassigned: reconciled.unassigned, canEdit, agents, items: reconciled.items.map((item) => itemView(item, set)) };
}
