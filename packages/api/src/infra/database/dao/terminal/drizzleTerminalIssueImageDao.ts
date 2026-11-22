import { and, eq, inArray } from "drizzle-orm";
import type { TerminalIssueImageDao } from "../../../../application/database/dao/terminalIssueImageDao";
import { UUID_PATTERN } from "../../../../application/terminal/uuidPattern";
import type { Database } from "../../client";
import { taskImages } from "../../schema";

export class DrizzleTerminalIssueImageDao implements TerminalIssueImageDao {
  constructor(private readonly database: Database) {}

  async summaries(taskId: string, imageIds: string[]) {
    const ids = imageIds.filter((imageId) => UUID_PATTERN.test(imageId));
    if (ids.length === 0) return [];
    const columns = { id: taskImages.id, contentType: taskImages.contentType, byteSize: taskImages.byteSize, sha256: taskImages.sha256 };
    return this.database.select(columns).from(taskImages).where(and(eq(taskImages.taskId, taskId), inArray(taskImages.id, ids)));
  }

  async content(taskId: string, imageId: string) {
    if (!UUID_PATTERN.test(imageId)) return null;
    const filter = and(eq(taskImages.taskId, taskId), eq(taskImages.id, imageId));
    const [row] = await this.database.select({ content: taskImages.content }).from(taskImages).where(filter).limit(1);
    return row?.content ?? null;
  }
}
