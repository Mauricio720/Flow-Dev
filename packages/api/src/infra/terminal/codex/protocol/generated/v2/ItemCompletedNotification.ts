import type { ThreadItem } from "./ThreadItem";
export type ItemCompletedNotification = { item: ThreadItem, threadId: string, turnId: string,
completedAtMs: number, };
