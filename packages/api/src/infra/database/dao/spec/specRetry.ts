import { eq } from "drizzle-orm";
import type { SpecCommandResult } from "../../../../application/database/dao/taskSpecDao";
import type { SpecStage } from "../../../../application/services/spec/specContracts";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecInteractions } from "../../schema";
import type { Database } from "../../client";
import { ACTIVE_ATTEMPT_STATES, assembleInput, assertNoActiveAttempt, assertWorkspaceBound, bumpWorkflow, currentStage, latestAttemptRow, queueAttempt, runAction, TERMINAL_FAILURE_STATES, type ActionContext, type ActionInput } from "./specAttemptActions";
import { saveCommand } from "./specCommandHelpers";

const UNSETTLED_STATES = ["stopping", "reconciling", "dispatching"];

export async function assertSettledFailure(context: ActionContext, failedAttemptId: string) {
  const attempt = await latestAttemptRow(context.db, context.workflow.id, failedAttemptId);
  if (UNSETTLED_STATES.includes(attempt.state)) throw new TaskError("outcome_unknown");
  if (ACTIVE_ATTEMPT_STATES.includes(attempt.state)) throw new TaskError("attempt_active");
  if (!TERMINAL_FAILURE_STATES.includes(attempt.state)) throw new TaskError("spec_conflict");
  const stage = await currentStage(context.db, context.workflow.id, attempt.stage as SpecStage);
  if (stage.currentAttemptId !== attempt.id) throw new TaskError("spec_conflict");
  return { attempt, stage };
}

export async function retryContext(db: Database, attemptId: string) {
  const rows = await db.select().from(taskSpecInteractions).where(eq(taskSpecInteractions.attemptId, attemptId));
  const answers = rows.filter((row) => row.kind === "question" && row.status === "resolved" && row.response).map((row) => ({ interactionId: row.id, question: row.description, answer: String((row.response as { value?: string }).value ?? "") }));
  const unavailable = rows.filter((row) => row.kind === "question" && row.status !== "resolved").map((row) => ({ interactionId: row.id, question: row.description }));
  const permissionHistory = rows.filter((row) => row.kind === "permission" && row.status === "resolved").map((row) => ({ interactionId: row.id, ...(row.response as object) }));
  return { answers, unavailable, permissionHistory, executablePermissions: [] };
}

export function acceptRetry(database: Database, input: ActionInput & { failedAttemptId: string }): Promise<SpecCommandResult> {
  return runAction(database, input, async (context) => {
    const { db, workflow } = context;
    const { attempt, stage } = await assertSettledFailure(context, input.failedAttemptId);
    if (stage.state === "approved") throw new TaskError("stage_approved");
    await assertWorkspaceBound(context);
    await assertNoActiveAttempt(context);
    const source = attempt.input as { adjustment?: string | null; reviewedPackageId?: string | null };
    const base = await assembleInput(context, { stage: attempt.stage as SpecStage, reviewedPackageId: source.reviewedPackageId, adjustment: source.adjustment });
    const attemptId = await queueAttempt(context, { stage: attempt.stage as SpecStage, kind: "retry", sourceAttemptId: attempt.id, input: { ...base, retryContext: await retryContext(db, attempt.id) } as typeof base });
    const specVersion = await bumpWorkflow(db, workflow.id, "queued");
    return saveCommand(db, { target: input, action: "spec.retry", workflowId: workflow.id, specVersion, payload: input.payload, attemptId });
  });
}
