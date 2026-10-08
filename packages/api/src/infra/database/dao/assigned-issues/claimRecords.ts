import { eq } from "drizzle-orm";
import { taskIssueClaimAttempts, taskIssueClaims } from "../../schema";
import type { Database } from "../../client";
import type { AttemptRecord, ClaimRecord } from "../../../../application/database/dao/issueClaimDao";
import type { ClaimState } from "../../../../application/services/assigned-issues/assignedIssueContracts";

export function mapClaim(row: typeof taskIssueClaims.$inferSelect): ClaimRecord {
  return { id: row.id, sourceId: row.sourceId, taskId: row.taskId, projectId: row.projectId, candidateUserId: row.candidateUserId, operatorUserId: row.operatorUserId, state: row.state as ClaimState, revision: row.revision, fence: row.fence, boardNodeId: row.boardNodeId, boardItemId: row.boardItemId, statusFieldId: row.statusFieldId, optionId: row.optionId, sourceSnapshotId: row.sourceSnapshotId, reason: row.reason, lastVerifiedAt: row.lastVerifiedAt, claimedAt: row.claimedAt };
}

export function mapAttempt(row: typeof taskIssueClaimAttempts.$inferSelect): AttemptRecord {
  return { id: row.id, sourceId: row.sourceId, projectId: row.projectId, claimantUserId: row.claimantUserId, kind: row.kind as AttemptRecord["kind"], requestKey: row.requestKey, payloadHash: row.payloadHash, state: row.state, fence: row.fence, dispatchStartedAt: row.dispatchStartedAt, readBackStatus: row.readBackStatus, failureCode: row.failureCode, createdAt: row.createdAt };
}

export async function lockClaim(tx: Database, sourceId: string) {
  const [row] = await tx.select().from(taskIssueClaims).where(eq(taskIssueClaims.sourceId, sourceId)).limit(1).for("update");
  return row ?? null;
}
