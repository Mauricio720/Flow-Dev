"use client";

import Link from "next/link";
import { BranchIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/projects/contract";
import { projectWorkPath, projectWorkTaskPath } from "@/lib/navigation/projectRoutes";
import type { WorkDetailLoad, WorkSnapshot } from "../contract";
import { useWorkDetail } from "../hooks/useWorkDetail";
import { workStarted } from "../workStarted";
import { OperatorStages } from "./OperatorStages";
import { WorkAccessNotice } from "./WorkAccessNotice";
import { WorkAccountsScope } from "./WorkAccountsScope";
import { WorkAccountsSection } from "./WorkAccountsSection";
import { WorkHeader } from "./WorkHeader";
import { NotStartedNote, SourceChangedNotice } from "./WorkNotices";

type Props = { project: Project; initial: WorkDetailLoad };

function canOperate(snapshot: WorkSnapshot | null) {
  return Boolean(snapshot?.view.viewerCanOperate && snapshot.view.claim.state === "claimed");
}

export function WorkDetail({ project, initial }: Props) {
  const work = useWorkDetail({ projectId: project.id, taskId: initial.taskId }, initial.work);
  const { snapshot, failure } = work;
  const returnPath = projectWorkTaskPath(project.id, initial.taskId);
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[768px] space-y-6 px-4 py-8 sm:px-0 sm:py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={projectWorkPath(project.id)}><BranchIcon />Voltar para Trabalho atribuído</Link>
        </Button>
        {failure && <WorkAccessNotice projectId={project.id} failure={failure} returnPath={returnPath} onRetry={() => void work.refresh()} />}
        {snapshot && <WorkHeader snapshot={snapshot} projectId={project.id} />}
        {snapshot?.view.sourceChanged && <SourceChangedNotice />}
        {snapshot && !workStarted(snapshot) && <NotStartedNote />}
        <WorkAccountsScope taskId={initial.taskId} operate={canOperate(snapshot)}>
          <WorkAccountsSection />
          {snapshot && <OperatorStages project={project} snapshot={snapshot} refresh={work.refresh} onFailure={work.report} />}
        </WorkAccountsScope>
      </div>
    </main>
  );
}
