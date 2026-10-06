import { and, asc, eq, gt, ilike, or, sql, type SQL } from "drizzle-orm";
import type { Database } from "../../client";
import { projectAssignments, projects } from "../../schema";
import { decodeCursor, encodeCursor } from "../../../../application/pagination/cursor";
import type { CatalogQuery, Page, ProjectRecord } from "../../../../application/database/dao/projectDao";
import { toRecord } from "./projectRecordMapper";

export function pageFilters(query: CatalogQuery, userId: string, isAdmin: boolean) {
  const filters: SQL[] = [];
  if (!isAdmin) filters.push(eq(projectAssignments.userId, userId));
  if (query.search) filters.push(or(ilike(projects.name, `%${query.search}%`), ilike(projects.repositoryOwner, `%${query.search}%`), ilike(projects.repositoryName, `%${query.search}%`), ilike(sql`${projects.repositoryOwner} || '/' || ${projects.repositoryName}`, `%${query.search}%`)) as SQL);
  const cursor = decodeCursor(query.cursor);
  if (cursor?.id && !Number.isNaN(Date.parse(cursor.key))) filters.push(or(sql`${projects.createdAt} > ${cursor.key}::timestamptz`, and(sql`${projects.createdAt} = ${cursor.key}::timestamptz`, gt(projects.id, cursor.id))) as SQL);
  return filters;
}
export async function listPage(database: Database, filters: SQL[], options: { isAdmin: boolean; pageSize?: number }): Promise<Page<ProjectRecord>> {
  const query = database.select({ project: projects, cursorKey: sql<string>`${projects.createdAt}::text` }).from(projects);
  const joined = options.isAdmin ? query : query.innerJoin(projectAssignments, eq(projectAssignments.projectId, projects.id));
  const rows = await joined.where(filters.length ? and(...filters) : undefined).orderBy(asc(projects.createdAt), asc(projects.id)).limit((options.pageSize ?? 50) + 1);
  const page = rows.slice(0, options.pageSize ?? 50);
  const items = page.map((row) => toRecord(row.project));
  const last = items.at(-1);
  return { items, nextCursor: rows.length > (options.pageSize ?? 50) && last ? encodeCursor({ key: page.at(-1)?.cursorKey ?? last.createdAt.toISOString(), id: last.id }) : null };
}
