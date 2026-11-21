import { WorkDetail } from "@/features/issues/assigned-work";
import { loadWorkDetail } from "@/features/issues/assigned-work/server/loadWorkDetail";
import { ProjectShell, ProjectUnavailable } from "@/features/projects/project-shell";
import { loadProjectContext } from "@/features/projects/project-shell/server/loadProjectContext";
import { loadViewer } from "@/lib/auth/viewer";
import { isTaskId, projectWorkPath, projectWorkTaskPath } from "@/lib/navigation/projectRoutes";

export default async function ProjectWorkTaskPage({ params }: PageProps<"/projects/[projectId]/work/[taskId]">) {
  const { projectId, taskId } = await params;
  const returnPath = isTaskId(taskId) ? projectWorkTaskPath(projectId, taskId) : projectWorkPath(projectId);
  const context = await loadProjectContext(projectId, returnPath);
  if (context.kind === "unavailable") return <ProjectUnavailable />;
  const [initial, viewer] = await Promise.all([loadWorkDetail(context.project.id, taskId), loadViewer()]);
  return (
    <ProjectShell project={context.project} section="work" isAdmin={viewer.isAdmin}>
      <WorkDetail project={context.project} initial={initial} />
    </ProjectShell>
  );
}
