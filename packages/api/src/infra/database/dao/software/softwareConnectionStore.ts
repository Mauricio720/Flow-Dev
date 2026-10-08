import { and, asc, eq, gt, ilike, or, sql, type SQL } from "drizzle-orm";
import type { ConnectionPatch, ConnectionQuery, ConnectionRecord, ConnectionStore, NewConnection, Paged } from "../../../../application/database/dao/softwareDao";
import { SoftwareError } from "../../../../application/services/software/softwareErrors";
import { decodeCursor, encodeCursor } from "../../../../application/pagination/cursor";
import type { Database } from "../../client";
import { softwareConnections } from "../../schema";

type Row = typeof softwareConnections.$inferSelect;

const LABEL_INDEX = "software_connections_label_folded_unique";
const UNIQUE_VIOLATION = "23505";
const CREATED_AT_MS = sql`date_trunc('milliseconds', ${softwareConnections.createdAt})`;
const ESCAPE_PATTERN = /[\\%_]/g;

function toRecord(row: Row): ConnectionRecord {
  return { ...row, executionTarget: row.executionTarget as ConnectionRecord["executionTarget"], providerKind: row.providerKind as ConnectionRecord["providerKind"], authState: row.authState as ConnectionRecord["authState"], modelCatalog: row.modelCatalog as ConnectionRecord["modelCatalog"] };
}

function isLabelCollision(error: unknown) {
  const cause = (error as { cause?: { code?: string; constraint_name?: string } }).cause ?? (error as { code?: string; constraint_name?: string });
  return cause?.code === UNIQUE_VIOLATION && cause.constraint_name === LABEL_INDEX;
}

export class SoftwareConnectionStore implements ConnectionStore {
  constructor(private readonly database: Database) {}

  async insert(input: NewConnection) {
    try {
      const [row] = await this.database.insert(softwareConnections).values({ ...input, createdBy: input.actorId, createdAt: new Date() }).returning();
      return toRecord(row!);
    } catch (error) {
      if (isLabelCollision(error)) throw new SoftwareError("label_taken", { label: "Já existe uma conexão com este nome" });
      throw error;
    }
  }

  async lock(id: string) {
    const [row] = await this.database.select().from(softwareConnections).where(eq(softwareConnections.id, id)).for("update");
    return row ? toRecord(row) : null;
  }

  async find(id: string) {
    const [row] = await this.database.select().from(softwareConnections).where(eq(softwareConnections.id, id));
    return row ? toRecord(row) : null;
  }

  async update(id: string, patch: ConnectionPatch) {
    const bumps = Object.keys(patch).some((key) => key !== "lastCheckedAt");
    try {
      const revision = bumps ? sql`${softwareConnections.revision} + 1` : softwareConnections.revision;
      const [row] = await this.database.update(softwareConnections).set({ ...patch, revision, updatedAt: new Date() }).where(eq(softwareConnections.id, id)).returning();
      return toRecord(row!);
    } catch (error) {
      if (isLabelCollision(error)) throw new SoftwareError("label_taken", { label: "Já existe uma conexão com este nome" });
      throw error;
    }
  }

  async list(query: ConnectionQuery): Promise<Paged<ConnectionRecord>> {
    const filters: SQL[] = [];
    const cursor = decodeCursor(query.cursor);
    if (cursor) filters.push(or(sql`${CREATED_AT_MS} > ${cursor.key}::timestamptz`, and(sql`${CREATED_AT_MS} = ${cursor.key}::timestamptz`, gt(softwareConnections.id, cursor.id ?? ""))) as SQL);
    if (query.search) filters.push(ilike(softwareConnections.label, `%${query.search.replace(ESCAPE_PATTERN, "\\$&")}%`));
    if (query.executionTarget === "host") filters.push(eq(softwareConnections.executionTarget, "host"));
    if (query.executionTarget === "machine") filters.push(eq(softwareConnections.executionTarget, "machine"));
    if (query.visibleToOwnerId) filters.push(or(eq(softwareConnections.executionTarget, "host"), and(eq(softwareConnections.executionTarget, "machine"), eq(softwareConnections.ownerUserId, query.visibleToOwnerId)))!);
    const rows = await this.database.select().from(softwareConnections).where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(CREATED_AT_MS), asc(softwareConnections.id)).limit(query.limit + 1);
    const items = rows.slice(0, query.limit).map(toRecord);
    const last = items.at(-1);
    return { items, nextCursor: rows.length > query.limit && last ? encodeCursor({ key: last.createdAt.toISOString(), id: last.id }) : null };
  }
}
