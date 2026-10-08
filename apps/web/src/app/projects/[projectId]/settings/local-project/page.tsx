import { LocalProjectSettings } from "@/features/projects/local-project";
import { loadLocalProject } from "@/features/projects/local-project/server/loadLocalProject";
import { ProjectShell, ProjectUnavailable } from "@/features/projects/project-shell";
import { loadProjectContext } from "@/features/projects/project-shell/server/loadProjectContext";
import { loadViewer } from "@/lib/auth/viewer";
import { projectLocalProjectPath } from "@/lib/navigation/projectRoutes";

export default async function LocalProjectPage({ params }: PageProps<"/projects/[projectId]/settings/local-project">) {
  const { projectId } = await params;
  const context = await loadProjectContext(projectId, projectLocalProjectPath(projectId));
  if (context.kind === "unavailable") return <ProjectUnavailable />;
  const [initial, viewer] = await Promise.all([loadLocalProject(projectId), loadViewer()]);
  return (
    <ProjectShell project={context.project} section="local" isAdmin={viewer.isAdmin}>
      <LocalProjectSettings project={context.project} initial={initial} />
    </ProjectShell>
  );
}
