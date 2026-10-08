import { WorkDetail } from "@/features/issues/assigned-work";
import { loadWorkDetail } from "@/features/issues/assigned-work/server/loadWorkDetail";
import { decodeSpecSelection } from "@/features/issues/assigned-work/spec/specSelectionParams";
import { ProjectShell, ProjectUnavailable } from "@/features/projects/project-shell";
import { loadProjectContext } from "@/features/projects/project-shell/server/loadProjectContext";
import { loadViewer } from "@/lib/auth/viewer";
import { isTaskId, projectWorkPath, projectWorkTaskPath } from "@/lib/navigation/projectRoutes";

export default async function ProjectWorkTaskPage({ params, searchParams }: PageProps<"/projects/[projectId]/work/[taskId]">) {
  const { projectId, taskId } = await params;
  const selection = decodeSpecSelection(await searchParams);
  const returnPath = isTaskId(taskId) ? projectWorkTaskPath(projectId, taskId) : projectWorkPath(projectId);
  const context = await loadProjectContext(projectId, returnPath);
  if (context.kind === "unavailable") return <ProjectUnavailable />;
  const [initial, viewer] = await Promise.all([loadWorkDetail(context.project.id, taskId, selection), loadViewer()]);
  return (
    <ProjectShell project={context.project} section="work" isAdmin={viewer.isAdmin}>
      <WorkDetail project={context.project} initial={initial} />
    </ProjectShell>
  );
}
