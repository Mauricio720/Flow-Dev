import { and, desc, eq, gt, inArray } from "drizzle-orm";
import type { LinkRequestRecord, LinkRequestState, LocalLinkRequestDao } from "../../../../application/database/dao/localLinkRequestDao";
import type { Database } from "../../client";
import { localLinkRequests } from "../../schema";

const OPEN_STATES: LinkRequestState[] = ["pending", "claimed"];
const SUPERSEDED_REASON = "request_superseded";

export class DrizzleLocalLinkRequestDao implements LocalLinkRequestDao {
  constructor(private readonly database: Database) {}

  async open(input: Parameters<LocalLinkRequestDao["open"]>[0]) {
    return this.database.transaction(async (tx) => {
      const sameProject = and(eq(localLinkRequests.ownerUserId, input.ownerUserId), eq(localLinkRequests.projectId, input.projectId));
      await tx.update(localLinkRequests).set({ state: "failed", reason: SUPERSEDED_REASON }).where(and(sameProject, inArray(localLinkRequests.state, OPEN_STATES)));
      const [row] = await tx.insert(localLinkRequests).values(input).returning();
      return toRecord(row!);
    });
  }

  async latest(input: Parameters<LocalLinkRequestDao["latest"]>[0]) {
    const [row] = await this.database.select().from(localLinkRequests)
      .where(and(eq(localLinkRequests.ownerUserId, input.ownerUserId), eq(localLinkRequests.projectId, input.projectId)))
      .orderBy(desc(localLinkRequests.createdAt)).limit(1);
    return row ? toRecord(row) : null;
  }

  async claim(input: Parameters<LocalLinkRequestDao["claim"]>[0]) {
    const waiting = and(eq(localLinkRequests.ownerUserId, input.ownerUserId), eq(localLinkRequests.state, "pending"), gt(localLinkRequests.expiresAt, input.now));
    const newest = this.database.select({ id: localLinkRequests.id }).from(localLinkRequests).where(waiting).orderBy(desc(localLinkRequests.createdAt)).limit(1).for("update", { skipLocked: true });
    const [row] = await this.database.update(localLinkRequests).set({ state: "claimed", machineId: input.machineId })
      .where(and(inArray(localLinkRequests.id, newest), eq(localLinkRequests.state, "pending"))).returning();
    return row ? toRecord(row) : null;
  }

  async settle(input: Parameters<LocalLinkRequestDao["settle"]>[0]) {
    const claimedByMachine = and(eq(localLinkRequests.id, input.requestId), eq(localLinkRequests.machineId, input.machineId), eq(localLinkRequests.state, "claimed"));
    const rows = await this.database.update(localLinkRequests).set({ state: input.state, reason: input.reason }).where(claimedByMachine).returning({ id: localLinkRequests.id });
    return rows.length > 0;
  }
}

function toRecord(row: typeof localLinkRequests.$inferSelect): LinkRequestRecord {
  return { id: row.id, ownerUserId: row.ownerUserId, projectId: row.projectId, machineId: row.machineId, expectedRevision: row.expectedRevision, state: row.state as LinkRequestState, reason: row.reason, expiresAt: row.expiresAt };
}
