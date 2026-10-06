import { trpc } from "@/lib/trpc/client";
import type { TaskDetail, TaskSnapshot } from "../contract";
import { taskFailure } from "../taskFailure";
import { MESSAGE_PAGE_SIZE, collectMessages } from "../taskMessages";

export type TaskTarget = { projectId: string; taskId: string };

function conversationChanged(known: TaskSnapshot, detail: TaskDetail) {
  const before = known.detail;
  if (before.task.status !== detail.task.status || before.currentRevision?.id !== detail.currentRevision?.id) return true;
  if (before.pendingProposal?.operationId !== detail.pendingProposal?.operationId) return true;
  return detail.task.status !== "published" && before.task.version !== detail.task.version;
}

async function readConversation(target: TaskTarget, detail: TaskDetail, known: TaskSnapshot | null): Promise<TaskSnapshot> {
  try {
    const messages = await collectMessages((cursor) => trpc.tasks.messages.query({ ...target, cursor, limit: MESSAGE_PAGE_SIZE }));
    return { detail, ...messages, conversationFailure: null };
  } catch (error) {
    return { detail, messages: known?.messages ?? [], moreMessages: known?.moreMessages ?? null, conversationFailure: taskFailure(error) };
  }
}

export async function readSnapshot(target: TaskTarget, known: TaskSnapshot | null): Promise<TaskSnapshot> {
  const detail = await trpc.tasks.byId.query(target);
  const reusable = known && !known.conversationFailure && !conversationChanged(known, detail);
  if (reusable) return { ...known, detail };
  return readConversation(target, detail, known);
}

export async function readMoreMessages(target: TaskTarget, snapshot: TaskSnapshot): Promise<TaskSnapshot> {
  if (!snapshot.moreMessages) return snapshot;
  const next = await collectMessages((cursor) => trpc.tasks.messages.query({ ...target, cursor, limit: MESSAGE_PAGE_SIZE }), snapshot.moreMessages);
  return { ...snapshot, messages: [...snapshot.messages, ...next.messages], moreMessages: next.moreMessages };
}
