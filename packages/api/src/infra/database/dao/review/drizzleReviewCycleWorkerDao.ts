import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, notInArray, sql } from "drizzle-orm";
import type { ReviewCycleWorkerDao, ReviewSessionTurn } from "../../../../application/database/dao/reviewCycleWorkerDao";
import type { ReviewCycleRecord } from "../../../../application/database/dao/reviewCycleDao";
import type { ReviewAction, ReviewRole, ReviewVerdict } from "../../../../application/services/review/reviewCycleTypes";
import type { TerminalSessionStatus } from "../../../../application/terminal/terminalSessionStatus";
import type { Database } from "../../client";
import { taskArtifactVersions, taskArtifacts, taskReviewCycles, taskReviewRounds, taskTerminalEvents, taskTerminalRequests, taskTerminalSessions } from "../../schema";

const OPEN_STATES = ["reviewing", "executing", "caveats", "failed"];
const FINAL_SESSION_STATES = ["ended", "launch_failed"];

function cycleRecord(row: typeof taskReviewCycles.$inferSelect): ReviewCycleRecord {
  return { ...row, reviewer: { agent: row.reviewerAgent as "claude" | "codex", model: row.reviewerModel, effort: row.reviewerEffort }, executor: { agent: row.executorAgent as "claude" | "codex", model: row.executorModel, effort: row.executorEffort }, state: row.state as ReviewCycleRecord["state"], stepRole: row.stepRole as ReviewRole, pendingAction: row.pendingAction as ReviewAction | null };
}

export class DrizzleReviewCycleWorkerDao implements ReviewCycleWorkerDao {
  constructor(private readonly database: Database) {}

  async listForHost(hostId: string) {
    const rows = await this.database.select().from(taskReviewCycles).where(and(eq(taskReviewCycles.hostId, hostId), inArray(taskReviewCycles.state, OPEN_STATES))).orderBy(asc(taskReviewCycles.startedAt));
    return rows.map(cycleRecord);
  }

  async setSession(input: { cycleId: string; role: ReviewRole; sessionId: string; stepStartedAt: Date }) {
    const session = input.role === "review" ? { reviewSessionId: input.sessionId } : { executeSessionId: input.sessionId };
    const [row] = await this.database.update(taskReviewCycles).set({ ...session, stepStartedAt: input.stepStartedAt, updatedAt: input.stepStartedAt, revision: sql`${taskReviewCycles.revision} + 1` }).where(and(eq(taskReviewCycles.id, input.cycleId), isNull(input.role === "review" ? taskReviewCycles.reviewSessionId : taskReviewCycles.executeSessionId), isNull(taskReviewCycles.pendingAction), inArray(taskReviewCycles.state, OPEN_STATES))).returning();
    return row ? cycleRecord(row) : null;
  }

  async transition(input: Parameters<ReviewCycleWorkerDao["transition"]>[0]) {
    const [row] = await this.database.update(taskReviewCycles).set({ state: input.next.state, stepRole: input.next.stepRole, round: input.next.round, stepStartedAt: input.next.stepStartedAt, endedBy: input.next.endedBy, endedAt: input.next.endedAt, failure: input.next.failure, stopReason: input.next.stopReason, attempt: input.next.attempt, reviewSessionId: input.next.reviewSessionId, executeSessionId: input.next.executeSessionId, pendingAction: null, pendingBy: null, pendingAt: null, updatedAt: input.next.endedAt ?? input.next.stepStartedAt ?? new Date(), revision: sql`${taskReviewCycles.revision} + 1` }).where(and(eq(taskReviewCycles.id, input.cycleId), eq(taskReviewCycles.revision, input.revision))).returning();
    return row ? cycleRecord(row) : null;
  }

  async openRound(input: Parameters<ReviewCycleWorkerDao["openRound"]>[0]) {
    const sessionIds = { reviewSessionId: input.reviewSessionId, executeSessionId: input.executeSessionId };
    await this.database.insert(taskReviewRounds).values({ cycleId: input.cycleId, number: input.number, ...sessionIds }).onConflictDoUpdate({ target: [taskReviewRounds.cycleId, taskReviewRounds.number], set: sessionIds });
  }

  async recordReview(input: Parameters<ReviewCycleWorkerDao["recordReview"]>[0]) {
    await this.database.update(taskReviewRounds).set({ verdict: input.verdict, reportPath: input.reportPath, reportVersionId: input.reportVersionId, reviewSessionId: input.reviewSessionId, reviewedAt: input.reviewedAt }).where(and(eq(taskReviewRounds.cycleId, input.cycleId), eq(taskReviewRounds.number, input.number)));
  }

  async recordExecution(input: Parameters<ReviewCycleWorkerDao["recordExecution"]>[0]) {
    await this.database.update(taskReviewRounds).set({ executeSessionId: input.executeSessionId, executedAt: input.executedAt }).where(and(eq(taskReviewRounds.cycleId, input.cycleId), eq(taskReviewRounds.number, input.number)));
  }

