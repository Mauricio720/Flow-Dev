import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { InsertAssistantMessageInput, InsertSystemMessageInput, InsertUserMessageInput, InsertedUserMessage, SessionMessageDao, SessionMessageRecord } from "../../../../application/terminal/sessionInteractionPorts";
import type { MessageRole } from "../../../../application/terminal/sessionInteraction";
import type { Database } from "../../client";
import { taskTerminalMessages } from "../../schema";

const USER_ROLE = "user";
const ASSISTANT_ROLE = "assistant";
const SYSTEM_ROLE = "system";

function toRecord(row: typeof taskTerminalMessages.$inferSelect): SessionMessageRecord {
  return { ...row, role: row.role as MessageRole };
}

export class DrizzleSessionMessageDao implements SessionMessageDao {
  constructor(private readonly database: Database) {}

  async insertUserMessage(input: InsertUserMessageInput): Promise<InsertedUserMessage> {
    const values = { sessionId: input.sessionId, role: USER_ROLE, content: input.content, requestKey: input.requestKey };
    const [inserted] = await this.database.insert(taskTerminalMessages).values(values).onConflictDoNothing().returning();
    if (inserted) return { message: toRecord(inserted), created: true };
    const filter = and(eq(taskTerminalMessages.sessionId, input.sessionId), eq(taskTerminalMessages.requestKey, input.requestKey));
    const [existing] = await this.database.select().from(taskTerminalMessages).where(filter).limit(1);
    if (!existing) throw new Error("Session message disappeared after a conflict");
    return { message: toRecord(existing), created: false };
  }

  async insertAssistantMessage(input: InsertAssistantMessageInput) {
    const values = { sessionId: input.sessionId, role: ASSISTANT_ROLE, content: input.content, truncated: input.truncated, occurredAt: input.occurredAt };
    const [row] = await this.database.insert(taskTerminalMessages).values(values).returning();
    return toRecord(row!);
  }

  async insertSystemMessage(input: InsertSystemMessageInput) {
    const values = { sessionId: input.sessionId, role: SYSTEM_ROLE, content: input.content, occurredAt: input.occurredAt };
    const [row] = await this.database.insert(taskTerminalMessages).values(values).returning();
    return toRecord(row!);
  }

  async listUndelivered(sessionId: string) {
    const filter = and(eq(taskTerminalMessages.sessionId, sessionId), eq(taskTerminalMessages.role, USER_ROLE), isNull(taskTerminalMessages.deliveredAt), eq(taskTerminalMessages.undelivered, false));
    const rows = await this.database.select().from(taskTerminalMessages).where(filter).orderBy(asc(taskTerminalMessages.occurredAt), asc(taskTerminalMessages.id));
    return rows.map(toRecord);
  }

  async markDelivered(messageIds: string[], at: Date) {
    if (messageIds.length === 0) return;
    await this.database.update(taskTerminalMessages).set({ deliveredAt: at }).where(inArray(taskTerminalMessages.id, messageIds));
  }

  async markUndelivered(messageIds: string[]) {
    if (messageIds.length === 0) return;
    await this.database.update(taskTerminalMessages).set({ undelivered: true }).where(inArray(taskTerminalMessages.id, messageIds));
  }
}
