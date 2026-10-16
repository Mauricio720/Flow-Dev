import { and, asc, eq, inArray, lte, or, sql } from "drizzle-orm";
import { issueDeletionOperations } from "../../schema";
import type { Database } from "../../client";
import type { DeletionClaim } from "../../../../application/database/dao/issueDeletionDao";
import { IssueDeletionError } from "../../../../application/services/issue-deletion/issueDeletionErrors";
import { mapOperation } from "./deletionRecords";

const CLAIMABLE_STATES = ["stopping", "reconciling", "deleting_remote", "verifying_remote", "cleaning_local"];

export async function claimNextDeletion(database: Database, input: { owner: string; now: Date; leaseMs: number }): Promise<DeletionClaim | null> {
  return database.transaction(async (raw) => {
    const tx = raw as unknown as Database;
    const row = (await tx.select().from(issueDeletionOperations)
      .where(and(
        inArray(issueDeletionOperations.state, CLAIMABLE_STATES),
        or(sql`${issueDeletionOperations.retryAt} is null`, lte(issueDeletionOperations.retryAt, input.now)),
        or(sql`${issueDeletionOperations.leaseUntil} is null`, lte(issueDeletionOperations.leaseUntil, input.now), eq(issueDeletionOperations.leaseOwner, input.owner)),
      ))
      .orderBy(asc(issueDeletionOperations.createdAt)).limit(1).for("update", { skipLocked: true }))[0];
    if (!row) return null;
    const fence = row.leaseFence + 1;
    await tx.update(issueDeletionOperations).set({ leaseOwner: input.owner, leaseFence: fence, leaseUntil: new Date(input.now.getTime() + input.leaseMs), updatedAt: input.now }).where(eq(issueDeletionOperations.id, row.id));
    return { operation: mapOperation({ ...row, leaseOwner: input.owner, leaseFence: fence, leaseUntil: new Date(input.now.getTime() + input.leaseMs) }), workerId: input.owner, fence };
  });
}

export async function heartbeatDeletion(database: Database, input: { operationId: string; owner: string; fence: number; now: Date; leaseMs: number }) {
  const updated = await database.update(issueDeletionOperations).set({ leaseUntil: new Date(input.now.getTime() + input.leaseMs), updatedAt: input.now }).where(and(eq(issueDeletionOperations.id, input.operationId), eq(issueDeletionOperations.leaseOwner, input.owner), eq(issueDeletionOperations.leaseFence, input.fence))).returning({ id: issueDeletionOperations.id });
  if (!updated.length) throw new IssueDeletionError("stale_fence");
}
