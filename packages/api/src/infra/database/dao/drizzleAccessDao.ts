import { and, asc, count, eq, gt, ilike, or, type SQL } from "drizzle-orm";
import type { AccessDao, UserRecord } from "../../../application/database/dao/accessDao";
import type { Page, ProjectRecord } from "../../../application/database/dao/projectDao";
import { decodeCursor, encodeCursor } from "../../../application/pagination/cursor";
import type { Database } from "../client";
import { accounts, adminDesignations, projectAssignments, projects, users } from "../schema";

const githubAccounts = and(eq(accounts.providerId, "github"), eq(accounts.userId, users.id));

export class DrizzleAccessDao implements AccessDao {
  constructor(private readonly database: Database) {}

  async findUser(id: string) {
    const rows = await this.userQuery([eq(users.id, id)]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async listUsers(query: { search?: string; cursor?: string }): Promise<Page<UserRecord>> {
    const filters: SQL[] = [];
    if (query.search) filters.push(or(ilike(users.name, "%" + query.search + "%"), ilike(users.displayName, "%" + query.search + "%")) as SQL);
    const cursor = decodeCursor(query.cursor);
    if (cursor) filters.push(or(gt(users.name, cursor.key), and(eq(users.name, cursor.key), gt(users.id, cursor.id ?? ""))) as SQL);
    const rows = await this.userQuery(filters, 51);
    const items = rows.slice(0, 50).map(toUser);
    return { items, nextCursor: rows.length > 50 ? encodeCursor({ key: items.at(-1)?.githubLogin ?? "", id: items.at(-1)?.id }) : null };
  }

  async isAdmin(userId: string) {
    const row = (await this.database.select({ id: adminDesignations.githubUserId }).from(adminDesignations)
      .innerJoin(accounts, and(eq(accounts.accountId, adminDesignations.githubUserId), eq(accounts.providerId, "github")))
      .where(eq(accounts.userId, userId)).limit(1).for("update"))[0];
    return !!row;
  }

  async listAssignments(userId: string, cursor?: string): Promise<Page<ProjectRecord>> {
    const filters: SQL[] = [eq(projectAssignments.userId, userId)];
    const decoded = decodeCursor(cursor);
    if (decoded) filters.push(gt(projects.externalKey, decoded.key));
    const rows = await this.database.select({ project: projects }).from(projectAssignments)
      .innerJoin(projects, eq(projectAssignments.projectId, projects.id)).where(and(...filters))
      .orderBy(asc(projects.externalKey)).limit(51);
    const items = rows.slice(0, 50).map((row) => row.project);
    return { items, nextCursor: rows.length > 50 ? encodeCursor({ key: items.at(-1)?.externalKey ?? "" }) : null };
  }

  async hasAssignment(userId: string, projectId: string) {
    return (await this.database.select({ userId: projectAssignments.userId }).from(projectAssignments)
      .where(and(eq(projectAssignments.userId, userId), eq(projectAssignments.projectId, projectId))).limit(1)).length > 0;
  }

  async findProject(projectId: string) {
    return (await this.database.select().from(projects).where(eq(projects.id, projectId)).limit(1))[0] ?? null;
  }

  async assign(userId: string, projectId: string, createdBy: string) {
    await this.database.insert(projectAssignments).values({ userId, projectId, createdByUserId: createdBy }).onConflictDoNothing();
  }

  async remove(userId: string, projectId: string) {
    const result = await this.database.delete(projectAssignments).where(and(eq(projectAssignments.userId, userId), eq(projectAssignments.projectId, projectId)));
    return result.count > 0;
  }

  async replaceAdmins(ids: Array<{ githubUserId: string; resolvedLogin: string }>) {
    await this.database.transaction(async (tx) => {
      await tx.delete(adminDesignations);
      if (ids.length) await tx.insert(adminDesignations).values(ids);
    });
  }

  async transaction<T>(callback: (dao: AccessDao) => Promise<T>): Promise<T> {
    return this.database.transaction((tx): Promise<T> => callback(new DrizzleAccessDao(tx as unknown as Database)));
  }

  private userQuery(filters: SQL[], limit = 1) {
    return this.database.select({
      id: users.id, name: users.name, displayName: users.displayName, image: users.image, lastProjectId: users.lastProjectId,
      githubId: accounts.accountId, assignmentCount: count(projectAssignments.projectId).mapWith(Number),
    }).from(users).innerJoin(accounts, githubAccounts).leftJoin(projectAssignments, eq(projectAssignments.userId, users.id))
      .where(filters.length ? and(...filters) : undefined).groupBy(users.id, users.name, users.displayName, users.image, users.lastProjectId, accounts.accountId)
      .orderBy(asc(users.name), asc(users.id)).limit(limit);
  }
}

function toUser(row: Awaited<ReturnType<DrizzleAccessDao["userQuery"]>>[number]): UserRecord {
  return { id: row.id, githubId: row.githubId, githubLogin: row.name, displayName: row.displayName ?? undefined, avatarUrl: row.image ?? undefined, lastProjectId: row.lastProjectId, assignmentCount: row.assignmentCount };
}
