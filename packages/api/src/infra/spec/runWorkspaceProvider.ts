import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ExecutionRequest } from "../../application/services/task-flow/actionExecutor";
import type { TaskFlowDao } from "../../application/database/dao/taskFlowDao";
import type { RepositoryAccessService } from "../../application/services/projects/repositoryAccessService";
import type { SpecWorkspaceGateway } from "../../application/spec/specWorkspaceGateway";
import type { ControlWorkspaceResolver } from "../../application/services/task-flow/controlWorkspace";
import type { ActionSnapshot } from "../../application/services/task-flow/flowContracts";
import { TaskError } from "../../application/services/tasks/taskErrors";
import type { CompozyControlGateway } from "../../application/software/compozyControlGateway";

export type RunWorkspace = { repositoryPath: string; homePath: string };

export interface RunWorkspaceProvider {
  prepare(request: ExecutionRequest): Promise<RunWorkspace>;
}

const GIT_USERNAME = "x-access-token";
const HOME_DIRECTORY = "home";

export class GitRunWorkspaceProvider implements RunWorkspaceProvider {
  constructor(private readonly deps: { flow: TaskFlowDao; repositories: RepositoryAccessService; workspaces: SpecWorkspaceGateway; resolver: ControlWorkspaceResolver; runtimeRoot: string; gateway?: CompozyControlGateway }) {}

  async prepare(request: ExecutionRequest): Promise<RunWorkspace> {
    const context = await this.deps.flow.taskContext(request.run.taskId);
    if (!context) throw new TaskError("workspace_unavailable");
    const snapshot = request.snapshot as ActionSnapshot;
    if (snapshot.workspace.kind === "local") throw new TaskError("workspace_unavailable");
    if (request.run.worktreeId || snapshot.worktreeId) {
      const selectedId = snapshot.workspace.kind === "existing" ? snapshot.workspace.worktreeId : request.run.worktreeId;
      if (!request.run.worktreeId || request.run.worktreeId !== snapshot.worktreeId || snapshot.workspace.kind === "isolated" || selectedId !== request.run.worktreeId) throw new TaskError("workspace_unavailable");
      const selected = await this.deps.resolver.resolve({ taskId: request.run.taskId, projectId: context.projectId, worktreeId: request.run.worktreeId });
      if (!selected?.worktreePath) throw new TaskError("workspace_unavailable");
      const homePath = join(this.deps.runtimeRoot, "tasks", request.run.taskId, HOME_DIRECTORY);
      await mkdir(homePath, { recursive: true });
      return { repositoryPath: selected.worktreePath, homePath };
    }
    if (snapshot.workspace.kind !== "isolated") throw new TaskError("workspace_unavailable");
    if (!context.operatorUserId) throw new TaskError("workspace_unavailable");
    const actor = { userId: context.operatorUserId };
    const repository = await this.deps.repositories.requirePersonalRead(actor, context.projectId);
    const { token } = await this.deps.repositories.contextCredentials(actor, context.projectId);
    if (!token) throw new TaskError("repository_authorization_needed");
    const checkout = await this.deps.workspaces.prepare({ taskId: request.run.taskId, repositoryGithubId: repository.githubId, owner: repository.owner, name: repository.name, pinnedCommit: null, credential: { username: GIT_USERNAME, password: token } });
    const registered = await this.deps.gateway?.registerWorkspace?.({ rootDir: checkout.checkoutPath, name: `flow-task-${request.run.taskId}` });
    if (registered && !registered.ok) throw new TaskError("workspace_unavailable");
    const homePath = join(this.deps.runtimeRoot, "tasks", request.run.taskId, HOME_DIRECTORY);
    await mkdir(homePath, { recursive: true });
    return { repositoryPath: checkout.checkoutPath, homePath };
  }
}
