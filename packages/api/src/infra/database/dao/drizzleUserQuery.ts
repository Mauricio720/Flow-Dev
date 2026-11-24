import { and, asc, count, eq, type SQL } from "drizzle-orm";
import { GITHUB_PROVIDER_ID } from "../../../application/auth/providerIds";
import type { UserRecord } from "../../../application/database/dao/accessDao";
import type { Database } from "../client";
import { accounts, projectAssignments, users } from "../schema";

const githubAccounts = and(eq(accounts.providerId, GITHUB_PROVIDER_ID), eq(accounts.userId, users.id));

export function selectUsers(database: Database, filters: SQL[], limit: number) {
  return database.select({
    id: users.id, name: users.name, displayName: users.displayName, email: users.email, image: users.image, lastProjectId: users.lastProjectId,
    githubId: accounts.accountId, assignmentCount: count(projectAssignments.projectId).mapWith(Number),
  }).from(users).leftJoin(accounts, githubAccounts).leftJoin(projectAssignments, eq(projectAssignments.userId, users.id))
    .where(filters.length ? and(...filters) : undefined)
    .groupBy(users.id, users.name, users.displayName, users.email, users.image, users.lastProjectId, accounts.accountId)
    .orderBy(asc(users.name), asc(users.id)).limit(limit);
}

export type UserRow = Awaited<ReturnType<typeof selectUsers>>[number];

export function toUser(row: UserRow): UserRecord {
  const hasGithub = row.githubId !== null;
  return {
    id: row.id, githubId: row.githubId, githubLogin: hasGithub ? row.name : null, email: hasGithub ? null : row.email,
    displayName: row.displayName ?? (hasGithub ? undefined : row.name), avatarUrl: row.image ?? undefined,
    lastProjectId: row.lastProjectId, assignmentCount: row.assignmentCount,
  };
}
