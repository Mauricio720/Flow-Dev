import { vi, type Mock } from "vitest";
import type { TaskDetail, TaskMessage } from "@/features/issues/issue-composer/contract";
import { trpc } from "@/lib/trpc/client";

type PublicationMocks = { preview: { query: Mock }; publish: { mutate: Mock } };

export const taskApi = vi.mocked(trpc.tasks, true);
export const publicationApi = trpc.tasks as unknown as PublicationMocks;

export function serveTask(detail: TaskDetail, messages: TaskMessage[] = []) {
  taskApi.byId.query.mockResolvedValue(detail);
  taskApi.messages.query.mockResolvedValue({ items: messages, nextCursor: null });
  taskApi.list.query.mockResolvedValue({ items: [detail.task], nextCursor: null });
}

export function previewOf(revisionId: string, bodyMarkdown: string) {
  return { title: "Corrigir total", bodyMarkdown, repository: { id: "202", owner: "acme", name: "cart" }, publisher: { githubId: "501", login: "ana" }, revisionId, version: 7, previewHash: "h7" };
}
