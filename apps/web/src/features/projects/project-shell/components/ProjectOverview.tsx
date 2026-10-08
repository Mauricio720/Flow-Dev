import Link from "next/link";
import { BranchIcon, PlusIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { projectIssuesPath, projectWorkPath } from "@/lib/navigation/projectRoutes";
import type { Project } from "@/lib/projects/contract";
import type { RecentTasksLoad } from "../server/loadRecentTasks";
import { IssueAuthorPanel } from "./IssueAuthorPanel";
import { RecentIntents } from "./RecentIntents";
import { RepositoryPanel } from "./RepositoryPanel";

type Props = { project: Project; notice: string | null; recent: RecentTasksLoad; isAdmin: boolean };

function OverviewActions({ project, isAdmin }: { project: Project; isAdmin: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant={isAdmin ? "outline" : "default"} className="w-fit"><Link href={projectWorkPath(project.id)}><BranchIcon />Trabalho atribuído</Link></Button>
      {isAdmin && <Button asChild className="w-fit"><Link href={projectIssuesPath(project.id)}><PlusIcon />Nova intenção</Link></Button>}
    </div>
  );
}

function OverviewHeading({ project, isAdmin }: { project: Project; isAdmin: boolean }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] [overflow-wrap:anywhere]">{project.name}</h1>
        {project.description && <p className="mt-2 max-w-2xl text-[15px] leading-7 text-ink-2 [overflow-wrap:anywhere]">{project.description}</p>}
      </div>
      <OverviewActions project={project} isAdmin={isAdmin} />
    </div>
  );
}

export function ProjectOverview({ project, notice, recent, isAdmin }: Props) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        {notice && <p role="alert" className="mb-8 rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-6 text-ink-2">{notice}</p>}
        <OverviewHeading project={project} isAdmin={isAdmin} />
        <RepositoryPanel project={project} />
        {isAdmin && (
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <RecentIntents projectId={project.id} recent={recent} />
            <IssueAuthorPanel />
          </div>
        )}
      </div>
    </main>
  );
}
