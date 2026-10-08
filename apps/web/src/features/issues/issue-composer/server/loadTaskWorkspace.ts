import "server-only";
import { redirect } from "next/navigation";
import { expiredSessionPath, isTaskId, projectIssuesPath, projectTaskPath } from "@/lib/navigation/projectRoutes";
import { getServerCaller } from "@/lib/trpc/server";
import type { HistoryLoad, TaskLoad, WorkspaceLoad } from "../contract";
import { TASK_UNAVAILABLE_REASON, accessProblem, taskFailure } from "@/lib/tasks/taskFailure";
import { MESSAGE_PAGE_SIZE, collectMessages } from "../taskMessages";

type Caller = Awaited<ReturnType<typeof getServerCaller>>;
type Scope = { projectId: string; taskId: string | null; returnPath: string };

const UNKNOWN_TASK: TaskLoad = { kind: "failed", failure: { code: "NOT_FOUND", reason: TASK_UNAVAILABLE_REASON } };

function failureOf(error: unknown, returnPath: string) {
  const failure = taskFailure(error);
  if (accessProblem(failure) === "session") redirect(expiredSessionPath(returnPath));
  return failure;
}

async function loadHistory(caller: Caller, scope: Scope): Promise<HistoryLoad> {
  try {
    return { kind: "ready", page: await caller.tasks.list({ projectId: scope.projectId }) };
  } catch (error) {
    return { kind: "failed", failure: failureOf(error, scope.returnPath) };
  }
}

async function loadTask(caller: Caller, scope: Scope): Promise<TaskLoad> {
  if (!scope.taskId) return { kind: "none" };
  if (!isTaskId(scope.taskId)) return UNKNOWN_TASK;
  const target = { projectId: scope.projectId, taskId: scope.taskId };
  try {
    const detail = await caller.tasks.byId(target);
    const messages = await collectMessages((cursor) => caller.tasks.messages({ ...target, cursor, limit: MESSAGE_PAGE_SIZE }));
    return { kind: "ready", snapshot: { detail, ...messages } };
  } catch (error) {
    return { kind: "failed", failure: failureOf(error, scope.returnPath) };
  }
}

export async function loadTaskWorkspace(projectId: string, taskId: string | null): Promise<WorkspaceLoad> {
  const returnPath = taskId && isTaskId(taskId) ? projectTaskPath(projectId, taskId) : projectIssuesPath(projectId);
  const scope = { projectId, taskId, returnPath };
  const caller = await getServerCaller();
  const [history, task] = await Promise.all([loadHistory(caller, scope), loadTask(caller, scope)]);
  return { taskId, history, task };
}
