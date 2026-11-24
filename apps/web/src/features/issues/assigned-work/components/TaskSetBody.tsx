import type { TaskDetail } from "../contract";
import type { ArtifactViewerState } from "../hooks/useArtifactViewer";
import type { SpecItem, TaskSetData } from "../taskSetContract";
import { isSetReadable } from "../taskSetModel";
import type { TerminalScope } from "../terminalContract";
import { ArtifactList } from "./ArtifactList";
import { ArtifactViewer } from "./ArtifactViewer";
import { ExecutionPlanEditor } from "./ExecutionPlanEditor";
import { GenerateTasksAction } from "./GenerateTasksAction";
import { TaskList } from "./TaskList";
import { TaskSetHeader } from "./TaskSetHeader";
import { TaskSetNotices } from "./TaskSetNotices";

type Props = { scope: TerminalScope; set: TaskSetData; specs: SpecItem[]; detail: TaskDetail; viewer: ArtifactViewerState; reader: boolean; onOpened?: () => Promise<void> | void; onConversation?: (sessionId: string) => void };

function folderArtifacts(detail: TaskDetail, folder: string) {
  const prefix = folder === "" ? "" : `${folder}/`;
  return detail.execution.artifacts.filter((artifact) => artifact.path.startsWith(prefix));
}

export function TaskSetBody({ scope, set, specs, detail, viewer, reader, onOpened, onConversation }: Props) {
  const open = (artifactId: string) => void viewer.open(artifactId);
  const regenerate = reader ? null : <GenerateTasksAction detail={detail} specs={specs} onOpened={() => onOpened?.()} regenerate={{ folder: set.folder }} />;
  if (!isSetReadable(set)) return <><TaskSetNotices set={set} />{regenerate}<ArtifactList artifacts={folderArtifacts(detail, set.folder)} openId={viewer.artifactId} onOpen={open} /><ArtifactViewer viewer={viewer} /></>;
  return (
    <>
      <TaskSetNotices set={set} />
      <div className="space-y-3">
        <TaskSetHeader set={set} onOverview={() => open(set.manifestArtifactId)} regenerate={regenerate} />
        <TaskList tasks={set.tasks} openId={viewer.artifactId} onOpen={open} />
        <ArtifactViewer viewer={viewer} />
      </div>
      <ExecutionPlanEditor scope={scope} detail={detail} set={set} reader={reader} onOpened={onOpened} onConversation={onConversation} />
    </>
  );
}
