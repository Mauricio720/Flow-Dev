import "server-only";
import { isTaskId, projectWorkTaskPath } from "@/lib/navigation/projectRoutes";
import { getServerCaller } from "@/lib/trpc/server";
import type { WorkDetailLoad, WorkLoad } from "../contract";
import { flowVisible } from "../flowVisibility";
import type { SpecLoad, SpecSelection } from "../spec/specContract";
import type { FlowLoad, FlowOverview } from "../spec/unified/unifiedContract";
import { failureOf } from "./loaderFailure";

type Caller = Awaited<ReturnType<typeof getServerCaller>>;
type Scope = { projectId: string; taskId: string; returnPath: string };

const UNKNOWN_WORK: WorkLoad = { kind: "failed", failure: { code: "NOT_FOUND", reason: "work_unavailable" } };
const NO_SELECTION: SpecSelection = { stage: null, packageId: null, documentId: null };

async function loadWork(caller: Caller, scope: Scope): Promise<WorkLoad> {
  const target = { projectId: scope.projectId, taskId: scope.taskId };
  try {
    const [view, detail] = await Promise.all([caller.assignedIssues.byTask(target), caller.tasks.byId(target)]);
    return { kind: "ready", snapshot: { view, detail } };
  } catch (error) {
    return { kind: "failed", failure: failureOf(error, scope.returnPath) };
  }
}

async function loadSpec(caller: Caller, scope: Scope): Promise<SpecLoad> {
  try {
    return { kind: "ready", snapshot: await caller.taskSpec.byTask({ projectId: scope.projectId, taskId: scope.taskId }) };
  } catch (error) {
    return { kind: "failed", failure: failureOf(error, scope.returnPath) };
  }
}

async function loadFlow(caller: Caller, scope: Scope): Promise<FlowLoad> {
  try {
    const overview = await caller.taskFlow.byTask({ projectId: scope.projectId, taskId: scope.taskId });
    return { kind: "ready", overview: JSON.parse(JSON.stringify(overview)) as FlowOverview };
  } catch {
    return { kind: "failed" };
  }
}

export async function loadWorkDetail(projectId: string, taskId: string, selection: SpecSelection = NO_SELECTION): Promise<WorkDetailLoad> {
  const none = { spec: { kind: "none" } as SpecLoad, flow: { kind: "none" } as FlowLoad, specSelection: selection };
  if (!isTaskId(taskId)) return { taskId, work: UNKNOWN_WORK, ...none };
  const scope = { projectId, taskId, returnPath: projectWorkTaskPath(projectId, taskId) };
  const caller = await getServerCaller();
  const work = await loadWork(caller, scope);
  if (work.kind !== "ready" || !flowVisible(work.snapshot)) return { taskId, work, ...none };
  const [spec, flow] = await Promise.all([loadSpec(caller, scope), loadFlow(caller, scope)]);
  return { taskId, work, spec, flow, specSelection: selection };
}
