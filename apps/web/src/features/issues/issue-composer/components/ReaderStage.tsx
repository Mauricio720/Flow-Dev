import { repositoryLabel } from "@/components/projects/RepositoryIdentity";
import { projectWorkPath } from "@/lib/navigation/projectRoutes";
import type { Project } from "@/lib/projects/contract";
import type { TaskSnapshot } from "../contract";
import { draftSources } from "../draftSources";
import { threadEntries } from "../threadModel";
import { DraftOutcome } from "./DraftOutcome";
import { DraftStage } from "./DraftStage";
import { StageFrame } from "./StageFrame";
import { ConversationNotice, ReadOnlyNotice } from "./StageNotices";
import { TaskProgress } from "./TaskProgress";
import { Thread } from "./Thread";
import type { StageControls } from "./stageControls";

const UNKNOWN_AUTHOR = "outra pessoa do projeto";
const READER_DRAFT_NOTE = "Somente leitura. Apenas a pessoa autora pode editar, refinar ou publicar este draft.";

type Props = { project: Project; snapshot: TaskSnapshot; grid: boolean; canAuthor: boolean; controls: StageControls };

export function ReaderStage({ project, snapshot, grid, canAuthor, controls }: Props) {
  const { detail, messages } = snapshot;
  const revision = detail.currentRevision;
  const author = detail.task.authorName ?? UNKNOWN_AUTHOR;
  const thread = (
    <Thread title={detail.task.title} entries={threadEntries(messages, detail.activity)} authorLabel={author} hasMore={snapshot.moreMessages !== null} onLoadMore={() => void controls.loadMoreMessages()}>
      {snapshot.conversationFailure && <ConversationNotice onRefresh={() => void controls.refresh()} />}
      <TaskProgress detail={detail} busy={false} onRetry={null} />
      {revision && (
        <DraftStage sources={draftSources(revision)} publication={detail.publication}>
          <DraftOutcome detail={detail} revision={revision} repository={repositoryLabel(project)} workHref={projectWorkPath(project.id)} onCheck={() => void controls.refresh()}>
            {!detail.publication && <p className="border-t border-line bg-surface px-5 py-3.5 text-sm text-ink-3">{READER_DRAFT_NOTE}</p>}
          </DraftOutcome>
        </DraftStage>
      )}
    </Thread>
  );
  const footer = <ReadOnlyNotice author={author} status={detail.task.status} onNewIntent={canAuthor ? controls.onNewIntent : null} workHref={projectWorkPath(project.id)} />;
  return <StageFrame grid={grid} merged={detail.publication !== null} growth={`${messages.length}:${detail.task.status}`} trunk thread={thread} footer={footer} />;
}
