import Link from "next/link";
import { SelectorIcon } from "@/components/icons";
import { RepositoryIdentity } from "@/components/projects/RepositoryIdentity";
import { PROJECTS_PATH } from "@/lib/navigation/projectRoutes";
import type { Project } from "@/lib/projects/contract";

export function ProjectSwitcher({ project }: { project: Project }) {
  return (
    <div className="rounded-xl border border-line bg-raised p-3">
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink text-sm font-semibold text-ground uppercase">{project.name.trim().charAt(0)}</span>
        <div role="group" aria-label="Projeto ativo" className="min-w-0 flex-1">
          <span title={project.name} className="block truncate text-sm font-semibold">{project.name}</span>
          <RepositoryIdentity project={project} className="mt-0.5 text-xs" />
        </div>
      </div>
      <Link href={PROJECTS_PATH} className="mt-3 flex h-8 items-center justify-center gap-1.5 rounded-md border border-line text-xs text-ink-2 transition-colors duration-200 ease-out-expo hover:border-ink-3 hover:text-ink">
        <SelectorIcon size={14} />
        Trocar projeto
      </Link>
    </div>
  );
}
