import { AssignedWork } from "@/features/issues/assigned-work";
import { loadWorkList } from "@/features/issues/assigned-work/server/loadWorkList";
import { ProjectShell, ProjectUnavailable } from "@/features/projects/project-shell";
import { loadProjectContext } from "@/features/projects/project-shell/server/loadProjectContext";
import { loadViewer } from "@/lib/auth/viewer";
import { projectWorkPath } from "@/lib/navigation/projectRoutes";

export default async function ProjectWorkPage({ params }: PageProps<"/projects/[projectId]/work">) {
  const { projectId } = await params;
  const context = await loadProjectContext(projectId, projectWorkPath(projectId));
  if (context.kind === "unavailable") return <ProjectUnavailable />;
  const [initial, viewer] = await Promise.all([loadWorkList(context.project.id), loadViewer()]);
  return (
    <ProjectShell project={context.project} section="work" isAdmin={viewer.isAdmin}>
      <AssignedWork project={context.project} initial={initial} />
    </ProjectShell>
  );
}
