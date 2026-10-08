import { and, eq, inArray, lt } from "drizzle-orm";
import type { AuthOperationRecord, NewOperation, OperationPatch, OperationStore } from "../../../../application/database/dao/softwareDao";
import { SoftwareError } from "../../../../application/services/software/softwareErrors";
import type { Database } from "../../client";
import { softwareAuthOperations } from "../../schema";

type Row = typeof softwareAuthOperations.$inferSelect;

const UNIQUE_VIOLATION = "23505";
const ACTIVE_INDEX = "software_auth_operations_active_unique";
const ACTIVE_STATES = ["pending", "awaiting_confirmation"];

function toRecord(row: Row): AuthOperationRecord {
  const { nonceDigest: _nonceDigest, createdAt: _createdAt, updatedAt: _updatedAt, ...record } = row;
  return record as AuthOperationRecord;
}

function violation(error: unknown) {
  return (error as { cause?: { code?: string; constraint_name?: string } }).cause;
}

export class SoftwareOperationStore implements OperationStore {
  constructor(private readonly database: Database) {}

  async insert(input: NewOperation) {
    try {
      const [row] = await this.database.insert(softwareAuthOperations).values(input).returning();
      return toRecord(row!);
    } catch (error) {
      const cause = violation(error);
      if (cause?.code === UNIQUE_VIOLATION && cause.constraint_name === ACTIVE_INDEX) throw new SoftwareError("login_in_progress");
      if (cause?.code === UNIQUE_VIOLATION) throw new SoftwareError("idempotency_key_reused");
      throw error;
    }
  }

  async find(id: string) {
    const [row] = await this.database.select().from(softwareAuthOperations).where(eq(softwareAuthOperations.id, id)).for("update");
    return row ? toRecord(row) : null;
  }

  async findByKey(idempotencyKey: string) {
    const [row] = await this.database.select().from(softwareAuthOperations).where(eq(softwareAuthOperations.idempotencyKey, idempotencyKey));
    return row ? toRecord(row) : null;
  }

  async update(id: string, patch: OperationPatch) {
    const [row] = await this.database.update(softwareAuthOperations).set({ ...patch, updatedAt: new Date() }).where(eq(softwareAuthOperations.id, id)).returning();
    return toRecord(row!);
  }

  async listActive(connectionId: string) {
    const rows = await this.database.select().from(softwareAuthOperations).where(and(eq(softwareAuthOperations.connectionId, connectionId), inArray(softwareAuthOperations.state, ACTIVE_STATES)));
    return rows.map(toRecord);
  }

  async expireDue(connectionId: string, now: Date) {
    const due = and(eq(softwareAuthOperations.connectionId, connectionId), inArray(softwareAuthOperations.state, ACTIVE_STATES), lt(softwareAuthOperations.expiresAt, now));
    await this.database.update(softwareAuthOperations).set({ state: "expired", failureCode: "login_expired", updatedAt: now }).where(due);
  }
}
