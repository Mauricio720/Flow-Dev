import { IssueComposer } from "@/features/issues/issue-composer";
import { decodeSpecSelection } from "@/features/issues/issue-composer/spec/specSelectionParams";
import { loadTaskWorkspace } from "@/features/issues/issue-composer/server/loadTaskWorkspace";
import { ProjectShell, ProjectUnavailable } from "@/features/projects/project-shell";
import { loadProjectContext } from "@/features/projects/project-shell/server/loadProjectContext";
import { isTaskId, projectIssuesPath, projectTaskPath } from "@/lib/navigation/projectRoutes";

export default async function ProjectTaskPage({ params, searchParams }: PageProps<"/projects/[projectId]/issues/[taskId]">) {
  const { projectId, taskId } = await params;
  const selection = decodeSpecSelection(await searchParams);
  const returnPath = isTaskId(taskId) ? projectTaskPath(projectId, taskId) : projectIssuesPath(projectId);
  const context = await loadProjectContext(projectId, returnPath);
  if (context.kind === "unavailable") return <ProjectUnavailable />;
  const initial = await loadTaskWorkspace(context.project.id, taskId, selection);
  return (
    <ProjectShell project={context.project} section="issues">
      <IssueComposer project={context.project} initial={initial} />
    </ProjectShell>
  );
}
