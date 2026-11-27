import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "../../client";
import { taskImages } from "../../schema";

export async function findTaskImageMetadata(database: Database, input: { taskId: string; ids: string[] }): Promise<Array<{ id: string; messageId: string | null; contentType: string; byteSize: number; createdAt: Date }>> {
  if (!input.ids.length) return [];
  return database.select({ id: taskImages.id, messageId: taskImages.messageId, contentType: taskImages.contentType, byteSize: taskImages.byteSize, createdAt: taskImages.createdAt })
    .from(taskImages)
    .where(and(eq(taskImages.taskId, input.taskId), inArray(taskImages.id, input.ids)));
}

export async function readTaskImageContents(database: Database, input: { taskId: string; ids: string[] }): Promise<Map<string, Uint8Array>> {
  if (!input.ids.length) return new Map();
  const rows = await database.select({ id: taskImages.id, content: taskImages.content })
    .from(taskImages)
    .where(and(eq(taskImages.taskId, input.taskId), inArray(taskImages.id, input.ids)));
  return new Map(rows.map(({ id, content }) => [id, content]));
}
