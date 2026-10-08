import { desc, eq, lt } from "drizzle-orm";
import type { AuditEntry, AuditRecord, AuditStore, Paged } from "../../../../application/database/dao/softwareDao";
import { decodeCursor, encodeCursor } from "../../../../application/pagination/cursor";
import type { Database } from "../../client";
import { softwareAudit, users } from "../../schema";

type Row = typeof softwareAudit.$inferSelect;

function toRecord(row: Row, actorName: string | null = null): AuditRecord {
  const { sequence, id, actorId, event, diff, requestHash, createdAt } = row;
  return { sequence, id, actorId, actorName, event, diff, requestHash, createdAt };
}

export class SoftwareAuditStore implements AuditStore {
  constructor(private readonly database: Database) {}

  async append(entry: AuditEntry) {
    const [row] = await this.database.insert(softwareAudit).values(entry).returning();
    return toRecord(row!);
  }

  async findByKey(idempotencyKey: string) {
    const [row] = await this.database.select().from(softwareAudit).where(eq(softwareAudit.idempotencyKey, idempotencyKey));
    return row ? toRecord(row) : null;
  }

  async list(query: { cursor?: string; limit: number }): Promise<Paged<AuditRecord>> {
    const cursor = decodeCursor(query.cursor);
    const rows = await this.database.select({ audit: softwareAudit, actorName: users.name }).from(softwareAudit)
      .leftJoin(users, eq(users.id, softwareAudit.actorId))
      .where(cursor ? lt(softwareAudit.sequence, Number(cursor.key)) : undefined)
      .orderBy(desc(softwareAudit.sequence)).limit(query.limit + 1);
    const items = rows.slice(0, query.limit).map((row) => toRecord(row.audit, row.actorName));
    const last = items.at(-1);
    return { items, nextCursor: rows.length > query.limit && last ? encodeCursor({ key: String(last.sequence) }) : null };
  }
}
