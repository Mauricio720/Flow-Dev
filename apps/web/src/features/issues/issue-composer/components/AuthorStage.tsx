"use client";

import { repositoryLabel } from "@/components/projects/RepositoryIdentity";
import { projectWorkPath } from "@/lib/navigation/projectRoutes";
import type { Project } from "@/lib/projects/contract";
import { composerGuard, composerPlaceholder } from "../composerModel";
import type { TaskSnapshot } from "../contract";
import { draftSources } from "../draftSources";
import type { ActionContext } from "../hooks/actionContext";
import { useDictation } from "../hooks/useDictation";
import { useTaskActions, type TaskActions } from "../hooks/useTaskActions";
import { failedOperationId, threadEntries } from "../threadModel";
import { Composer } from "./Composer";
import { DraftOutcome, hasOutcome } from "./DraftOutcome";
import { DraftReview } from "./DraftReview";
import { DraftStage } from "./DraftStage";
import { EmptyIntent } from "./EmptyIntent";
import { StageFrame } from "./StageFrame";
import { CompletedNotice, ConversationNotice } from "./StageNotices";
import { TaskProgress } from "./TaskProgress";
import { Thread } from "./Thread";
import type { StageControls } from "./stageControls";

const AUTHOR_LABEL = "Você";

type Props = { project: Project; snapshot: TaskSnapshot | null; lock: string | null; grid: boolean; controls: StageControls };
type ThreadProps = { project: Project; snapshot: TaskSnapshot; actions: TaskActions; context: ActionContext; capturing: boolean; locked: boolean; controls: StageControls };

function AuthorThread({ project, snapshot, actions, context, capturing, locked, controls }: ThreadProps) {
  const { detail, messages } = snapshot;
  const revision = detail.currentRevision;
  const failed = failedOperationId(messages);
  const repository = repositoryLabel(project);
  return (
    <Thread title={detail.task.title} entries={threadEntries(messages, detail.activity)} authorLabel={AUTHOR_LABEL} hasMore={snapshot.moreMessages !== null} onLoadMore={() => void controls.loadMoreMessages()}>
      {snapshot.conversationFailure && <ConversationNotice onRefresh={() => void controls.refresh()} />}
      <TaskProgress detail={detail} busy={actions.busy} onRetry={failed && !locked ? () => void actions.retryGeneration(failed) : null} />
      {revision && (
        <DraftStage sources={draftSources(revision)} publication={detail.publication}>
          {hasOutcome(detail) ? <DraftOutcome detail={detail} revision={revision} repository={repository} workHref={projectWorkPath(project.id)} onCheck={() => void controls.refresh()} /> : <DraftReview detail={detail} revision={revision} actions={actions} context={context} repository={repository} repositoryId={project.repository?.githubId ?? null} capturing={capturing} locked={locked} />}
        </DraftStage>
      )}
    </Thread>
  );
}

export function AuthorStage({ project, snapshot, lock, grid, controls }: Props) {
  const detail = snapshot?.detail ?? null;
  const task = detail?.task ?? null;
  const guard = composerGuard(detail, lock);
  const input = useDictation({ projectId: project.id, taskId: task?.id ?? null, expectedVersion: task?.version ?? null }, guard === null);
  const context: ActionContext = { projectId: project.id, task, input, onAccepted: controls.onAccepted, onChanged: controls.refresh, onFailure: controls.onFailure };
  const actions = useTaskActions(context);
  const published = task?.status === "published";
  const thread = snapshot ? <AuthorThread project={project} snapshot={snapshot} actions={actions} context={context} capturing={input.capturing} locked={lock !== null} controls={controls} /> : <EmptyIntent />;
  const footer = published ? <CompletedNotice onNewIntent={controls.onNewIntent} /> : <Composer input={input} guard={guard} placeholder={composerPlaceholder(detail)} submission={actions.submission} first={!snapshot} onSend={(text) => void actions.send(text)} onCheckSubmission={() => void actions.checkSubmission()} />;
  return <StageFrame grid={grid} merged={published} growth={`${snapshot?.messages.length ?? 0}:${task?.status ?? ""}`} trunk={snapshot !== null} thread={thread} footer={footer} />;
}
