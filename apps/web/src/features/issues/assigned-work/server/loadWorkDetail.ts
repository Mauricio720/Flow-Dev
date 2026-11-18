import "server-only";
import { isTaskId, projectWorkTaskPath } from "@/lib/navigation/projectRoutes";
import { getServerCaller } from "@/lib/trpc/server";
import type { WorkDetailLoad, WorkLoad } from "../contract";
import { failureOf } from "./loaderFailure";

const UNKNOWN_WORK: WorkLoad = { kind: "failed", failure: { code: "NOT_FOUND", reason: "work_unavailable" } };

async function loadWork(projectId: string, taskId: string): Promise<WorkLoad> {
  const target = { projectId, taskId };
  const caller = await getServerCaller();
  try {
    const [view, detail] = await Promise.all([caller.assignedIssues.byTask(target), caller.tasks.byId(target)]);
    return { kind: "ready", snapshot: { view, detail } };
  } catch (error) {
    return { kind: "failed", failure: failureOf(error, projectWorkTaskPath(projectId, taskId)) };
  }
}

export async function loadWorkDetail(projectId: string, taskId: string): Promise<WorkDetailLoad> {
  if (!isTaskId(taskId)) return { taskId, work: UNKNOWN_WORK };
  return { taskId, work: await loadWork(projectId, taskId) };
}
