import type { SavedGraph, StoredPlan, StoredPlanItem } from "./planTypes";
import type { TaskSet } from "./taskSetTypes";

export type ReconciledPlan = { items: StoredPlanItem[]; unassigned: string[]; stale: boolean };

function edgeKeys(graph: SavedGraph) {
  return graph.edges.map((edge) => `${edge.from}>${edge.to}`).sort();
}

function currentGraph(set: TaskSet): SavedGraph {
  const edges = set.tasks.flatMap((task) => task.dependsOn.map((from) => ({ from, to: task.id })));
  return { nodes: set.tasks.map((task) => task.id), edges };
}

function sameGraph(left: SavedGraph, right: SavedGraph) {
  const sameNodes = JSON.stringify([...left.nodes].sort()) === JSON.stringify([...right.nodes].sort());
  return sameNodes && JSON.stringify(edgeKeys(left)) === JSON.stringify(edgeKeys(right));
}

export function planFolderChanged(plan: StoredPlan, set: TaskSet) {
  return plan.tasksFolder !== set.folder;
}

function isStale(plan: StoredPlan, set: TaskSet) {
  if (planFolderChanged(plan, set)) return true;
  if (plan.manifestVersion === set.manifestVersion) return false;
  return plan.savedGraph ? !sameGraph(plan.savedGraph, currentGraph(set)) : true;
}

function dropRemovedTasks(item: StoredPlanItem, existing: ReadonlySet<string>): StoredPlanItem {
  return item.started ? item : { ...item, taskIds: item.taskIds.filter((taskId) => existing.has(taskId)) };
}

export function reconcilePlan(plan: StoredPlan, set: TaskSet): ReconciledPlan {
  const existing = new Set(set.tasks.map((task) => task.id));
  const items = plan.items.map((item) => dropRemovedTasks(item, existing)).filter((item) => item.taskIds.length > 0);
  const assigned = new Set(items.flatMap((item) => item.taskIds));
  const unassigned = set.tasks.map((task) => task.id).filter((taskId) => !assigned.has(taskId));
  return { items, unassigned, stale: isStale(plan, set) };
}
