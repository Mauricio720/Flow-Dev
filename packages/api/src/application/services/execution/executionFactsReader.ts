import type { IssueSourceDao } from "../../database/dao/issueSourceDao";
import type { ProjectDao } from "../../database/dao/projectDao";
import type { ProjectCompozyBinding, ProjectCompozyBindingDao } from "../../database/dao/projectCompozyBindingDao";
import type { ExecutionDecisionRecord, TaskExecutionDao } from "../../database/dao/taskExecutionDao";
import { TaskError } from "../tasks/taskErrors";
import type { ExecutionIssue } from "./executionPlan";
import type { StartFacts } from "./executionStartRules";

export type ExecutionFacts = StartFacts & { decision: ExecutionDecisionRecord | null; binding: ProjectCompozyBinding | null; projectKey: string; issue: ExecutionIssue };
type FactsDeps = { executions: TaskExecutionDao; sources: IssueSourceDao; bindings: ProjectCompozyBindingDao; projects: Pick<ProjectDao, "findById"> };
type FactsScope = { projectId: string; taskId: string; claimed: boolean };

export class ExecutionFactsReader {
  constructor(private readonly deps: FactsDeps) {}

  async read(scope: FactsScope): Promise<ExecutionFacts> {
    const [project, source, binding, decision] = await Promise.all([
      this.deps.projects.findById?.(scope.projectId) ?? null,
      this.deps.sources.findByTask(scope.projectId, scope.taskId),
      this.deps.bindings.find(scope.projectId),
      this.deps.executions.latestDecision(scope.taskId),
    ]);
    if (!project) throw new TaskError("project_unavailable");
    if (!source) throw new TaskError("work_unavailable");
    const issue = { title: source.snapshot.title, url: source.issueUrl, number: source.issueNumber, bodyMarkdown: source.snapshot.bodyMarkdown };
    return { decision, binding, bindingState: binding?.state ?? null, repositoryArchived: project.repository?.archived ?? false, claimed: scope.claimed, projectKey: project.externalKey, issue };
  }
}
