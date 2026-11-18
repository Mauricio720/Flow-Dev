import { and, asc, count, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import type { StagedImageInput, TaskImageStored } from "../../../../application/database/dao/taskImageDao";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import { MAX_TASK_IMAGES } from "../../../../application/services/tasks/taskImageRules";
import { taskImages } from "../../schema";
import type { Database } from "../../client";
import { imageRecordColumns } from "./taskImageColumns";

const STAGED_IMAGE_LIFETIME_MS = 24 * 60 * 60 * 1000;
const STAGED_LOCK_SPACE = 3;
const TASK_LOCK_SPACE = 2;

export type MessageImageTarget = { projectId: string; taskId: string; messageId: string; actorUserId: string };

export async function stageImage(database: Database, input: StagedImageInput, limit: number): Promise<TaskImageStored> {
  await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.uploadedByUserId}, ${STAGED_LOCK_SPACE}))`);
  const owned = and(isNull(taskImages.taskId), eq(taskImages.projectId, input.projectId), eq(taskImages.uploadedByUserId, input.uploadedByUserId));
  await database.delete(taskImages).where(and(owned, lt(taskImages.createdAt, new Date(Date.now() - STAGED_IMAGE_LIFETIME_MS))));
  const [existing] = await database.select(imageRecordColumns).from(taskImages).where(and(owned, eq(taskImages.sha256, input.sha256))).limit(1);
  if (existing) return { status: "stored", image: existing };
  const [staged] = await database.select({ total: count() }).from(taskImages).where(owned);
  if ((staged?.total ?? 0) >= limit) return { status: "limit_reached" };
  const [image] = await database.insert(taskImages).values({ ...input, byteSize: input.content.byteLength }).returning(imageRecordColumns);
  return { status: "stored", image: image! };
}

export async function attachMessageImages(database: Database, target: MessageImageTarget, imageIds: string[]) {
  if (!imageIds.length) return;
  await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${target.taskId}, ${TASK_LOCK_SPACE}))`);
  const staged = and(inArray(taskImages.id, imageIds), isNull(taskImages.taskId), eq(taskImages.projectId, target.projectId), eq(taskImages.uploadedByUserId, target.actorUserId));
  const attached = await database.update(taskImages).set({ taskId: target.taskId, messageId: target.messageId }).where(staged).returning({ id: taskImages.id });
  if (attached.length !== imageIds.length) throw new TaskError("attachment_unavailable");
  const [stored] = await database.select({ total: count() }).from(taskImages).where(eq(taskImages.taskId, target.taskId));
  if ((stored?.total ?? 0) > MAX_TASK_IMAGES) throw new TaskError("image_limit");
}

export async function messageImageIds(database: Database, messageIds: string[]) {
  const byMessage = new Map<string, string[]>();
  if (!messageIds.length) return byMessage;
  const rows = await database.select({ id: taskImages.id, messageId: sql<string>`${taskImages.messageId}` }).from(taskImages).where(inArray(taskImages.messageId, messageIds)).orderBy(asc(taskImages.createdAt), asc(taskImages.id));
  for (const row of rows) byMessage.set(row.messageId, [...(byMessage.get(row.messageId) ?? []), row.id]);
  return byMessage;
}

export function withImageIds(parts: unknown[], imageIds: string[]) {
  return imageIds.length ? [...parts, imageIds] : parts;
}
