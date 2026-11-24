import { NO_DEPENDENCY_MARK, TASK_FILE_MISSING, TASK_STATUS_LABEL, TASK_WITHOUT_TITLE } from "./taskSetCopy";
import type { SpecItem, TaskItem, TaskSetData, TaskSetView } from "./taskSetContract";

const TASK_ID_PREFIX = "task_";
const DEPENDS_ON = "depende de";
const SEPARATOR = " · ";

function numberOf(taskId: string) {
  return taskId.startsWith(TASK_ID_PREFIX) ? taskId.slice(TASK_ID_PREFIX.length) : taskId;
}

export function dependencyText(task: Pick<TaskItem, "dependsOn">) {
  return `${DEPENDS_ON} ${dependencyNumbers(task)}`;
}

export function taskRowLabel(task: TaskItem) {
  const head = [`${task.number} — ${taskTitle(task)}`, task.type, task.complexity].filter((part): part is string => part !== null);
  return [...head, dependencyText(task), `${task.miniDone}/${task.miniTotal}`, TASK_STATUS_LABEL[task.status]].join(SEPARATOR);
}

export function taskSetSummary(tasks: TaskItem[]) {
  const sum = (pick: (task: TaskItem) => number) => tasks.reduce((total, task) => total + pick(task), 0);
  return { total: tasks.length, completed: tasks.filter((task) => task.status === "completed").length, miniDone: sum((task) => task.miniDone), miniTotal: sum((task) => task.miniTotal) };
}

export function dependencyNumbers(task: Pick<TaskItem, "dependsOn">) {
  return task.dependsOn.length === 0 ? NO_DEPENDENCY_MARK : task.dependsOn.map(numberOf).join(", ");
}

export function taskTitle(task: TaskItem) {
  return task.title ?? (task.artifactId === null ? TASK_FILE_MISSING : TASK_WITHOUT_TITLE);
}

export function isSetReadable(set: TaskSetData): boolean {
  return set.problem === null;
}

export function allTasksCompleted(set: TaskSetData) {
  return set.tasks.length > 0 && set.tasks.every((task) => task.status === "completed");
}

export function hasTasksTab(view: TaskSetView | null): view is TaskSetView {
  return view !== null && (view.set !== null || view.specs.length > 0);
}

const SPEC_FILE_NAME = "spec.md";

export function specsOfFolderFirst(specs: SpecItem[], folder: string): SpecItem[] {
  const folderSpecPath = folder === "" ? SPEC_FILE_NAME : `${folder}/${SPEC_FILE_NAME}`;
  return [...specs.filter((spec) => spec.path === folderSpecPath), ...specs.filter((spec) => spec.path !== folderSpecPath)];
}
