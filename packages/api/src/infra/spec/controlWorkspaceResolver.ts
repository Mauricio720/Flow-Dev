import type { TaskFlowDao } from "../../application/database/dao/taskFlowDao";
import type { ControlWorkspace, ControlWorkspaceResolver } from "../../application/services/task-flow/controlWorkspace";
import type { RepositoryAccessService } from "../../application/services/projects/repositoryAccessService";
import type { CompozyControlGateway } from "../../application/software/compozyControlGateway";
import { planCheckout } from "./workspace/checkoutPlan";

export type ResolverDependencies = { flow: Pick<TaskFlowDao, "taskContext">; repositories: RepositoryAccessService; gateway: CompozyControlGateway; workspaceRoot: string };

export class RegisteredWorkspaceResolver implements ControlWorkspaceResolver {
  constructor(private readonly deps: ResolverDependencies) {}

  async resolve(input: { taskId: string; projectId: string; worktreeId?: string | null; workspace?: { kind: string } }): Promise<ControlWorkspace | null> {
    const context = await this.deps.flow.taskContext(input.taskId);
    if (!context?.operatorUserId) return null;
    const repository = await this.deps.repositories.requirePersonalRead({ userId: context.operatorUserId }, input.projectId);
    const rootDir = planCheckout({ root: this.deps.workspaceRoot, repositoryGithubId: repository.githubId, taskId: input.taskId }).checkoutPath;
    const found = await this.deps.gateway.findWorkspace(rootDir);
    if (!found.ok || !found.value) return null;
    if (input.worktreeId) {
      const worktree = await this.deps.gateway.getWorktree(found.value, input.worktreeId);
      if (!worktree.ok || worktree.value.id !== input.worktreeId || worktree.value.state !== "ready" || worktree.value.workspaceId !== found.value || !worktree.value.path) return null;
      return { workspaceId: found.value, repositoryId: repository.githubId, worktreePath: worktree.value.path };
    }
    return { workspaceId: found.value, repositoryId: repository.githubId };
  }
}
