import type { SessionTimeline, TimelineEntry } from "./sessionContract";

export const MAX_VISIBLE_ENTRIES = 200;
export const SESSION_POLL_MS = 1_500;
export const FINAL_STATUSES: readonly string[] = ["ended", "launch_failed"];

export type TimelineView = {
  entries: TimelineEntry[];
  status: SessionTimeline["status"] | null;
  canControl: boolean;
  hiddenEntries: number;
  pendingIds: string[];
};

export const EMPTY_TIMELINE: TimelineView = { entries: [], status: null, canControl: false, hiddenEntries: 0, pendingIds: [] };

export const isFinalStatus = (status: string | null) => status !== null && FINAL_STATUSES.includes(status);

function byTimeThenId(left: TimelineEntry, right: TimelineEntry) {
  return left.at.localeCompare(right.at) || left.id.localeCompare(right.id);
}

export function replaceTimeline(page: SessionTimeline): TimelineView {
  const entries = [...page.entries].sort(byTimeThenId);
  return { entries, status: page.status, canControl: page.canControl, hiddenEntries: page.hiddenEntries, pendingIds: page.pending.requestIds };
}

export function mergeTimeline(current: TimelineView, page: SessionTimeline): TimelineView {
  const known = new Map(current.entries.map((entry) => [entry.id, entry]));
  for (const entry of page.entries) known.set(entry.id, entry);
  const merged = [...known.values()].sort(byTimeThenId);
  const dropped = Math.max(0, merged.length - MAX_VISIBLE_ENTRIES);
  return { entries: merged.slice(dropped), status: page.status, canControl: page.canControl, hiddenEntries: current.hiddenEntries + dropped, pendingIds: page.pending.requestIds };
}

export type PollStep = { cursor: string | undefined; delay: number | null };

export function nextPoll(input: { final: boolean; full: boolean; cursor: string }): PollStep {
  if (!input.final) return { cursor: input.cursor, delay: SESSION_POLL_MS };
  return { cursor: undefined, delay: input.full ? null : 0 };
}
