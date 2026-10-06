import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import type { SpecPageQuery } from "../../../../application/database/dao/taskSpecDao";
import { decodeTaskCursor, encodeTaskCursor } from "../../../../application/pagination/taskCursor";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { taskSpecEvents, taskSpecWorkflows } from "../../schema";
import type { Database } from "../../client";

export async function findWorkflowId(database: Database, scope: { projectId: string; taskId: string }) {
  const row = (await database.select({ id: taskSpecWorkflows.id }).from(taskSpecWorkflows).where(and(eq(taskSpecWorkflows.projectId, scope.projectId), eq(taskSpecWorkflows.taskId, scope.taskId))).limit(1))[0];
  if (!row) throw new TaskError("spec_unavailable");
  return row.id;
}

export async function readSpecEvents(database: Database, input: SpecPageQuery) {
  const workflowId = await findWorkflowId(database, input);
  const direction = input.direction ?? "after";
  const cursor = decodeTaskCursor(input.cursor, "spec_events", workflowId, direction);
  const position = cursor ? Number(cursor.position) : direction === "after" ? 0 : Number.MAX_SAFE_INTEGER;
  const comparison = direction === "after" ? gt(taskSpecEvents.sequence, position) : lt(taskSpecEvents.sequence, position);
  const order = direction === "after" ? asc(taskSpecEvents.sequence) : desc(taskSpecEvents.sequence);
  const rows = await database.select().from(taskSpecEvents).where(and(eq(taskSpecEvents.workflowId, workflowId), comparison)).orderBy(order).limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const page = rows.slice(0, input.limit);
  const items = direction === "after" ? page : page.reverse();
  const edge = direction === "after" ? items.at(-1) : items[0];
  const nextCursor = edge ? encodeTaskCursor({ kind: "spec_events", scope: workflowId, position: String(edge.sequence), direction }) : null;
  return { items: items.map(toEvent), nextCursor, hasMore };
}

export async function readSpecEvent(database: Database, scope: { projectId: string; taskId: string; eventId: string }) {
  const workflowId = await findWorkflowId(database, scope);
  const row = (await database.select().from(taskSpecEvents).where(and(eq(taskSpecEvents.workflowId, workflowId), eq(taskSpecEvents.id, scope.eventId))).limit(1))[0];
  if (!row) throw new TaskError("spec_unavailable");
  return toEvent(row);
}

function toEvent(row: typeof taskSpecEvents.$inferSelect) {
  return { id: row.id, sequence: row.sequence, attemptId: row.attemptId, kind: row.kind, payload: row.payload, observedAt: row.observedAt };
}
