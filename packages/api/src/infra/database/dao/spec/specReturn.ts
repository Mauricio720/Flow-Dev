import { eq } from "drizzle-orm";
import type { SpecCommandResult } from "../../../../application/database/dao/taskSpecDao";
import type { SpecStage } from "../../../../application/services/spec/specContracts";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecPackages } from "../../schema";
import type { Database } from "../../client";
import { assertWorkspaceBound, bumpWorkflow, currentStage, runAction, type ActionInput } from "./specAttemptActions";
import { saveCommand } from "./specCommandHelpers";
import { assertSettledFailure } from "./specRetry";

const RESTORABLE_STATES = ["review_ready", "installed"];

export function acceptReturnToReview(database: Database, input: ActionInput & { failedAttemptId: string; packageId: string }): Promise<SpecCommandResult> {
  return runAction(database, input, async (context) => {
    const { db, workflow } = context;
    const { attempt } = await assertSettledFailure(context, input.failedAttemptId);
    const stage = await currentStage(db, workflow.id, attempt.stage as SpecStage);
    const [pkg] = await db.select().from(taskSpecPackages).where(eq(taskSpecPackages.id, input.packageId));
    if (!pkg || pkg.workflowId !== workflow.id) throw new TaskError("spec_unavailable");
    const restorable = [stage.currentPackageId, stage.previousCompletePackageId].includes(pkg.id) && pkg.stage === attempt.stage && RESTORABLE_STATES.includes(pkg.captureState);
    if (!restorable || pkg.manifestHash !== input.payload.manifestHash) throw new TaskError("spec_conflict");
    await assertWorkspaceBound(context);
    const specVersion = await bumpWorkflow(db, workflow.id);
    return saveCommand(db, { target: input, action: "spec.returnToReview", workflowId: workflow.id, specVersion, payload: input.payload, attemptId: attempt.id, packageId: pkg.id });
  });
}
