"use client";

import type { Project } from "@/lib/projects/contract";
import type { TaskWorkspace } from "../hooks/useTaskWorkspace";
import { AuthorStage } from "./AuthorStage";
import { ReaderStage } from "./ReaderStage";
import { AuthoringRestricted } from "./AuthoringRestricted";
import { StaleNotice } from "./StageNotices";
import { StageFailure, StageLoading } from "./WorkspaceNotices";
import type { StageControls } from "./stageControls";
import { IssueDeletionAction } from "@/features/issues/issue-deletion";
import { projectIssuesPath } from "@/lib/navigation/projectRoutes";
import { TASK_UNAVAILABLE_REASON } from "@/lib/tasks/taskFailure";
import { TaskUnavailable } from "./WorkspaceNotices";

type Props = { project: Project; taskId: string | null; workspace: TaskWorkspace; lock: string | null; grid: boolean; canAuthor: boolean; controls: StageControls; onDeleted: () => void };

export function TaskStage({ project, taskId, workspace, lock, grid, canAuthor, controls, onDeleted }: Props) {
  const { snapshot } = workspace;
  if (taskId && workspace.failure?.reason === TASK_UNAVAILABLE_REASON) return <TaskUnavailable projectId={project.id} />;
  if (workspace.phase === "loading") return <StageLoading />;
  if (workspace.phase === "failed" && workspace.failure) return <StageFailure failure={workspace.failure} onRetry={() => void controls.refresh()} />;
  if (!snapshot && !canAuthor) return <AuthoringRestricted projectId={project.id} />;
  const stale = snapshot && workspace.failure && !lock ? <StaleNotice onRefresh={() => void controls.refresh()} /> : null;
  if (snapshot && !snapshot.detail.permissions.canEdit) return <>{stale}{!lock && <DeletionAction projectId={project.id} taskId={snapshot.detail.task.id} onDeleted={onDeleted} />}<ReaderStage project={project} snapshot={snapshot} grid={grid} canAuthor={canAuthor} controls={controls} /></>;
  return <>{stale}{snapshot && !lock && <DeletionAction projectId={project.id} taskId={snapshot.detail.task.id} onDeleted={onDeleted} />}<AuthorStage key={workspace.scope} project={project} snapshot={snapshot} lock={lock} grid={grid} controls={controls} /></>;
}

function DeletionAction({ projectId, taskId, onDeleted }: { projectId: string; taskId: string; onDeleted: () => void }) {
  return <div className="flex justify-end border-b border-line px-4 py-1"><IssueDeletionAction target={{ kind: "task", projectId, taskId }} returnTo={projectIssuesPath(projectId)} onComplete={onDeleted} /></div>;
}
