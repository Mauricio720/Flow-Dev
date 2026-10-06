import { BranchIcon } from "@/components/icons";
import type { Project } from "@/lib/projects/contract";
import { cn } from "@/lib/utils";

const MISSING_REPOSITORY_LABEL = "Sem repositório vinculado";

export function repositoryLabel(project: Pick<Project, "repository">) {
  return project.repository ? `${project.repository.owner}/${project.repository.name}` : MISSING_REPOSITORY_LABEL;
}

type Props = { project: Pick<Project, "repository">; id?: string; className?: string };

export function RepositoryIdentity({ project, id, className }: Props) {
  const label = repositoryLabel(project);
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 font-mono text-[13px] text-ink-2", className)}>
      <BranchIcon size={14} className="shrink-0" />
      <span id={id} title={label} className="truncate">{label}</span>
    </span>
  );
}
