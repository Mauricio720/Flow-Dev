import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightIcon, GitHubMark } from "@/components/icons";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { Button } from "@/components/ui/button";
import { PROJECTS_PATH, projectPath } from "@/lib/navigation/projectRoutes";
import type { Project } from "@/lib/projects/contract";
import { SHELL_MENUS, type ShellSection } from "./ShellNav";

const GITHUB_ORIGIN = "https://github.com";

type Props = { project: Project; section: ShellSection; drawer: ReactNode };

function Crumb({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li className={`flex min-w-0 items-center gap-1.5 ${className ?? ""}`}>
      {children}
      <ChevronRightIcon size={14} className="shrink-0 text-ink-3" />
    </li>
  );
}

function repositoryUrl(project: Project) {
  return project.repository ? `${GITHUB_ORIGIN}/${project.repository.owner}/${project.repository.name}` : null;
}

export function ShellHeader({ project, section, drawer }: Props) {
  const label = SHELL_MENUS.find((menu) => menu.section === section)!.label;
  const url = repositoryUrl(project);
  return (
    <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-line bg-ground px-3 sm:px-6">
      {drawer}
      <nav aria-label="Trilha" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm text-ink-3">
          <Crumb className="hidden md:flex"><Link href={PROJECTS_PATH} className="hover:text-ink">Projetos</Link></Crumb>
          <Crumb className="hidden sm:flex"><Link href={projectPath(project.id)} title={project.name} className="truncate hover:text-ink">{project.name}</Link></Crumb>
          <li aria-current="page" className="truncate font-medium text-ink">{label}</li>
        </ol>
      </nav>
      {url && (
        <Button variant="ghost" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Repositório no GitHub">
            <GitHubMark />
            <span className="hidden sm:inline">Repositório</span>
          </a>
        </Button>
      )}
      <SignOutButton />
    </header>
  );
}
