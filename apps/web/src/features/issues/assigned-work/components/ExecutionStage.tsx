import type { TaskDetail } from "../contract";
import { EXECUTION_STAGE_LABEL } from "../executionCopy";
import { latestSession } from "../executionModel";
import { ArtifactSection } from "./ArtifactSection";
import { ExecutionEventList } from "./ExecutionEventList";
import { ExecutionHistory } from "./ExecutionHistory";
import { SessionAttachmentList } from "./SessionAttachmentList";
import { ExecutionStatus } from "./ExecutionStatus";

type Props = { detail: TaskDetail; reader: boolean };

export function ExecutionStage({ detail, reader }: Props) {
  const session = latestSession(detail);
  if (!session) return null;
  return (
    <section aria-label={EXECUTION_STAGE_LABEL} className="space-y-4">
      <ExecutionStatus session={session} reader={reader} />
      <ExecutionEventList session={session} reader={reader} />
      <SessionAttachmentList attachments={session.attachments} />
      <ArtifactSection scope={{ projectId: detail.task.projectId, taskId: detail.task.id }} artifacts={detail.execution.artifacts} />
      <ExecutionHistory sessions={detail.execution.sessions.slice(1)} reader={reader} />
    </section>
  );
}
