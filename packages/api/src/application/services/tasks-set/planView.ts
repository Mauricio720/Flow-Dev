import type { AgentAvailability, AgentChoice } from "../../terminal/sessionAgentCatalog";
import { itemReadiness } from "./planReadiness";
import type { BlockedBy, ReadinessContext } from "./planReadiness";
import { planFolderChanged, reconcilePlan } from "./planReconciliation";
import type { PlanItemState, StoredPlan, StoredPlanItem } from "./planTypes";
import type { TaskSet } from "./taskSetTypes";
import type { PlanRunView } from "../plan-run/planRunView";

export type PlanItemView = {
  id: string;
  position: number;
  taskIds: string[];
  choice: AgentChoice;
  state: PlanItemState;
  started: boolean;
  after: string[];
  waitingSessions: string[];
  blockedBy: BlockedBy[];
  forced: { by: string; at: string } | null;
  latestSessionId: string | null;
};

export type FolderChange = { from: string; to: string };
export type PlanView = { run: PlanRunView | null; version: number; stale: boolean; folderChange: FolderChange | null; unassigned: string[]; canEdit: boolean; agents: AgentAvailability[]; items: PlanItemView[] };
type ViewInput = { plan: StoredPlan | null; set: TaskSet | null; canEdit: boolean; agents: AgentAvailability[]; run?: PlanRunView | null };

function itemView(item: StoredPlanItem, context: ReadinessContext): PlanItemView {
  const { state, blockedBy, waitingSessions } = itemReadiness(item, context);
  const forced = item.started && item.forced ? { by: item.forced.by, at: item.forced.at.toISOString() } : null;
  return { id: item.id, position: item.position, taskIds: item.taskIds, choice: item.choice, state, started: item.started, after: item.after, waitingSessions, blockedBy, forced, latestSessionId: item.latestSession?.id ?? null };
}

function emptyPlanView(input: { version: number; unassigned: string[]; canEdit: boolean; agents: AgentAvailability[]; folderChange?: FolderChange; run: PlanRunView | null }): PlanView {
  const { version, unassigned, canEdit, agents, folderChange = null, run } = input;
  return { run, version, stale: false, folderChange, unassigned, canEdit, agents, items: [] };
}

export function buildPlanView({ plan, set, canEdit, agents, run = null }: ViewInput): PlanView {
  const version = plan?.version ?? 0;
  if (!set || set.problem !== null) return emptyPlanView({ version, unassigned: [], canEdit, agents, run });
  const allTasks = set.tasks.map((task) => task.id);
  if (!plan) return emptyPlanView({ version, unassigned: allTasks, canEdit, agents, run });
  if (planFolderChanged(plan, set)) return emptyPlanView({ version, unassigned: allTasks, canEdit, agents, run, folderChange: { from: plan.tasksFolder, to: set.folder } });
  const reconciled = reconcilePlan(plan, set);
  return { run, version, stale: reconciled.stale, folderChange: null, unassigned: reconciled.unassigned, canEdit, agents, items: reconciled.items.map((item) => itemView(item, { set, items: reconciled.items })) };
}
