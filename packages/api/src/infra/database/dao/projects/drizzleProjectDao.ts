import { and, asc, eq, gt, ilike, or } from "drizzle-orm";
import type { Database } from "../../client";
import { projects } from "../../schema";
import type { Page, ProjectDao, ProjectRecord } from "../../../../application/database/dao/projectDao";

export class DrizzleProjectDao implements ProjectDao {
  constructor(private readonly database: Database) {}
  async list() { return this.database.select().from(projects).orderBy(asc(projects.externalKey)); }
  async findByExternalKey(externalKey: string) { return (await this.database.select().from(projects).where(eq(projects.externalKey, externalKey)).limit(1))[0] ?? null; }
  async upsert(input: { externalKey: string; name: string; description?: string; isDemo?: boolean }) { const current = await this.findByExternalKey(input.externalKey); if (current) { const [record] = await this.database.update(projects).set({ name: input.name, description: input.description ?? null, isDemo: input.isDemo ?? current.isDemo, updatedAt: new Date() }).where(eq(projects.id, current.id)).returning(); if (!record) throw new Error("Project update failed"); return { record, inserted: false }; } const [record] = await this.database.insert(projects).values({ externalKey: input.externalKey, name: input.name, description: input.description ?? null, isDemo: input.isDemo ?? false }).returning(); if (!record) throw new Error("Project insert failed"); return { record, inserted: true }; }
  async listVisible(_userId: string, query: { search?: string; cursor?: string }): Promise<Page<ProjectRecord>> { const clauses = []; if (query.search) clauses.push(or(ilike(projects.externalKey, `%${query.search}%`), ilike(projects.name, `%${query.search}%`))); if (query.cursor) clauses.push(gt(projects.externalKey, query.cursor)); const items = await this.database.select().from(projects).where(and(...clauses)).orderBy(asc(projects.externalKey)).limit(51); return { items: items.slice(0, 50), nextCursor: items[50]?.externalKey ?? null }; }
  async findAuthorized(_userId: string, projectId: string) { return (await this.database.select().from(projects).where(eq(projects.id, projectId)).limit(1))[0] ?? null; }
  async setLastSelected(_userId: string, _projectId: string) { return undefined; }
}