  async clearPending(input: Parameters<ReviewCycleWorkerDao["clearPending"]>[0]) {
    const [row] = await this.database.update(taskReviewCycles).set({ pendingAction: null, pendingBy: null, pendingAt: null, updatedAt: input.at, revision: sql`${taskReviewCycles.revision} + 1` }).where(and(eq(taskReviewCycles.id, input.cycleId), eq(taskReviewCycles.revision, input.revision), isNotNull(taskReviewCycles.pendingAction))).returning();
    return row ? cycleRecord(row) : null;
  }

  async sessionTurn(sessionId: string): Promise<ReviewSessionTurn | null> {
    const [session] = await this.database.select({ taskId: taskTerminalSessions.taskId, projectId: taskTerminalSessions.projectId, checkoutPath: taskTerminalSessions.checkoutPath, status: taskTerminalSessions.status, interruptRequestedAt: taskTerminalSessions.interruptRequestedAt, endRequestedAt: taskTerminalSessions.endRequestedAt, endedAt: taskTerminalSessions.endedAt, launchFailedAt: taskTerminalSessions.launchFailedAt, launchError: taskTerminalSessions.launchError, lastSignalAt: taskTerminalSessions.lastSignalAt }).from(taskTerminalSessions).where(eq(taskTerminalSessions.id, sessionId)).limit(1);
    if (!session) return null;
    const [lastTurn] = await this.database.select({ occurredAt: taskTerminalEvents.occurredAt }).from(taskTerminalEvents).where(and(eq(taskTerminalEvents.sessionId, sessionId), eq(taskTerminalEvents.kind, "waiting"))).orderBy(desc(taskTerminalEvents.occurredAt)).limit(1);
    const [pending] = await this.database.select({ id: taskTerminalRequests.id }).from(taskTerminalRequests).where(and(eq(taskTerminalRequests.sessionId, sessionId), eq(taskTerminalRequests.status, "pending"))).limit(1);
    const edits = await this.database.select({ sessionId: taskTerminalEvents.sessionId, path: taskTerminalEvents.path, at: taskTerminalEvents.occurredAt }).from(taskTerminalEvents).where(and(eq(taskTerminalEvents.sessionId, sessionId), eq(taskTerminalEvents.kind, "file_edit"), sql`${taskTerminalEvents.path} is not null`)).orderBy(asc(taskTerminalEvents.occurredAt));
    return { taskId: session.taskId, projectId: session.projectId, checkoutPath: session.checkoutPath, status: session.status as TerminalSessionStatus, interruptRequestedAt: session.interruptRequestedAt, endRequestedAt: session.endRequestedAt, endedAt: session.endedAt, launchFailedAt: session.launchFailedAt, launchError: session.launchError, lastSignalAt: session.lastSignalAt, lastTurnEndedAt: lastTurn?.occurredAt ?? null, pending: pending !== undefined, edits: edits.map((edit) => ({ sessionId: edit.sessionId, path: edit.path!, at: edit.at })) };
  }

  async previousReportPath(input: { cycleId: string; round: number }) {
    const [row] = await this.database.select({ reportPath: taskReviewRounds.reportPath }).from(taskReviewRounds).where(and(eq(taskReviewRounds.cycleId, input.cycleId), lt(taskReviewRounds.number, input.round), isNotNull(taskReviewRounds.reportPath))).orderBy(desc(taskReviewRounds.number)).limit(1);
    return row?.reportPath ?? null;
  }

  async reportVersionId(input: { taskId: string; path: string }) {
    const [row] = await this.database.select({ id: taskArtifactVersions.id }).from(taskArtifactVersions).innerJoin(taskArtifacts, eq(taskArtifacts.id, taskArtifactVersions.artifactId)).where(and(eq(taskArtifacts.taskId, input.taskId), eq(taskArtifacts.relativePath, input.path))).orderBy(desc(taskArtifactVersions.version)).limit(1);
    return row?.id ?? null;
  }

  async roundVerdict(input: { cycleId: string; number: number }) {
    const [row] = await this.database.select({ verdict: taskReviewRounds.verdict }).from(taskReviewRounds).where(and(eq(taskReviewRounds.cycleId, input.cycleId), eq(taskReviewRounds.number, input.number))).limit(1);
    return (row?.verdict ?? null) as ReviewVerdict | null;
  }

  async activeSessionIds(cycleId: string) {
    const rows = await this.database.select({ id: taskTerminalSessions.id }).from(taskTerminalSessions).where(and(eq(taskTerminalSessions.reviewCycleId, cycleId), notInArray(taskTerminalSessions.status, FINAL_SESSION_STATES)));
    return rows.map((row) => row.id);
  }
}
