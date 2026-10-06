import Link from "next/link";
import { FlowMark } from "@/components/icons";
import { ConnectionStateLabel } from "@/components/projects/ConnectionStateLabel";
import { PROJECTS_PATH } from "@/lib/navigation/projectRoutes";
import type { ConnectionKind, Project } from "@/lib/projects/contract";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { ShellNav, type ShellSection } from "./ShellNav";

type Props = { project: Project; section: ShellSection; connection: ConnectionKind };

export function ProjectSidebar({ project, section, connection }: Props) {
  return (
    <div className="flex h-full flex-col gap-4 p-3">
      <Link href={PROJECTS_PATH} aria-label="Flow Dev, catálogo de projetos" className="flex h-9 w-fit items-center gap-2 rounded-md px-1.5 text-[15px] font-semibold tracking-[-0.01em]">
        <FlowMark />
        Flow Dev
      </Link>
      <ProjectSwitcher project={project} />
      <ShellNav projectId={project.id} section={section} />
      <span role="status" className="block border-t border-line px-1 pt-3 pb-1">
        <ConnectionStateLabel kind={connection} />
      </span>
    </div>
  );
}
