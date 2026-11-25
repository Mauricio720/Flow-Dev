import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { ReviewCycleView, ReviewRoundView } from "../../../../application/services/review/reviewCycleView";
import type { ReviewRole } from "../../../../application/services/review/reviewCycleTypes";
import type { Database } from "../../client";
import { taskArtifactVersions, taskReviewCycles, taskReviewRounds, taskTerminalSessions } from "../../schema";

const reviewSession = alias(taskTerminalSessions, "review_session");
const executeSession = alias(taskTerminalSessions, "execute_session");

function roleFor(state: string, stepRole: string): ReviewRole {
  if (state === "reviewing") return "review";
  if (state === "executing" || state === "caveats") return "execute";
  return stepRole as ReviewRole;
}

function roundView(row: { number: number; verdict: string | null; reportPath: string | null; reportArtifactId: string | null; reviewSessionId: string | null; executeSessionId: string | null }): ReviewRoundView {
  return { ...row, verdict: row.verdict as ReviewRoundView["verdict"] };
}

export async function readReviewCycleView(database: Database, cycleId: string): Promise<ReviewCycleView | null> {
  const [row] = await database.select({ cycle: taskReviewCycles, reviewStatus: reviewSession.status, executeStatus: executeSession.status }).from(taskReviewCycles).leftJoin(reviewSession, eq(reviewSession.id, taskReviewCycles.reviewSessionId)).leftJoin(executeSession, eq(executeSession.id, taskReviewCycles.executeSessionId)).where(eq(taskReviewCycles.id, cycleId)).limit(1);
  if (!row) return null;
  const rounds = await database.select({ number: taskReviewRounds.number, verdict: taskReviewRounds.verdict, reportPath: taskReviewRounds.reportPath, reportArtifactId: taskArtifactVersions.artifactId, reviewSessionId: taskReviewRounds.reviewSessionId, executeSessionId: taskReviewRounds.executeSessionId }).from(taskReviewRounds).leftJoin(taskArtifactVersions, eq(taskArtifactVersions.id, taskReviewRounds.reportVersionId)).where(eq(taskReviewRounds.cycleId, cycleId)).orderBy(desc(taskReviewRounds.number));
  const cycle = row.cycle;
  const role = roleFor(cycle.state, cycle.stepRole);
  const sessionId = role === "review" ? cycle.reviewSessionId : cycle.executeSessionId;
  const sessionStatus = role === "review" ? row.reviewStatus : row.executeStatus;
  return { id: cycle.id, state: cycle.state as ReviewCycleView["state"], partial: cycle.partial, round: cycle.round, revision: cycle.revision, reviewer: { agent: cycle.reviewerAgent as "claude" | "codex", model: cycle.reviewerModel, effort: cycle.reviewerEffort }, executor: { agent: cycle.executorAgent as "claude" | "codex", model: cycle.executorModel, effort: cycle.executorEffort }, step: { role, sessionId, sessionStatus: sessionStatus as ReviewCycleView["step"]["sessionStatus"] }, sessions: { review: cycle.reviewSessionId, execute: cycle.executeSessionId }, pendingAction: cycle.pendingAction as ReviewCycleView["pendingAction"], failure: cycle.failure, stopReason: cycle.stopReason, rounds: rounds.map(roundView), startedAt: cycle.startedAt.toISOString(), endedAt: cycle.endedAt?.toISOString() ?? null };
}
