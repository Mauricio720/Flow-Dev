import { ProjectSettings } from "@/features/projects/project-settings";
import { ProjectShell, ProjectUnavailable } from "@/features/projects/project-shell";
import { loadProjectContext } from "@/features/projects/project-shell/server/loadProjectContext";
import { loadViewer } from "@/lib/auth/viewer";
import { projectSettingsPath } from "@/lib/navigation/projectRoutes";

export default async function ProjectSettingsPage({ params }: PageProps<"/projects/[projectId]/settings">) {
  const { projectId } = await params;
  const context = await loadProjectContext(projectId, projectSettingsPath(projectId));
  if (context.kind === "unavailable") return <ProjectUnavailable />;
  const viewer = await loadViewer();
  return (
    <ProjectShell project={context.project} section="settings">
      <ProjectSettings project={context.project} canEdit={viewer.isAdmin} />
    </ProjectShell>
  );
}
