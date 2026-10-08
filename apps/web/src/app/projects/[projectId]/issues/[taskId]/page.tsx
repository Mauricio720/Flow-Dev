import { IssueComposer } from "@/features/issues/issue-composer";
import { loadTaskWorkspace } from "@/features/issues/issue-composer/server/loadTaskWorkspace";
import { ProjectShell, ProjectUnavailable } from "@/features/projects/project-shell";
import { loadProjectContext } from "@/features/projects/project-shell/server/loadProjectContext";
import { loadViewer } from "@/lib/auth/viewer";
import { isTaskId, projectIssuesPath, projectTaskPath } from "@/lib/navigation/projectRoutes";

export default async function ProjectTaskPage({ params }: PageProps<"/projects/[projectId]/issues/[taskId]">) {
  const { projectId, taskId } = await params;
  const returnPath = isTaskId(taskId) ? projectTaskPath(projectId, taskId) : projectIssuesPath(projectId);
  const context = await loadProjectContext(projectId, returnPath);
  if (context.kind === "unavailable") return <ProjectUnavailable />;
  const [initial, viewer] = await Promise.all([loadTaskWorkspace(context.project.id, taskId), loadViewer()]);
  return (
    <ProjectShell project={context.project} section="issues" isAdmin={viewer.isAdmin}>
      <IssueComposer project={context.project} initial={initial} canAuthor={viewer.isAdmin} />
    </ProjectShell>
  );
}
