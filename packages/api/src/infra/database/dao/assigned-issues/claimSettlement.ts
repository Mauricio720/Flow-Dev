import { and, eq, sql } from "drizzle-orm";
import { taskIssueClaimAttempts, taskIssueClaims } from "../../schema";
import type { Database } from "../../client";
import type { ClaimRecord, SettleInput } from "../../../../application/database/dao/issueClaimDao";
import { UNRESOLVED_ATTEMPT_STATES, assertFence } from "../../../../application/services/assigned-issues/issueClaimRules";
import { AssignedIssueError } from "../../../../application/services/assigned-issues/assignedIssueErrors";
import { lockClaim, mapClaim } from "./claimRecords";

const ATTEMPT_STATE: Record<SettleInput["outcome"], string> = { claimed: "confirmed", failed: "failed", uncertain: "uncertain" };

export async function beginDispatch(database: Database, input: { attemptId: string; fence: number; at: Date }) {
  const rows = await database.update(taskIssueClaimAttempts).set({ state: "dispatching", dispatchStartedAt: input.at }).where(and(eq(taskIssueClaimAttempts.id, input.attemptId), eq(taskIssueClaimAttempts.fence, input.fence), eq(taskIssueClaimAttempts.state, "reserved"))).returning({ id: taskIssueClaimAttempts.id });
  return rows.length === 1;
}

export function settleAttempt(database: Database, input: SettleInput): Promise<ClaimRecord> {
  return database.transaction(async (raw) => {
    const tx = raw as unknown as Database;
    const [attempt] = await tx.select().from(taskIssueClaimAttempts).where(eq(taskIssueClaimAttempts.id, input.attemptId)).limit(1);
    if (!attempt) throw new AssignedIssueError("work_unavailable");
    const claim = (await lockClaim(tx, attempt.sourceId))!;
    assertFence(input.fence, claim.fence);
    assertFence(attempt.fence, claim.fence);
    if (!UNRESOLVED_ATTEMPT_STATES.includes(attempt.state)) return mapClaim(claim);
    await tx.update(taskIssueClaimAttempts).set({ state: ATTEMPT_STATE[input.outcome], readBackStatus: input.readBackStatus, failureCode: input.outcome === "claimed" ? null : input.reason }).where(eq(taskIssueClaimAttempts.id, attempt.id));
    return mapClaim(await updateClaim(tx, claim, input));
  });
}

async function updateClaim(tx: Database, claim: typeof taskIssueClaims.$inferSelect, input: SettleInput) {
  const claimed = input.outcome === "claimed";
  const [row] = await tx.update(taskIssueClaims).set({ state: input.outcome === "claimed" ? "claimed" : input.outcome, operatorUserId: claimed ? claim.candidateUserId : null, claimedAt: claimed ? input.at : null, lastVerifiedAt: input.at, reason: claimed ? null : input.reason, revision: sql`${taskIssueClaims.revision} + 1`, updatedAt: input.at }).where(eq(taskIssueClaims.id, claim.id)).returning();
  return row!;
}
