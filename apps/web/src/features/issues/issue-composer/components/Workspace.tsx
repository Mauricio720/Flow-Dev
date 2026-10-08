"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { REVOKED_ACCESS_PATH, projectIssuesPath, projectTaskPath, taskIdFromPath } from "@/lib/navigation/projectRoutes";
import type { Project } from "@/lib/projects/contract";
import type { TaskFailure, TaskReceipt, WorkspaceLoad } from "../contract";
import { draftSources } from "../draftSources";
import { withCurrentTask } from "../historyState";
import { useGridPreference } from "../hooks/useGridPreference";
import { useStatusAnnouncement } from "../hooks/useStatusAnnouncement";
import { useTaskHistory } from "../hooks/useTaskHistory";
import { useTaskNavigation } from "../hooks/useTaskNavigation";
import { useTaskWorkspace } from "../hooks/useTaskWorkspace";
import { ACCESS_LOCK_COPY, accessProblem } from "@/lib/tasks/taskFailure";
import { RailDrawer } from "./RailDrawer";
import { SessionRail } from "./SessionRail";
import { SourcesDrawer } from "./SourcesDrawer";
import { SourcesPanel } from "./SourcesPanel";
import { TaskStage } from "./TaskStage";
import { TopBar } from "./TopBar";
import { AccessNotice } from "./WorkspaceNotices";

const NEW_INTENT_TITLE = "Nova intenção";

type Props = { project: Project; initial: WorkspaceLoad; canAuthor: boolean };

function useWorkspaceData({ project, initial }: Omit<Props, "canAuthor">) {
  const navigation = useTaskNavigation(project.id, initial.taskId);
  const history = useTaskHistory(project.id, initial.history);
  const [reported, setReported] = useState<TaskFailure | null>(null);
  const workspace = useTaskWorkspace({ projectId: project.id, taskId: navigation.taskId, initial, paused: reported !== null });
  const task = workspace.snapshot?.detail.task ?? null;
  const observe = useEffectEvent(() => task && history.observe(task));
  useEffect(() => {
    observe();
  }, [task]);
  const problem = accessProblem(reported) ?? accessProblem(workspace.failure) ?? accessProblem(history.failure);
  async function onAccepted(receipt: TaskReceipt) {
    const activeTaskId = taskIdFromPath(project.id, window.location.pathname) ?? navigation.taskId;
    if (receipt.taskId === activeTaskId) await workspace.refresh();
    else if (activeTaskId === null) navigation.select(receipt.taskId);
    void history.refresh();
  }
  const onFailure = (failure: TaskFailure) => accessProblem(failure) && setReported(failure);
  const controls = { onAccepted, onFailure, onNewIntent: () => navigation.select(null), refresh: workspace.refresh, loadMoreMessages: workspace.loadMoreMessages };
  return { navigation, history, workspace, problem, controls };
}

function useRevokedRedirect(revoked: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (revoked) router.replace(REVOKED_ACCESS_PATH);
  }, [revoked, router]);
}

export function Workspace({ project, initial, canAuthor }: Props) {
  const { navigation, history, workspace, problem, controls } = useWorkspaceData({ project, initial });
  const { grid, toggleGrid } = useGridPreference();
  const [railOpen, setRailOpen] = useState(false);
  const detail = workspace.snapshot?.detail ?? null;
  const announcement = useStatusAnnouncement(workspace.scope, detail?.task.status ?? null);
  useRevokedRedirect(problem === "revoked");
  function select(taskId: string | null) {
    navigation.select(taskId);
    setRailOpen(false);
  }
  const rail = <SessionRail history={history} items={withCurrentTask(history.items, detail?.task ?? null)} activeId={navigation.taskId} canAuthor={canAuthor} onSelect={select} />;
  const revision = detail?.currentRevision ?? null;
  const sources = <SourcesPanel activity={detail?.activity ?? []} sources={revision ? draftSources(revision) : []} hasDraft={revision !== null} planningBasis={detail?.publication ? detail.publication.issueNumber : null} />;
  const returnPath = navigation.taskId ? projectTaskPath(project.id, navigation.taskId) : projectIssuesPath(project.id);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title={detail?.task.title || NEW_INTENT_TITLE} grid={grid} onToggleGrid={toggleGrid} rail={<RailDrawer open={railOpen} onOpenChange={setRailOpen}>{rail}</RailDrawer>} sources={<SourcesDrawer>{sources}</SourcesDrawer>} />
      <p role="status" aria-label="Estado da tarefa" className="sr-only">{announcement}</p>
      <div className="grid min-h-0 flex-1 xl:grid-cols-[16rem_minmax(0,1fr)] 2xl:grid-cols-[16rem_minmax(0,1fr)_18rem]">
        <div className="hidden min-h-0 border-r border-line bg-surface xl:block">{rail}</div>
        <main className="relative flex min-h-0 flex-col">
          <AccessNotice problem={problem} returnPath={returnPath} />
          {problem !== "revoked" && <TaskStage project={project} workspace={workspace} lock={problem ? ACCESS_LOCK_COPY[problem] : null} grid={grid} canAuthor={canAuthor} controls={controls} />}
        </main>
        <div className="hidden min-h-0 border-l border-line bg-surface 2xl:block">{sources}</div>
      </div>
    </div>
  );
}
