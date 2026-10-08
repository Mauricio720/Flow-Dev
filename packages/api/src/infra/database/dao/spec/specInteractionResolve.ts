import { and, eq, sql } from "drizzle-orm";
import type { SpecCommandResult, SpecCommandTarget } from "../../../../application/database/dao/taskSpecDao";
import type { SpecStage } from "../../../../application/services/spec/specContracts";
import { assertInteractionOpen, type StoredInteraction } from "../../../../application/services/spec/specInteractionRules";
import type { PermissionTarget } from "../../../../application/spec/specPermissionBoundary";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecAttempts, taskSpecInteractions, taskSpecStages, taskSpecWorkflows } from "../../schema";
import type { Database } from "../../client";
import { assertOperator, assertVersion, findReplay, lockSpecTask, lockSpecWorkflow, saveCommand } from "./specCommandHelpers";

export type ResolveInteractionInput = SpecCommandTarget & {
  action: "spec.answer" | "spec.permission";
  attemptId: string;
  interactionId: string;
  payload: Record<string, unknown>;
  validate: (interaction: StoredInteraction) => void;
  response: (interaction: StoredInteraction) => Record<string, unknown>;
};

export function resolveInteractionCommand(database: Database, input: ResolveInteractionInput): Promise<SpecCommandResult> {
  return database.transaction(async (tx) => {
    const db = tx as unknown as Database;
    const task = await lockSpecTask(db, input);
    await assertOperator(db, task, input.actorUserId);
    const replay = await findReplay(db, input, input.action);
    if (replay) return replay;
    const workflow = await lockSpecWorkflow(db, task.id);
    if (!workflow) throw new TaskError("spec_unavailable");
    assertVersion(workflow, input.expectedSpecVersion);
    const interaction = await loadInteraction(db, workflow.id, input);
    assertInteractionOpen(interaction);
    input.validate(interaction);
    const [bumped] = await db.update(taskSpecWorkflows).set({ version: sql`${taskSpecWorkflows.version} + 1`, updatedAt: new Date() }).where(eq(taskSpecWorkflows.id, workflow.id)).returning({ version: taskSpecWorkflows.version });
    const receipt = await saveCommand(db, { target: input, action: input.action, workflowId: workflow.id, specVersion: bumped!.version, payload: input.payload, attemptId: input.attemptId });
    await db.update(taskSpecInteractions).set({ status: "resolved", winningCommandId: receipt.commandId, response: input.response(interaction), delivery: "pending", resolvedAt: new Date() }).where(eq(taskSpecInteractions.id, interaction.id));
    return receipt;
  });
}

async function loadInteraction(db: Database, workflowId: string, input: ResolveInteractionInput): Promise<StoredInteraction> {
  const [row] = await db.select({ interaction: taskSpecInteractions, attempt: taskSpecAttempts }).from(taskSpecInteractions).innerJoin(taskSpecAttempts, eq(taskSpecInteractions.attemptId, taskSpecAttempts.id)).where(and(eq(taskSpecInteractions.workflowId, workflowId), eq(taskSpecInteractions.id, input.interactionId), eq(taskSpecInteractions.attemptId, input.attemptId))).limit(1).for("update", { of: taskSpecInteractions });
  if (!row) throw new TaskError("spec_unavailable");
  const [stage] = await db.select({ attemptId: taskSpecStages.currentAttemptId }).from(taskSpecStages).where(and(eq(taskSpecStages.workflowId, workflowId), eq(taskSpecStages.stage, row.attempt.stage))).limit(1);
  const { interaction, attempt } = row;
  return { id: interaction.id, attemptId: attempt.id, stage: attempt.stage as SpecStage, kind: interaction.kind, status: interaction.status, description: interaction.description, choices: interaction.choices, target: interaction.target as PermissionTarget | null, targetDigest: interaction.targetDigest, runtimeTurnId: interaction.runtimeTurnId, attemptState: attempt.state, currentAttemptId: stage?.attemptId ?? null, attemptTurnId: attempt.runtimeTurnId };
}
