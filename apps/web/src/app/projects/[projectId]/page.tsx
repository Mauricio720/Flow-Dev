import { projectNotice } from "@/components/projects/connectionNotice";
import { ProjectOverview, ProjectShell, ProjectUnavailable } from "@/features/projects/project-shell";
import { loadProjectContext } from "@/features/projects/project-shell/server/loadProjectContext";
import { loadRecentTasks } from "@/features/projects/project-shell/server/loadRecentTasks";
import { loadViewer } from "@/lib/auth/viewer";
import { projectPath } from "@/lib/navigation/projectRoutes";

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const context = await loadProjectContext(projectId, projectPath(projectId));
  if (context.kind === "unavailable") return <ProjectUnavailable />;
  const [recent, query, viewer] = await Promise.all([loadRecentTasks(context.project.id), searchParams, loadViewer()]);
  return (
    <ProjectShell project={context.project} section="overview" isAdmin={viewer.isAdmin}>
      <ProjectOverview project={context.project} notice={projectNotice(query)} recent={recent} isAdmin={viewer.isAdmin} />
    </ProjectShell>
  );
}
