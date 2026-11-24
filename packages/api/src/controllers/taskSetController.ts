import type { TaskSetReadDao } from "../application/database/dao/taskSetReadDao";
import { ReadAccessGate } from "../application/services/projects/readAccessGate";
import type { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { TaskError } from "../application/services/tasks/taskErrors";
import { TaskSetLoader } from "../application/services/tasks-set/taskSetLoader";
import type { SpecRef } from "../application/services/tasks-set/taskSetTypes";
import type { SessionPrincipal } from "../context";

type Scope = { projectId: string; taskId: string };

export class TaskSetController {
  private readonly gate: ReadAccessGate;

  constructor(private readonly dao: TaskSetReadDao, repositories: RepositoryAccessService, private readonly loader: TaskSetLoader = new TaskSetLoader(dao)) {
    this.gate = new ReadAccessGate(repositories);
  }

  async get(actor: SessionPrincipal, input: Scope) {
    await this.gate.require(actor, input.projectId);
    if (!(await this.dao.taskInProject(input.projectId, input.taskId))) throw new TaskError("task_unavailable");
    const [specs, set] = await Promise.all([this.dao.specs(input.taskId), this.loader.load(input.taskId)]);
    return { specs: toSpecRefs(specs), set };
  }
}

function toSpecRefs(specs: Awaited<ReturnType<TaskSetReadDao["specs"]>>): SpecRef[] {
  return [...specs]
    .sort((left, right) => right.capturedAt.getTime() - left.capturedAt.getTime() || left.path.localeCompare(right.path))
    .map((spec) => ({ artifactId: spec.artifactId, path: spec.path, updatedAt: spec.capturedAt.toISOString() }));
}
