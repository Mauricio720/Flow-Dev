import type { ThreadItem } from "./ThreadItem";
export type ItemStartedNotification = { item: ThreadItem, threadId: string, turnId: string,
startedAtMs: number, };
