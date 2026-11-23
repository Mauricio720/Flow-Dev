import type { SessionTimelineDao } from "../../database/dao/sessionTimelineDao";
import { CURSOR_LAG_MS, decodeCursor, encodeCursor } from "./sessionTimelineCursor";
import { mergeTimeline } from "./sessionTimelineMerge";
import { TIMELINE_ENTRY_LIMIT } from "./sessionInteractionLimits";

export type TimelineQuery = { sessionId: string; after?: string; now: Date };

export class SessionTimelineReader {
  constructor(private readonly dao: SessionTimelineDao) {}

  async read(query: TimelineQuery) {
    if (query.after === undefined) return this.firstPage(query);
    return this.changes(query, decodeCursor(query.after));
  }

  private async firstPage(query: TimelineQuery) {
    const window = await this.dao.latest(query.sessionId, TIMELINE_ENTRY_LIMIT);
    const merged = mergeTimeline(window);
    const shown = merged.slice(-TIMELINE_ENTRY_LIMIT);
    const lastChange = merged.reduce((latest, item) => (item.changedAt > latest ? item.changedAt : latest), new Date(0));
    return { entries: shown.map((item) => item.entry), hiddenEntries: Math.max(0, window.total - shown.length), cursor: encodeCursor(this.cursorAt(lastChange, query.now)) };
  }

  private async changes(query: TimelineQuery, since: Date) {
    const rows = await this.dao.changedSince(query.sessionId, since, TIMELINE_ENTRY_LIMIT);
    const merged = mergeTimeline(rows);
    const lastChange = merged.reduce((latest, item) => (item.changedAt > latest ? item.changedAt : latest), since);
    return { entries: merged.map((item) => item.entry), hiddenEntries: 0, cursor: encodeCursor(this.cursorAt(lastChange, query.now)) };
  }

  private cursorAt(lastChange: Date, now: Date) {
    return new Date(Math.min(lastChange.getTime(), now.getTime() - CURSOR_LAG_MS));
  }
}
