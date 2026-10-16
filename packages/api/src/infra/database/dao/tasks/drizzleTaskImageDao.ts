import { and, count, eq, inArray, sql } from "drizzle-orm";
import type { TaskImageDao, TaskImageInput, TaskImageRecord, TaskImageStored } from "../../../../application/database/dao/taskImageDao";
import { taskImages } from "../../schema";
import type { Database } from "../../client";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const recordColumns = { id: taskImages.id, taskId: taskImages.taskId, projectId: taskImages.projectId, contentType: taskImages.contentType, byteSize: taskImages.byteSize, sha256: taskImages.sha256, createdAt: taskImages.createdAt };

export class DrizzleTaskImageDao implements TaskImageDao {
  constructor(private readonly database: Database) {}

  async store(input: TaskImageInput, limit: number): Promise<TaskImageStored> {
    return this.database.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.taskId}, 2))`);
      const [existing] = await tx.select(recordColumns).from(taskImages).where(and(eq(taskImages.taskId, input.taskId), eq(taskImages.sha256, input.sha256))).limit(1);
      if (existing) return { status: "stored", image: existing };
      const [stored] = await tx.select({ total: count() }).from(taskImages).where(eq(taskImages.taskId, input.taskId));
      if ((stored?.total ?? 0) >= limit) return { status: "limit_reached" };
      const [image] = await tx.insert(taskImages).values({ ...input, byteSize: input.content.byteLength }).returning(recordColumns);
      return { status: "stored", image: image! };
    });
  }

  async find(imageId: string): Promise<TaskImageRecord | null> {
    if (!UUID_PATTERN.test(imageId)) return null;
    const [image] = await this.database.select(recordColumns).from(taskImages).where(eq(taskImages.id, imageId)).limit(1);
    return image ?? null;
  }

  async content(imageId: string) {
    if (!UUID_PATTERN.test(imageId)) return null;
    const [row] = await this.database.select({ content: taskImages.content }).from(taskImages).where(eq(taskImages.id, imageId)).limit(1);
    return row?.content ?? null;
  }

  async forTask(taskId: string, imageIds: string[]) {
    const validIds = imageIds.filter((imageId) => UUID_PATTERN.test(imageId));
    if (!validIds.length) return [];
    return this.database.select(recordColumns).from(taskImages).where(and(eq(taskImages.taskId, taskId), inArray(taskImages.id, validIds)));
  }
}
