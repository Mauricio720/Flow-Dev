import { and, eq } from "drizzle-orm";
import type { SpecCommandResult, SpecCommandTarget } from "../../../../application/database/dao/taskSpecDao";
import type { SpecAction, SpecReceipt, SpecReason } from "../../../../application/services/spec/specContracts";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecCommands, taskSpecWorkflows, tasks } from "../../schema";
import type { Database } from "../../client";

export type SpecTask = typeof tasks.$inferSelect;
export type SpecWorkflowRow = typeof taskSpecWorkflows.$inferSelect;
type CommandRow = typeof taskSpecCommands.$inferSelect;

export async function lockSpecTask(database: Database, scope: { projectId: string; taskId: string }) {
  const row = (await database.select().from(tasks).where(and(eq(tasks.projectId, scope.projectId), eq(tasks.id, scope.taskId))).limit(1).for("update"))[0];
  if (!row) throw new TaskError("spec_unavailable");
  return row;
}

export async function lockSpecWorkflow(database: Database, taskId: string) {
  return (await database.select().from(taskSpecWorkflows).where(eq(taskSpecWorkflows.taskId, taskId)).limit(1).for("update"))[0] ?? null;
}

export function assertAuthor(task: SpecTask, actorUserId: string) {
  if (task.authorUserId !== actorUserId) throw new TaskError("author_required");
}

export function assertVersion(workflow: SpecWorkflowRow | null, expectedSpecVersion: number) {
  if ((workflow?.version ?? 0) !== expectedSpecVersion) throw new TaskError("spec_conflict");
}

export function toReceipt(row: CommandRow): SpecReceipt {
  return { commandId: row.id, status: row.status as SpecReceipt["status"], specVersion: row.specVersion, attemptId: row.attemptId, packageId: row.packageId, reason: row.reason as SpecReason | null };
}

export async function findReplay(database: Database, target: SpecCommandTarget, action: SpecAction): Promise<SpecCommandResult | null> {
  const row = (await database.select().from(taskSpecCommands).where(and(eq(taskSpecCommands.actorUserId, target.actorUserId), eq(taskSpecCommands.requestKey, target.requestKey))).limit(1))[0];
  if (!row) return null;
  if (row.action !== action || row.taskId !== target.taskId || row.projectId !== target.projectId || row.payloadHash !== target.payloadHash) throw new TaskError("request_key_reused");
  return { ...toReceipt(row), replayed: true };
}

type SaveInput = { target: SpecCommandTarget; action: SpecAction; workflowId: string; specVersion: number; payload: Record<string, unknown>; attemptId?: string | null; packageId?: string | null };

export async function saveCommand(database: Database, input: SaveInput): Promise<SpecCommandResult> {
  const { target } = input;
  const [row] = await database.insert(taskSpecCommands).values({ taskId: target.taskId, projectId: target.projectId, workflowId: input.workflowId, action: input.action, actorUserId: target.actorUserId, requestKey: target.requestKey, payloadHash: target.payloadHash, expectedVersion: target.expectedSpecVersion, payload: input.payload, specVersion: input.specVersion, attemptId: input.attemptId ?? null, packageId: input.packageId ?? null }).returning();
  return { ...toReceipt(row!), replayed: false };
}
