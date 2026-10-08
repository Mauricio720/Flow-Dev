import { eq, sql } from "drizzle-orm";
import { taskIssueClaimAttempts, taskIssueClaims } from "../../schema";
import type { Database } from "../../client";
import type { ReserveInput, ReserveOutcome } from "../../../../application/database/dao/issueClaimDao";
import type { ResolvedSource } from "../../../../application/database/dao/issueSourceDao";
import { isHeld } from "../../../../application/services/assigned-issues/issueClaimRules";
import type { ClaimState } from "../../../../application/services/assigned-issues/assignedIssueContracts";
import { AssignedIssueError } from "../../../../application/services/assigned-issues/assignedIssueErrors";
import { isUniqueViolation } from "../projects/projectRecordMapper";
import { lockClaim, mapAttempt, mapClaim } from "./claimRecords";
import { resolveSource } from "./sourceBinding";

const PENDING_STATE = "pending";
const RESERVED_STATE = "reserved";

export function reserveClaim(database: Database, input: ReserveInput): Promise<ReserveOutcome> {
  return database.transaction(async (raw) => {
    const tx = raw as unknown as Database;
    const source = await resolveSource(tx, input.source);
    const current = await lockClaim(tx, source.sourceId);
    if (current && isHeld(current.state as ClaimState)) return { kind: "held" as const, claim: mapClaim(current) };
    const claim = current ? await rewriteClaim(tx, current.id, input, source) : await insertClaim(tx, input, source);
    const attempt = await insertAttempt(tx, { input, source, fence: claim.fence });
    return { kind: "reserved" as const, source, claim: mapClaim(claim), attempt: mapAttempt(attempt) };
  }).catch((error: unknown) => {
    if (isUniqueViolation(error)) throw new AssignedIssueError("request_key_reused");
    throw error;
  });
}

function claimValues(input: ReserveInput, source: ResolvedSource) {
  return { candidateUserId: input.claimantUserId, state: PENDING_STATE, sourceSnapshotId: source.snapshot.id, reason: null, ...input.board };
}

async function insertClaim(tx: Database, input: ReserveInput, source: ResolvedSource) {
  const [row] = await tx.insert(taskIssueClaims).values({ ...claimValues(input, source), sourceId: source.sourceId, taskId: source.taskId, projectId: input.source.identity.projectId }).returning();
  return row!;
}

async function rewriteClaim(tx: Database, claimId: string, input: ReserveInput, source: ResolvedSource) {
  const bump = { revision: sql`${taskIssueClaims.revision} + 1`, fence: sql`${taskIssueClaims.fence} + 1`, updatedAt: new Date() };
  const [row] = await tx.update(taskIssueClaims).set({ ...claimValues(input, source), ...bump }).where(eq(taskIssueClaims.id, claimId)).returning();
  return row!;
}

async function insertAttempt(tx: Database, input: { input: ReserveInput; source: ResolvedSource; fence: number }) {
  const { input: reserve, source, fence } = input;
  const [row] = await tx.insert(taskIssueClaimAttempts).values({ sourceId: source.sourceId, projectId: reserve.source.identity.projectId, claimantUserId: reserve.claimantUserId, requestKey: reserve.requestKey, payloadHash: reserve.payloadHash, state: RESERVED_STATE, fence }).returning();
  return row!;
}
