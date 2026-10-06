import type { TaskMessage, TaskMessagePage } from "./contract";

export const MESSAGE_PAGE_SIZE = 100;
const MAX_MESSAGE_PAGES = 20;

type PageReader = (cursor: string | undefined) => Promise<TaskMessagePage>;

export async function collectMessages(readPage: PageReader, from?: string) {
  const messages: TaskMessage[] = [];
  let cursor = from;
  for (let page = 0; page < MAX_MESSAGE_PAGES; page++) {
    const result = await readPage(cursor);
    messages.push(...result.items);
    if (!result.nextCursor) return { messages, moreMessages: null };
    cursor = result.nextCursor;
  }
  return { messages, moreMessages: cursor ?? null };
}
