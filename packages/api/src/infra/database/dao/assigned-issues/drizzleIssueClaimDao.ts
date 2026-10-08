import { and, eq, inArray } from "drizzle-orm";
import { taskIssueClaimAttempts, taskIssueClaims } from "../../schema";
import type { Database } from "../../client";
import type { ActiveQuery, IssueClaimDao, ReconcileRecord, ReserveInput, SettleInput } from "../../../../application/database/dao/issueClaimDao";
import { UNRESOLVED_ATTEMPT_STATES } from "../../../../application/services/assigned-issues/issueClaimRules";
import { mapAttempt, mapClaim } from "./claimRecords";
import { readActive, readUnresolved } from "./claimReads";
import { reserveClaim } from "./claimReservation";
import { beginDispatch, settleAttempt } from "./claimSettlement";

export class DrizzleIssueClaimDao implements IssueClaimDao {
  constructor(private readonly database: Database) {}

  reserve(input: ReserveInput) { return reserveClaim(this.database, input); }
  beginDispatch(input: { attemptId: string; fence: number; at: Date }) { return beginDispatch(this.database, input); }
  settle(input: SettleInput) { return settleAttempt(this.database, input); }
  unresolved(limit: number) { return readUnresolved(this.database, limit); }
  active(query: ActiveQuery) { return readActive(this.database, query); }

  async attemptByKey(claimantUserId: string, projectId: string, requestKey: string) {
    const [row] = await this.database.select().from(taskIssueClaimAttempts).where(and(eq(taskIssueClaimAttempts.claimantUserId, claimantUserId), eq(taskIssueClaimAttempts.projectId, projectId), eq(taskIssueClaimAttempts.requestKey, requestKey))).limit(1);
    return row ? mapAttempt(row) : null;
  }

  async recordReconcile(input: ReconcileRecord) {
    await this.database.insert(taskIssueClaimAttempts).values({ ...input, kind: "reconcile", state: "recorded" }).onConflictDoNothing();
  }

  async claimByTask(projectId: string, taskId: string) {
    const [row] = await this.database.select().from(taskIssueClaims).where(and(eq(taskIssueClaims.projectId, projectId), eq(taskIssueClaims.taskId, taskId))).limit(1);
    return row ? mapClaim(row) : null;
  }

  async claimBySource(sourceId: string) {
    const [row] = await this.database.select().from(taskIssueClaims).where(eq(taskIssueClaims.sourceId, sourceId)).limit(1);
    return row ? mapClaim(row) : null;
  }

  async unresolvedAttempt(sourceId: string) {
    const [row] = await this.database.select().from(taskIssueClaimAttempts).where(and(eq(taskIssueClaimAttempts.sourceId, sourceId), eq(taskIssueClaimAttempts.kind, "claim"), inArray(taskIssueClaimAttempts.state, UNRESOLVED_ATTEMPT_STATES))).limit(1);
    return row ? mapAttempt(row) : null;
  }
}
