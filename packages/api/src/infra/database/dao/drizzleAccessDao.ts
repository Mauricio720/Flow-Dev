import { and, asc, eq, ilike, or } from "drizzle-orm";
import type { AccessDao, UserRecord } from "../../../application/database/dao/accessDao";
import type { Page, ProjectRecord } from "../../../application/database/dao/projectDao";
import type { Database } from "../client";
import { accounts, adminDesignations, projectAssignments, projects, users } from "../schema";

export class DrizzleAccessDao implements AccessDao {
  constructor(private readonly database: Database) {}
  async findUser(id: string) { const row = (await this.database.select().from(users).where(eq(users.id, id)).limit(1))[0]; return row ? toUser(row) : null; }
  async listUsers(query: { search?: string; cursor?: string }): Promise<Page<UserRecord>> { const rows = await this.database.select().from(users).where(query.search ? or(ilike(users.name, `%${query.search}%`), ilike(users.displayName, `%${query.search}%`)) : undefined).orderBy(asc(users.name)).limit(51); const offset = query.cursor ? Number(query.cursor) : 0; const items = rows.slice(offset, offset + 50).map(toUser); return { items, nextCursor: rows[offset + items.length] ? String(offset + items.length) : null }; }
  async isAdmin(userId: string) { const row = (await this.database.select({ githubId: adminDesignations.githubUserId }).from(adminDesignations).innerJoin(accounts, and(eq(accounts.accountId, adminDesignations.githubUserId), eq(accounts.providerId, "github"))).where(eq(accounts.userId, userId)).limit(1))[0]; return !!row; }
  async listAssignments(userId: string, cursor?: string): Promise<Page<ProjectRecord>> { const rows = await this.database.select({ project: projects }).from(projectAssignments).innerJoin(projects, eq(projectAssignments.projectId, projects.id)).where(eq(projectAssignments.userId, userId)).orderBy(asc(projects.externalKey)).limit(51); const offset = cursor ? Number(cursor) : 0; const items = rows.slice(offset, offset + 50).map((row) => row.project); return { items, nextCursor: rows[offset + items.length] ? String(offset + items.length) : null }; }
  async hasAssignment(userId: string, projectId: string) { return (await this.database.select().from(projectAssignments).where(and(eq(projectAssignments.userId, userId), eq(projectAssignments.projectId, projectId))).limit(1)).length > 0; }
  async assign(userId: string, projectId: string, createdBy: string) { await this.database.insert(projectAssignments).values({ userId, projectId, createdByUserId: createdBy }).onConflictDoNothing(); }
  async remove(userId: string, projectId: string) { const result = await this.database.delete(projectAssignments).where(and(eq(projectAssignments.userId, userId), eq(projectAssignments.projectId, projectId))); return result.count > 0; }
  async replaceAdmins(ids: Array<{ githubUserId: string; resolvedLogin: string }>) { await this.database.transaction(async (tx) => { await tx.delete(adminDesignations); if (ids.length) await tx.insert(adminDesignations).values(ids); }); }
}
function toUser(row: typeof users.$inferSelect): UserRecord { return { id: row.id, githubId: "", githubLogin: row.name, displayName: row.displayName ?? undefined, avatarUrl: row.image ?? undefined, lastProjectId: row.lastProjectId }; }
