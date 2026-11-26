import type { SessionTimelineDao, TimelineRows, TimelineWindow } from "../../../../application/database/dao/sessionTimelineDao";
import type { Database } from "../../client";
import { changedEvents, changedMessages, changedRequests, changedRouteSwitches, countEntries, latestEvents, latestMessages, latestRequests, latestRouteSwitches, timelineSessionStatus } from "./sessionTimelineQueries";

export class DrizzleSessionTimelineDao implements SessionTimelineDao {
  constructor(private readonly database: Database) {}

  async latest(sessionId: string, limit: number): Promise<TimelineWindow> {
    const [messages, requests, events, routeSwitches, sessionStatus, total] = await Promise.all([latestMessages(this.database, sessionId, limit), latestRequests(this.database, sessionId, limit), latestEvents(this.database, sessionId, limit), latestRouteSwitches(this.database, sessionId), timelineSessionStatus(this.database, sessionId), countEntries(this.database, sessionId)]);
    return { messages, requests, events, routeSwitches, sessionStatus, total };
  }

  async changedSince(sessionId: string, since: Date, limit: number): Promise<TimelineRows> {
    const window = { sessionId, since, limit };
    const [messages, requests, events, routeSwitches, sessionStatus] = await Promise.all([changedMessages(this.database, window), changedRequests(this.database, window), changedEvents(this.database, window), changedRouteSwitches(this.database, window), timelineSessionStatus(this.database, sessionId)]);
    return { messages, requests, events, routeSwitches, sessionStatus };
  }
}
