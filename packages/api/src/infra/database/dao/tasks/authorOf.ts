import { TaskError } from "../../../../application/services/tasks/taskErrors";

export function authorOf(task: { authorUserId: string | null }) {
  if (!task.authorUserId) throw new TaskError("task_unavailable");
  return task.authorUserId;
}
