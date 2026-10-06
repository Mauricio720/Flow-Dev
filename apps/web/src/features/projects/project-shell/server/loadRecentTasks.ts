import "server-only";
import type { TaskSummary } from "@/lib/tasks/contract";
import { getServerCaller } from "@/lib/trpc/server";

export type RecentTasksLoad = { kind: "ready"; items: TaskSummary[] } | { kind: "failed" };

const RECENT_TASKS_LIMIT = 5;

export async function loadRecentTasks(projectId: string): Promise<RecentTasksLoad> {
  const caller = await getServerCaller();
  try {
    const page = await caller.tasks.list({ projectId });
    return { kind: "ready", items: page.items.slice(0, RECENT_TASKS_LIMIT) };
  } catch {
    return { kind: "failed" };
  }
}
