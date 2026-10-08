import { IssueComposer } from "@/features/issues/issue-composer";
import { loadTaskWorkspace } from "@/features/issues/issue-composer/server/loadTaskWorkspace";
import { ProjectShell, ProjectUnavailable } from "@/features/projects/project-shell";
import { loadProjectContext } from "@/features/projects/project-shell/server/loadProjectContext";
import { loadViewer } from "@/lib/auth/viewer";
import { projectIssuesPath } from "@/lib/navigation/projectRoutes";

export default async function ProjectIssuesPage({ params }: PageProps<"/projects/[projectId]/issues">) {
  const { projectId } = await params;
  const context = await loadProjectContext(projectId, projectIssuesPath(projectId));
  if (context.kind === "unavailable") return <ProjectUnavailable />;
  const [initial, viewer] = await Promise.all([loadTaskWorkspace(context.project.id, null), loadViewer()]);
  return (
    <ProjectShell project={context.project} section="issues" isAdmin={viewer.isAdmin}>
      <IssueComposer project={context.project} initial={initial} canAuthor={viewer.isAdmin} />
    </ProjectShell>
  );
}
