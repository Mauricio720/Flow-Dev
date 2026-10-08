"use client";

import type { ReactNode } from "react";
import type { Project } from "@/lib/projects/contract";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ProjectUnavailable } from "./components/ProjectUnavailable";
import { ShellDrawer } from "./components/ShellDrawer";
import { ShellHeader } from "./components/ShellHeader";
import { SHELL_MENUS, type ShellSection } from "./components/ShellNav";
import { useProjectAccess } from "./hooks/useProjectAccess";
import { ProjectConnectionContext } from "./projectConnection";

function sectionPath(section: ShellSection, projectId: string) {
  return SHELL_MENUS.find((menu) => menu.section === section)!.path(projectId);
}

type Props = { project: Project; section: ShellSection; isAdmin: boolean; children: ReactNode };

export function ProjectShell({ project, section, isAdmin, children }: Props) {
  const access = useProjectAccess(project.id, sectionPath(section, project.id));
  if (access.revoked) return <ProjectUnavailable />;
  const sidebar = <ProjectSidebar project={project} section={section} connection={access.kind} isAdmin={isAdmin} />;
  return (
    <div className="flex h-dvh">
      <aside aria-label="Projeto" className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">{sidebar}</aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellHeader project={project} section={section} drawer={<ShellDrawer>{sidebar}</ShellDrawer>} />
        <ProjectConnectionContext value={{ kind: access.kind, recheck: access.recheck }}>
          <div key={project.id} className="flex min-h-0 flex-1 flex-col">{children}</div>
        </ProjectConnectionContext>
      </div>
    </div>
  );
}

export { ProjectOverview } from "./components/ProjectOverview";
export { ProjectUnavailable } from "./components/ProjectUnavailable";
