import type { FlowAction, WorkspaceChoice } from "./flowContracts";
import type { LocalProjectAccess } from "./localProjectAccess";
import { TaskFlowError } from "./taskFlowErrors";
import type { TaskScope } from "./taskFlowPorts";

const LOCAL_KIND = "local";
const LOCAL_UNAVAILABLE = "local_unavailable";

export async function bindLocalTargets(actions: FlowAction[], scope: TaskScope, localProjects?: LocalProjectAccess): Promise<FlowAction[]> {
  if (!actions.some((action) => action.workspace.kind === LOCAL_KIND)) return actions;
  const project = await localProjects?.resolveTarget(scope);
  if (!project) throw new TaskFlowError("worktree_not_ready", undefined, { cause: LOCAL_UNAVAILABLE });
  return actions.map((action) => (action.workspace.kind === LOCAL_KIND ? { ...action, workspace: { kind: LOCAL_KIND, target: project.target } } : action));
}

export function publicWorkspace(workspace: WorkspaceChoice): WorkspaceChoice {
  return workspace.kind === LOCAL_KIND ? { kind: LOCAL_KIND } : workspace;
}

export function withoutLocalTarget<Action extends { workspace: WorkspaceChoice }>(action: Action): Action {
  return { ...action, workspace: publicWorkspace(action.workspace) };
}
