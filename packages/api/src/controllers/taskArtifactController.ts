import type { ArtifactReadDao } from "../application/database/dao/artifactReadDao";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { TaskError } from "../application/services/tasks/taskErrors";
import type { SessionPrincipal } from "../context";

type Scope = { projectId: string; taskId: string };

export class TaskArtifactController {
  constructor(private readonly dao: ArtifactReadDao, private readonly repositories: RepositoryAccessService) {}

  async list(actor: SessionPrincipal, input: Scope) {
    await this.requireTask(actor, input);
    return this.dao.list(input.taskId);
  }

  async get(actor: SessionPrincipal, input: Scope & { artifactId: string; version?: number }) {
    await this.requireTask(actor, input);
    const artifact = await this.dao.get({ taskId: input.taskId, artifactId: input.artifactId, version: input.version });
    if (!artifact) throw new TaskError("artifact_unavailable");
    return artifact;
  }

  private async requireTask(actor: SessionPrincipal, input: Scope) {
    await this.repositories.requireRead(actor, input.projectId);
    if (!(await this.dao.taskInProject(input.projectId, input.taskId))) throw new TaskError("task_unavailable");
  }
}
