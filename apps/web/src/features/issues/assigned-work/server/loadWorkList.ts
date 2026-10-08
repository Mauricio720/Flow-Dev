import "server-only";
import { projectWorkPath } from "@/lib/navigation/projectRoutes";
import { getServerCaller } from "@/lib/trpc/server";
import type { ActiveLoad, QueueLoad, WorkListLoad } from "../contract";
import { failureOf } from "./loaderFailure";

type Caller = Awaited<ReturnType<typeof getServerCaller>>;

async function loadQueue(caller: Caller, projectId: string): Promise<QueueLoad> {
  try {
    return { kind: "ready", page: await caller.assignedIssues.list({ projectId }) };
  } catch (error) {
    return { kind: "failed", failure: failureOf(error, projectWorkPath(projectId)) };
  }
}

async function loadActive(caller: Caller, projectId: string): Promise<ActiveLoad> {
  try {
    return { kind: "ready", page: await caller.assignedIssues.active({ projectId, filter: "mine" }) };
  } catch (error) {
    return { kind: "failed", failure: failureOf(error, projectWorkPath(projectId)) };
  }
}

export async function loadWorkList(projectId: string): Promise<WorkListLoad> {
  const caller = await getServerCaller();
  const [queue, active] = await Promise.all([loadQueue(caller, projectId), loadActive(caller, projectId)]);
  return { queue, active };
}
