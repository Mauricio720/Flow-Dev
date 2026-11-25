"use client";

import { useEffect, useRef } from "react";
import type { TaskDetail } from "../contract";
import type { ReviewStep } from "../reviewContract";
import { SessionConversation } from "./SessionConversation";

type Props = { detail: TaskDetail; step: ReviewStep; reader: boolean; onMissing: () => Promise<void> | void };

export function ReviewConversation({ detail, step, reader, onMissing }: Props) {
  const requested = useRef<string | null>(null);
  const session = detail.execution.sessions.find((candidate) => candidate.id === step.sessionId);
  useEffect(() => {
    if (!step.sessionId || session || requested.current === step.sessionId) return;
    requested.current = step.sessionId;
    void onMissing();
  }, [step.sessionId, session, onMissing]);
  if (!session) return null;
  const scope = { projectId: detail.task.projectId, taskId: detail.task.id, sessionId: session.id };
  return <SessionConversation scope={scope} session={session} reader={reader} />;
}
