"use client";

import type { Project } from "@/lib/projects/contract";
import type { TaskWorkspace } from "../hooks/useTaskWorkspace";
import { AuthorStage } from "./AuthorStage";
import { ReaderStage } from "./ReaderStage";
import { AuthoringRestricted } from "./AuthoringRestricted";
import { StaleNotice } from "./StageNotices";
import { StageFailure, StageLoading } from "./WorkspaceNotices";
import type { StageControls } from "./stageControls";

type Props = { project: Project; workspace: TaskWorkspace; lock: string | null; grid: boolean; canAuthor: boolean; controls: StageControls };

export function TaskStage({ project, workspace, lock, grid, canAuthor, controls }: Props) {
  const { snapshot } = workspace;
  if (workspace.phase === "loading") return <StageLoading />;
  if (workspace.phase === "failed" && workspace.failure) return <StageFailure failure={workspace.failure} onRetry={() => void controls.refresh()} />;
  if (!snapshot && !canAuthor) return <AuthoringRestricted projectId={project.id} />;
  const stale = snapshot && workspace.failure && !lock ? <StaleNotice onRefresh={() => void controls.refresh()} /> : null;
  if (snapshot && !snapshot.detail.permissions.canEdit) return <>{stale}<ReaderStage project={project} snapshot={snapshot} grid={grid} canAuthor={canAuthor} controls={controls} /></>;
  return <>{stale}<AuthorStage key={workspace.scope} project={project} snapshot={snapshot} lock={lock} grid={grid} controls={controls} /></>;
}
