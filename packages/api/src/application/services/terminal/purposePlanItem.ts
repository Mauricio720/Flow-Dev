import type { ExecutionPlanDao } from "../../database/dao/executionPlanDao";
import { TaskError } from "../tasks/taskErrors";
import { itemReadiness, remainingTasks } from "../tasks-set/planReadiness";
import type { ItemReadiness } from "../tasks-set/planReadiness";
import { planFolderChanged, reconcilePlan } from "../tasks-set/planReconciliation";
import type { StoredPlanItem } from "../tasks-set/planTypes";
import type { TaskSetLoader } from "../tasks-set/taskSetLoader";
import type { TaskSet } from "../tasks-set/taskSetTypes";
import { buildExecutionPrompt } from "./taskPlanPrompts";

export type LoadedItem = { item: StoredPlanItem; set: TaskSet; readiness: ItemReadiness };
type ItemSources = { plans: Pick<ExecutionPlanDao, "find">; loader: Pick<TaskSetLoader, "load"> };

export async function loadItem(sources: ItemSources, input: { taskId: string; planItemId: string }): Promise<LoadedItem> {
  const [plan, set] = await Promise.all([sources.plans.find(input.taskId), sources.loader.load(input.taskId)]);
  if (!set || set.problem !== null) throw new TaskError("task_set_unavailable");
  if (plan && planFolderChanged(plan, set)) throw new TaskError("plan_item_not_ready");
  const item = plan ? reconcilePlan(plan, set).items.find((candidate) => candidate.id === input.planItemId) : undefined;
  if (!item) throw new TaskError("plan_item_not_ready");
  return { item, set, readiness: itemReadiness(item, set) };
}

export function requireStartable({ readiness }: LoadedItem) {
  if (readiness.state === "running" || readiness.state === "done") throw new TaskError("plan_item_not_ready");
}

export function executionPromptOf({ item, set }: LoadedItem) {
  const paths = remainingTasks(item, set).flatMap((taskId) => set.tasks.find((task) => task.id === taskId)?.path ?? []);
  return buildExecutionPrompt({ folder: set.folder, taskPaths: paths });
}
