import type { Page, ProjectDao, ProjectRecord } from "../../../../application/database/dao/projectDao";

const DEMO_ID = "00000000-0000-4000-8000-000000000001";
const projects = new Map<string, ProjectRecord>([[DEMO_ID, { id: DEMO_ID, externalKey: "flow-dev-demo", name: "Flow Dev", description: "Monorepo Next.js + tRPC", isDemo: true, createdAt: new Date(), updatedAt: new Date() }]]);

export class InMemoryProjectDao implements ProjectDao {
  async list() { return [...projects.values()].sort((a, b) => a.externalKey.localeCompare(b.externalKey)); }
  async findByExternalKey(externalKey: string) { return [...projects.values()].find((project) => project.externalKey === externalKey) ?? null; }
  async upsert(input: { externalKey: string; name: string; description?: string; isDemo?: boolean }) {
    const current = await this.findByExternalKey(input.externalKey);
    if (current) {
      const record = { ...current, name: input.name, description: input.description ?? null, isDemo: input.isDemo ?? current.isDemo, updatedAt: new Date() };
      projects.set(record.id, record);
      return { record, inserted: false };
    }
    const now = new Date();
    const record = { id: crypto.randomUUID(), externalKey: input.externalKey, name: input.name, description: input.description ?? null, isDemo: input.isDemo ?? false, createdAt: now, updatedAt: now };
    projects.set(record.id, record);
    return { record, inserted: true };
  }
  async listVisible(_userId: string, query: { search?: string; cursor?: string }): Promise<Page<ProjectRecord>> {
    const all = (await this.list()).filter((project) => !query.search || `${project.externalKey} ${project.name}`.toLowerCase().includes(query.search.toLowerCase()));
    const start = query.cursor ? all.findIndex((item) => item.externalKey === query.cursor) + 1 : 0;
    const items = all.slice(start, start + 50);
    return { items, nextCursor: all[start + 50]?.externalKey ?? null };
  }
  async findAuthorized(_userId: string, projectId: string) { return projects.get(projectId) ?? null; }
  async setLastSelected(_userId: string, _projectId: string) { return undefined; }
}
