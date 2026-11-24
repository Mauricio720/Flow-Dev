import { useEffect } from "react";
import type { TaskDetail } from "../contract";
import { EXECUTION_STAGE_LABEL } from "../executionCopy";
import { latestSession } from "../executionModel";
import { TERMINAL_SESSION_LABEL } from "../sessionCopy";
import type { ConversationFocus } from "../stageTabs";
import { ArtifactSection } from "./ArtifactSection";
import { ExecutionEventList } from "./ExecutionEventList";
import { ExecutionHistory } from "./ExecutionHistory";
import { ExecutionStatus } from "./ExecutionStatus";
import { SessionAttachmentList } from "./SessionAttachmentList";
import { SessionConversation } from "./SessionConversation";

type Props = { detail: TaskDetail; reader: boolean; conversation?: ConversationFocus | null; onConversationShown?: () => void };

export function ExecutionStage({ detail, reader, conversation = null, onConversationShown }: Props) {
  useEffect(() => {
    if (conversation) onConversationShown?.();
  }, [conversation, onConversationShown]);
  const session = latestSession(detail);
  if (!session) return null;
  const scope = { projectId: detail.task.projectId, taskId: detail.task.id };
  return (
    <section aria-label={EXECUTION_STAGE_LABEL} className="space-y-4">
      {session.runtime === "flow_dev" ? (
        <SessionConversation scope={{ ...scope, sessionId: session.id }} session={session} reader={reader} />
      ) : (
        <>
          <p className="text-xs text-ink-3">{TERMINAL_SESSION_LABEL}</p>
          <ExecutionStatus session={session} reader={reader} />
          <ExecutionEventList session={session} reader={reader} />
        </>
      )}
      <SessionAttachmentList attachments={session.attachments} />
      <ArtifactSection scope={scope} artifacts={detail.execution.artifacts} />
      <ExecutionHistory scope={scope} sessions={detail.execution.sessions.slice(1)} reader={reader} focus={conversation} />
    </section>
  );
}
