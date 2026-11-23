import type { SessionTimelineDao, TimelineRows, TimelineWindow } from "../../../../application/database/dao/sessionTimelineDao";
import type { Database } from "../../client";
import { changedEvents, changedMessages, changedRequests, countEntries, latestEvents, latestMessages, latestRequests } from "./sessionTimelineQueries";

export class DrizzleSessionTimelineDao implements SessionTimelineDao {
  constructor(private readonly database: Database) {}

  async latest(sessionId: string, limit: number): Promise<TimelineWindow> {
    const [messages, requests, events, total] = await Promise.all([latestMessages(this.database, sessionId, limit), latestRequests(this.database, sessionId, limit), latestEvents(this.database, sessionId, limit), countEntries(this.database, sessionId)]);
    return { messages, requests, events, total };
  }

  async changedSince(sessionId: string, since: Date, limit: number): Promise<TimelineRows> {
    const window = { sessionId, since, limit };
    const [messages, requests, events] = await Promise.all([changedMessages(this.database, window), changedRequests(this.database, window), changedEvents(this.database, window)]);
    return { messages, requests, events };
  }
}
