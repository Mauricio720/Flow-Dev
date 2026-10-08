import Link from "next/link";
import type { MouseEvent } from "react";
import { ConnectionStateLabel } from "@/components/projects/ConnectionStateLabel";
import { RepositoryIdentity } from "@/components/projects/RepositoryIdentity";
import { Badge } from "@/components/ui/badge";
import { resolveHomeDestination } from "@/lib/navigation/resolveHomeDestination";
import type { ConnectionKind, Project } from "@/lib/projects/contract";

type Props = { project: Project; connection: ConnectionKind; opening: boolean; recent: boolean; isAdmin: boolean; onChoose: (projectId: string) => void };

function entryIds(projectId: string) {
  const base = `project-${projectId}`;
  return { name: `${base}-name`, repository: `${base}-repository`, state: `${base}-state`, description: `${base}-description` };
}

function opensElsewhere(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function ProjectEntry({ project, connection, opening, recent, isAdmin, onChoose }: Props) {
  const ids = entryIds(project.id);
  const describedBy = project.description ? `${ids.state} ${ids.description}` : ids.state;
  function open(event: MouseEvent<HTMLAnchorElement>) {
    if (opensElsewhere(event)) return;
    event.preventDefault();
    onChoose(project.id);
  }
  return (
    <li>
      <Link href={resolveHomeDestination(project.id, [project.id], { isAdmin })} onClick={open} aria-labelledby={`${ids.name} ${ids.repository}`} aria-describedby={describedBy} aria-busy={opening} className="grid gap-x-6 gap-y-2 px-5 py-4 transition-colors duration-200 ease-out-expo hover:bg-surface sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,15rem)] sm:items-center">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span id={ids.name} className="min-w-0 text-[15px] font-semibold [overflow-wrap:anywhere]">{project.name}</span>
            {recent && <Badge variant="outline">último acesso</Badge>}
          </span>
          {project.description && <span id={ids.description} className="mt-1 line-clamp-2 text-sm text-ink-2 [overflow-wrap:anywhere]">{project.description}</span>}
        </span>
        <RepositoryIdentity project={project} id={ids.repository} />
        {opening ? <span id={ids.state} className="text-xs text-ink-3">Abrindo…</span> : <ConnectionStateLabel kind={connection} id={ids.state} />}
      </Link>
    </li>
  );
}
