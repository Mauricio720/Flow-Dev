import { and, asc, desc, eq, inArray, lt, or } from "drizzle-orm";
import { taskIssueClaimAttempts, taskIssueClaims, taskIssueSnapshots, taskIssueSources, tasks, users } from "../../schema";
import type { Database } from "../../client";
import type { ActiveQuery, UnresolvedClaim } from "../../../../application/database/dao/issueClaimDao";
import { UNRESOLVED_ATTEMPT_STATES } from "../../../../application/services/assigned-issues/issueClaimRules";
import type { ActiveWorkItem } from "../../../../application/services/assigned-issues/assignedIssueContracts";
import { mapAttempt, mapClaim } from "./claimRecords";

const CLAIMED_STATE = "claimed";

export async function readUnresolved(database: Database, limit: number): Promise<UnresolvedClaim[]> {
  const rows = await database.select({ claim: taskIssueClaims, attempt: taskIssueClaimAttempts }).from(taskIssueClaimAttempts).innerJoin(taskIssueClaims, eq(taskIssueClaims.sourceId, taskIssueClaimAttempts.sourceId)).where(and(eq(taskIssueClaimAttempts.kind, "claim"), inArray(taskIssueClaimAttempts.state, UNRESOLVED_ATTEMPT_STATES))).orderBy(asc(taskIssueClaimAttempts.createdAt)).limit(limit);
  return rows.map((row) => ({ claim: mapClaim(row.claim), attempt: mapAttempt(row.attempt) }));
}

export async function readActive(database: Database, query: ActiveQuery) {
  const mine = query.operatorUserId ? eq(taskIssueClaims.operatorUserId, query.operatorUserId) : undefined;
  const after = query.after && or(lt(taskIssueClaims.claimedAt, new Date(query.after.claimedAt)), and(eq(taskIssueClaims.claimedAt, new Date(query.after.claimedAt)), lt(taskIssueClaims.id, query.after.id)));
  const rows = await database.select({ claim: taskIssueClaims, source: taskIssueSources, snapshot: taskIssueSnapshots, task: tasks, operator: users }).from(taskIssueClaims).innerJoin(taskIssueSources, eq(taskIssueSources.id, taskIssueClaims.sourceId)).innerJoin(taskIssueSnapshots, eq(taskIssueSnapshots.id, taskIssueSources.currentSnapshotId)).innerJoin(tasks, eq(tasks.id, taskIssueClaims.taskId)).innerJoin(users, eq(users.id, taskIssueClaims.operatorUserId)).where(and(eq(taskIssueClaims.projectId, query.projectId), eq(taskIssueClaims.state, CLAIMED_STATE), mine, after || undefined)).orderBy(desc(taskIssueClaims.claimedAt), desc(taskIssueClaims.id)).limit(query.limit + 1);
  const page = rows.slice(0, query.limit);
  const items: ActiveWorkItem[] = page.map((row) => ({ taskId: row.task.id, title: row.snapshot.title, issueNumber: row.source.issueNumber, issueUrl: row.source.issueUrl, operatorId: row.operator.id, operatorName: row.operator.displayName ?? row.operator.name, stage: row.task.planningStatus, blockReason: null, claimedAt: row.claim.claimedAt!.toISOString() }));
  const last = page.at(-1);
  return { items, nextCursor: null, lastKey: rows.length > query.limit && last ? { claimedAt: last.claim.claimedAt!.toISOString(), id: last.claim.id } : null };
}

