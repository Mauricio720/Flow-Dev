import type { ClaimRecord } from "../../database/dao/issueClaimDao";
import type { ClaimResult, ClaimStatus } from "./assignedIssueContracts";

export function claimStatus(claim: ClaimRecord): ClaimStatus {
  return { taskId: claim.taskId, state: claim.state, operatorId: claim.operatorUserId, reason: claim.reason };
}

export function claimResult(claim: ClaimRecord, replayed: boolean): ClaimResult {
  return { ...claimStatus(claim), replayed };
}
