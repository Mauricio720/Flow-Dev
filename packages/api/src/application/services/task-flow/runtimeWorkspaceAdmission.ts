import { createHash } from "node:crypto";
import type { TaskFlowDao } from "../../database/dao/taskFlowDao";
import type { CompozyControlGateway, WorktreeInfo } from "../../software/compozyControlGateway";
import type { ControlResult } from "../../software/controlErrors";
import type { ControlWorkspaceResolver } from "./controlWorkspace";
import { TaskFlowError } from "./taskFlowErrors";
import type { ResolvedWorkspace, WorkspaceAdmission } from "./taskFlowPorts";
import { WorktreePolicy } from "./worktreePolicy";
import type { LocalProjectAccess } from "./localProjectAccess";

export type RuntimeWorkspaceDependencies = { flow: Pick<TaskFlowDao, "runs">; gateway: CompozyControlGateway; resolver: ControlWorkspaceResolver; localProjects?: LocalProjectAccess; policy?: WorktreePolicy };

const requestIdFor = (taskId: string, name: string) => createHash("sha256").update(`worktree:${taskId}:${name}`).digest("hex").slice(0, 32);

function unwrap(result: ControlResult<WorktreeInfo>): WorktreeInfo | null {
  return result.ok ? result.value : null;
}

export class RuntimeWorkspaceAdmission implements WorkspaceAdmission {
  private readonly policy: WorktreePolicy;

  constructor(private readonly deps: RuntimeWorkspaceDependencies) {
    this.policy = deps.policy ?? new WorktreePolicy();
  }

  async resolve(input: Parameters<WorkspaceAdmission["resolve"]>[0]): Promise<ResolvedWorkspace> {
    const { workspace } = input;
    if (workspace.kind === "isolated") return { worktreeId: null };
    if (workspace.kind === "local") {
      const project = await this.deps.localProjects?.resolveTarget(input);
      if (!project) throw new TaskFlowError("worktree_not_ready", undefined, { cause: "local_unavailable" });
      const active = await this.deps.flow.runs.countActiveWriteOnWorktree(project.key, input.taskId);
      if (active > 0) throw new TaskFlowError("worktree_not_ready", undefined, { cause: "busy" });
      return { worktreeId: project.key, localTarget: project.target };
    }
    const context = await this.deps.resolver.resolve({ taskId: input.taskId, projectId: input.projectId });
    if (!context) throw new TaskFlowError("worktree_not_ready", undefined, { cause: "workspace_unregistered" });
    const worktree = workspace.kind === "existing"
      ? unwrap(await this.deps.gateway.getWorktree(context.workspaceId, workspace.worktreeId))
      : unwrap(await this.deps.gateway.createWorktree({ workspaceId: context.workspaceId, name: workspace.name, requestId: requestIdFor(input.taskId, workspace.name) }));
    const others = worktree ? await this.deps.flow.runs.countActiveWriteOnWorktree(worktree.id, input.taskId) : 0;
    this.policy.assertUsable({ worktree, taskWorkspaceId: context.workspaceId, otherActiveWriteRuns: others, writable: true });
    return { worktreeId: worktree!.id };
  }
}
