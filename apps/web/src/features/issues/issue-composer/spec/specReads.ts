import { trpc } from "@/lib/trpc/client";
import type { SpecEventRecord, SpecSnapshot } from "./specContract";

export type SpecTarget = { projectId: string; taskId: string };
const EVENT_PAGE = 100;

export function readSpecSnapshot(target: SpecTarget): Promise<SpecSnapshot> {
  return trpc.taskSpec.byTask.query(target);
}

export async function readLatestEvents(target: SpecTarget) {
  const page = await trpc.taskSpec.events.query({ ...target, latest: true, limit: EVENT_PAGE });
  return { items: page.items, older: page.hasMore ? page.nextCursor : null };
}

export async function drainEventsAfter(target: SpecTarget, cursor: string) {
  const items: SpecEventRecord[] = [];
  let after = cursor;
  for (;;) {
    const page = await trpc.taskSpec.events.query({ ...target, after, limit: EVENT_PAGE });
    items.push(...page.items);
    after = page.nextCursor ?? after;
    if (!page.hasMore) return { items, after };
  }
}

export async function readOlderEvents(target: SpecTarget, cursor: string) {
  const page = await trpc.taskSpec.events.query({ ...target, before: cursor, limit: EVENT_PAGE });
  return { items: page.items, older: page.hasMore ? page.nextCursor : null };
}
