import { trpc } from "@/lib/trpc/client";
import type { PermissionDecision, QuestionAnswers, SessionScope, TaskScope } from "./sessionContract";

export function fetchSessionTimeline(scope: SessionScope, after: string | undefined) {
  return trpc.tasks.session.timeline.query({ ...scope, after });
}

export function sendSessionMessage(scope: SessionScope, input: { content: string; requestKey: string }) {
  return trpc.tasks.session.send.mutate({ ...scope, ...input });
}

export function answerSessionQuestion(scope: TaskScope, input: { requestId: string; answers: QuestionAnswers }) {
  return trpc.tasks.session.answerQuestion.mutate({ projectId: scope.projectId, taskId: scope.taskId, ...input });
}

export function decideSessionPermission(scope: TaskScope, input: { requestId: string; decision: PermissionDecision; reason?: string }) {
  return trpc.tasks.session.decidePermission.mutate({ projectId: scope.projectId, taskId: scope.taskId, ...input });
}

export function interruptSession(scope: SessionScope) {
  return trpc.tasks.session.interrupt.mutate(scope);
}

export function endSession(scope: SessionScope) {
  return trpc.tasks.session.end.mutate(scope);
}
