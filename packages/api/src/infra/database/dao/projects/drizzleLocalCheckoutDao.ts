import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../client";
import { projectLocalCheckouts } from "../../schema";
import type { LocalCheckoutDao, SaveLocalCheckoutInput, StoredLocalCheckout } from "../../../../application/database/dao/localCheckoutDao";

const FIRST_VERSION = 1;
const NO_EXISTING_CHECKOUT_VERSION = 0;

function toStored(row: typeof projectLocalCheckouts.$inferSelect): StoredLocalCheckout {
  return { userId: row.userId, projectId: row.projectId, path: row.path, verifiedAt: row.verifiedAt, version: row.version };
}

export class DrizzleLocalCheckoutDao implements LocalCheckoutDao {
  constructor(private readonly database: Database) {}

  async find(userId: string, projectId: string) {
    const [row] = await this.database.select().from(projectLocalCheckouts).where(this.owner(userId, projectId)).limit(1);
    return row ? toStored(row) : null;
  }

  async save(input: SaveLocalCheckoutInput) {
    if (input.expectedVersion === undefined) return this.upsert(input);
    if (input.expectedVersion === NO_EXISTING_CHECKOUT_VERSION) return this.insertFirst(input);
    return this.updateVersioned(input, input.expectedVersion);
  }

  async remove(userId: string, projectId: string) {
    await this.database.delete(projectLocalCheckouts).where(this.owner(userId, projectId));
  }

  private owner(userId: string, projectId: string) {
    return and(eq(projectLocalCheckouts.userId, userId), eq(projectLocalCheckouts.projectId, projectId));
  }

  private async insertFirst(input: SaveLocalCheckoutInput) {
    const values = { userId: input.userId, projectId: input.projectId, path: input.path, verifiedAt: input.verifiedAt, version: FIRST_VERSION };
    const [row] = await this.database.insert(projectLocalCheckouts).values(values).onConflictDoNothing().returning();
    return row ? toStored(row) : null;
  }

  private async upsert(input: SaveLocalCheckoutInput) {
    const values = { userId: input.userId, projectId: input.projectId, path: input.path, verifiedAt: input.verifiedAt, version: FIRST_VERSION };
    const changes = { path: input.path, verifiedAt: input.verifiedAt, version: sql`${projectLocalCheckouts.version} + 1`, updatedAt: new Date() };
    const [row] = await this.database.insert(projectLocalCheckouts).values(values).onConflictDoUpdate({ target: [projectLocalCheckouts.userId, projectLocalCheckouts.projectId], set: changes }).returning();
    return toStored(row!);
  }

  private async updateVersioned(input: SaveLocalCheckoutInput, expectedVersion: number) {
    const filter = and(this.owner(input.userId, input.projectId), eq(projectLocalCheckouts.version, expectedVersion));
    const changes = { path: input.path, verifiedAt: input.verifiedAt, version: expectedVersion + 1, updatedAt: new Date() };
    const [row] = await this.database.update(projectLocalCheckouts).set(changes).where(filter).returning();
    return row ? toStored(row) : null;
  }
}
