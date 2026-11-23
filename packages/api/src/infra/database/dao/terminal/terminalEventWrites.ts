import { eq } from "drizzle-orm";
import type { NewTerminalEvent, SessionChanges, TerminalEventWriter } from "../../../../application/database/dao/terminalEventDao";
import type { Database } from "../../client";
import { taskTerminalEvents, taskTerminalSessions } from "../../schema";

const EVENT_STEP_MS = 1;

export class DrizzleTerminalEventWriter implements TerminalEventWriter {
  constructor(private readonly database: Database) {}

  async insertEvents(sessionId: string, events: NewTerminalEvent[], occurredAt: Date) {
    if (events.length === 0) return;
    await this.database.insert(taskTerminalEvents).values(events.map((event, index) => ({ ...event, sessionId, occurredAt: new Date(occurredAt.getTime() + index * EVENT_STEP_MS) })));
  }

  async updateSession(sessionId: string, changes: SessionChanges) {
    await this.database.update(taskTerminalSessions).set(changes).where(eq(taskTerminalSessions.id, sessionId));
  }
}
