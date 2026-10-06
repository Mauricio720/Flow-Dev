import type { SpecCommandResult } from "../../../../application/database/dao/taskSpecDao";
import { assertStagePrerequisite } from "../../../../application/services/spec/specStages";
import type { SpecRoute, SpecStage } from "../../../../application/services/spec/specContracts";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { eq } from "drizzle-orm";
import { taskSpecPackages, taskSpecStages } from "../../schema";
import { assembleInput, assertNoActiveAttempt, assertWorkspaceBound, bumpWorkflow, currentStage, queueAttempt, runAction, type ActionInput } from "./specAttemptActions";
import { saveCommand } from "./specCommandHelpers";
import type { Database } from "../../client";

const REVIEW_STATE = "review";

export function acceptAdjust(database: Database, input: ActionInput & { stage: SpecStage; packageId: string }): Promise<SpecCommandResult> {
  return runAction(database, input, async (context) => {
    const { db, workflow } = context;
    const approved = (await db.select().from(taskSpecStages).where(eq(taskSpecStages.workflowId, workflow.id))).filter((row) => row.state === "approved").map((row) => row.stage as SpecStage);
    assertStagePrerequisite({ route: workflow.selectedRoute as SpecRoute, stage: input.stage, approved });
    if (approved.includes(input.stage)) throw new TaskError("stage_approved");
    const [pkg] = await db.select().from(taskSpecPackages).where(eq(taskSpecPackages.id, input.packageId));
    const stage = await currentStage(db, workflow.id, input.stage);
    if (!pkg || pkg.workflowId !== workflow.id) throw new TaskError("spec_unavailable");
    if (pkg.stage !== input.stage || pkg.manifestHash !== input.payload.manifestHash || stage.currentPackageId !== pkg.id || stage.state !== REVIEW_STATE) throw new TaskError("spec_conflict");
    await assertWorkspaceBound(context);
    await assertNoActiveAttempt(context);
    const adjusted = await assembleInput(context, { stage: input.stage, reviewedPackageId: pkg.id, adjustment: String(input.payload.text) });
    const attemptId = await queueAttempt(context, { stage: input.stage, kind: "adjust", sourceAttemptId: pkg.attemptId, input: adjusted });
    const specVersion = await bumpWorkflow(db, workflow.id, "queued");
    return saveCommand(db, { target: input, action: "spec.adjust", workflowId: workflow.id, specVersion, payload: input.payload, attemptId, packageId: pkg.id });
  });
}
