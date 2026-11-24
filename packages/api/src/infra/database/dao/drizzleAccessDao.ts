import { and, asc, eq, gt, ilike, or, type SQL } from "drizzle-orm";
import { CREDENTIAL_PROVIDER_ID, GITHUB_PROVIDER_ID, GOOGLE_PROVIDER_ID } from "../../../application/auth/providerIds";
import type { AccessDao, LinkedMethods, UserRecord } from "../../../application/database/dao/accessDao";
import type { Page, ProjectRecord } from "../../../application/database/dao/projectDao";
import { decodeCursor, encodeCursor } from "../../../application/pagination/cursor";
import type { Database } from "../client";
import { accounts, adminDesignations, projectAssignments, projects, users } from "../schema";
import { selectUsers, toUser } from "./drizzleUserQuery";

const PAGE_SIZE = 50;

export class DrizzleAccessDao implements AccessDao {
  constructor(private readonly database: Database) {}

  async findUser(id: string) {
    const rows = await selectUsers(this.database, [eq(users.id, id)], 1);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findLinkedMethods(userId: string): Promise<LinkedMethods> {
    const rows = await this.database.select({ providerId: accounts.providerId }).from(accounts).where(eq(accounts.userId, userId));
    const providers = new Set(rows.map((row) => row.providerId));
    return { github: providers.has(GITHUB_PROVIDER_ID), google: providers.has(GOOGLE_PROVIDER_ID), password: providers.has(CREDENTIAL_PROVIDER_ID) };
  }

  async listUsers(query: { search?: string; cursor?: string }): Promise<Page<UserRecord>> {
    const filters: SQL[] = [];
    if (query.search) filters.push(or(ilike(users.name, "%" + query.search + "%"), ilike(users.displayName, "%" + query.search + "%")) as SQL);
    const cursor = decodeCursor(query.cursor);
    if (cursor) filters.push(or(gt(users.name, cursor.key), and(eq(users.name, cursor.key), gt(users.id, cursor.id ?? ""))) as SQL);
    const rows = await selectUsers(this.database, filters, PAGE_SIZE + 1);
    const page = rows.slice(0, PAGE_SIZE);
    const last = page.at(-1);
    return { items: page.map(toUser), nextCursor: rows.length > PAGE_SIZE && last ? encodeCursor({ key: last.name, id: last.id }) : null };
  }

  async isAdmin(userId: string) {
    const row = (await this.database.select({ id: adminDesignations.githubUserId }).from(adminDesignations)
      .innerJoin(accounts, and(eq(accounts.accountId, adminDesignations.githubUserId), eq(accounts.providerId, GITHUB_PROVIDER_ID)))
      .where(eq(accounts.userId, userId)).limit(1).for("update"))[0];
    return !!row;
  }

  async listAssignments(userId: string, cursor?: string): Promise<Page<ProjectRecord>> {
    const filters: SQL[] = [eq(projectAssignments.userId, userId)];
    const decoded = decodeCursor(cursor);
    if (decoded) filters.push(gt(projects.externalKey, decoded.key));
    const rows = await this.database.select({ project: projects }).from(projectAssignments)
      .innerJoin(projects, eq(projectAssignments.projectId, projects.id)).where(and(...filters))
      .orderBy(asc(projects.externalKey)).limit(PAGE_SIZE + 1);
    const items = rows.slice(0, PAGE_SIZE).map((row) => row.project);
    return { items, nextCursor: rows.length > PAGE_SIZE ? encodeCursor({ key: items.at(-1)?.externalKey ?? "" }) : null };
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
}
