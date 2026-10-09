import type { PlanningWorkspaceProvisionInput, PlanningWorkspaceProvisioner as Provisioner } from "../../application/planning/planningWorkspaceProvisioner";
import type { RepositoryAccessService } from "../../application/services/projects/repositoryAccessService";
import type { SpecWorkspaceGateway } from "../../application/spec/specWorkspaceGateway";
import type { CompozyControlGateway, WorktreeInfo } from "../../application/software/compozyControlGateway";
import { TaskError } from "../../application/services/tasks/taskErrors";

const GIT_USERNAME = "x-access-token";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new TaskError("workspace_unavailable");
  return result.value;
}

function worktreeNamed(items: WorktreeInfo[], name: string) {
  return items.find((item) => item.name === name) ?? null;
}

function assertWorktreeAvailable(worktree: WorktreeInfo) {
  if (worktree.state === "failed" || worktree.state === "missing") throw new TaskError("workspace_unavailable");
}

export class PlanningWorkspaceProvisioner implements Provisioner {
  constructor(private readonly deps: { repositories: RepositoryAccessService; workspaces: SpecWorkspaceGateway; gateway: CompozyControlGateway; workspaceRoot: string }) {}

  async provision(input: PlanningWorkspaceProvisionInput) {
    if (!this.deps.workspaceRoot) throw new TaskError("workspace_unavailable");
    const actor = { userId: input.requesterUserId, sessionId: input.sessionId };
    const access = await this.deps.repositories.contextCredentials(actor, input.projectId);
    if (access.repository.githubId !== input.repositoryId || access.repository.nodeId !== input.repositoryNodeId) throw new TaskError("planning_access_revoked");
    if (!access.token) throw new TaskError("repository_authorization_needed");
    const checkout = await this.deps.workspaces.prepare({ taskId: input.taskId, repositoryGithubId: input.repositoryId, owner: access.repository.owner, name: access.repository.name, pinnedCommit: null, credential: { username: GIT_USERNAME, password: access.token } });
    const workspaceId = unwrap(await this.deps.gateway.registerWorkspace?.({ rootDir: checkout.checkoutPath, name: checkout.slug }) ?? { ok: false as const });
    await this.ensureWorktree(workspaceId, input.taskId);
  }

  private async ensureWorktree(workspaceId: string, taskId: string) {
    const name = `issue-${taskId}`;
    const worktrees = unwrap(await this.deps.gateway.listWorktrees(workspaceId));
    const existing = worktreeNamed(worktrees, name);
    if (existing) return assertWorktreeAvailable(existing);
    assertWorktreeAvailable(unwrap(await this.deps.gateway.createWorktree({ workspaceId, name, requestId: taskId })));
  }
}
