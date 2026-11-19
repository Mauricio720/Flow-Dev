import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../client";
import { projectCompozyBindings } from "../../schema";
import type { BindingState, BindingWrite, ProjectCompozyBinding, ProjectCompozyBindingDao } from "../../../../application/database/dao/projectCompozyBindingDao";

type BindingRow = typeof projectCompozyBindings.$inferSelect;

export class DrizzleProjectCompozyBindingDao implements ProjectCompozyBindingDao {
  constructor(private readonly database: Database) {}

  async find(projectId: string) {
    const [row] = await this.database.select().from(projectCompozyBindings).where(eq(projectCompozyBindings.projectId, projectId)).limit(1);
    return row ? toBinding(row) : null;
  }

  async insert(write: BindingWrite) {
    const [row] = await this.database.insert(projectCompozyBindings).values({ ...columns(write), projectId: write.projectId }).onConflictDoNothing({ target: projectCompozyBindings.projectId }).returning();
    return row ? toBinding(row) : null;
  }

  async update(write: BindingWrite, expectedRevision: number) {
    const [row] = await this.database.update(projectCompozyBindings)
      .set({ ...columns(write), revision: sql`${projectCompozyBindings.revision} + 1`, updatedAt: sql`now()` })
      .where(and(eq(projectCompozyBindings.projectId, write.projectId), eq(projectCompozyBindings.revision, expectedRevision)))
      .returning();
    return row ? toBinding(row) : null;
  }
}

function columns(write: BindingWrite) {
  return { checkoutPath: write.checkoutPath, compozyWorkspaceId: write.compozyWorkspaceId, state: write.state, failureCode: write.failureCode, defaultBranch: write.defaultBranch, checkedAt: write.checkedAt, updatedBy: write.actorId };
}

function toBinding(row: BindingRow): ProjectCompozyBinding {
  return { projectId: row.projectId, checkoutPath: row.checkoutPath, compozyWorkspaceId: row.compozyWorkspaceId, state: row.state as BindingState, failureCode: row.failureCode, defaultBranch: row.defaultBranch, revision: row.revision, checkedAt: row.checkedAt, updatedBy: row.updatedBy };
}
