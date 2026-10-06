import type { TaskDetail } from "../contract";

export function specVisible(detail: TaskDetail) {
  return detail.task.status === "published" && detail.planning.status === "approved";
}
