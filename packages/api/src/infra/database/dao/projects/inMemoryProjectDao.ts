import type { ImportedProjectInput, Page, ProjectDao, ProjectRecord, RepositoryIdentity, VerifiedProjectInput, VersionedProjectEdit } from "../../../../application/database/dao/projectDao";
import type { ProjectBoard } from "../../../../application/github/projectBoardGateway";
import { decodeCursor, encodeCursor } from "../../../../application/pagination/cursor";
import { ProjectConflictError } from "../../../../application/services/projects/projectErrors";

const DEMO_ID = "00000000-0000-4000-8000-000000000001";

export class InMemoryProjectDao implements ProjectDao {
  private readonly projects = new Map<string, ProjectRecord>([[DEMO_ID, {
    id: DEMO_ID, externalKey: "flow-dev-demo", name: "Flow Dev", description: "Monorepo Next.js + tRPC",
    isDemo: true, createdAt: new Date(), updatedAt: new Date(),
  }]]);
  private readonly selections = new Map<string, string>();

  async list() {
    return [...this.projects.values()].sort((a, b) => a.externalKey.localeCompare(b.externalKey));
  }

  async findByExternalKey(externalKey: string) {
    return [...this.projects.values()].find((project) => project.externalKey === externalKey) ?? null;
  }

  async upsertVerified(input: ImportedProjectInput) {
    const current = await this.findByExternalKey(input.externalKey);
    if (current && current.repository?.githubId !== undefined && current.repository.githubId !== input.repository.githubId) {
      throw new ProjectConflictError("External key is linked to another repository", current.id);
    }
    const now = new Date();
    const record: ProjectRecord = {
      id: current?.id ?? crypto.randomUUID(),
      externalKey: input.externalKey,
      name: input.name,
      description: input.description,
      isDemo: input.isDemo ?? current?.isDemo ?? false,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      repository: input.repository,
      repositoryVerifiedAt: now,
      detailsVersion: current?.detailsVersion ?? 1,
    };
    this.projects.set(record.id, record);
    return { record, inserted: !current };
  }

  async findByRepositoryId(githubRepositoryId: string) { return [...this.projects.values()].find((project) => project.repository?.githubId === githubRepositoryId) ?? null; }
  async insertVerified(input: VerifiedProjectInput) { const now = new Date(); const record: ProjectRecord = { id: crypto.randomUUID(), externalKey: `project-${crypto.randomUUID()}`, name: input.name, description: input.description, isDemo: input.isDemo ?? false, createdAt: now, updatedAt: now, repository: input.repository, repositoryVerifiedAt: now, detailsVersion: 1 }; this.projects.set(record.id, record); return record; }
  async updateDetails(input: VersionedProjectEdit) { const current = this.projects.get(input.projectId); if (!current || current.detailsVersion !== input.expectedVersion) return null; const record = { ...current, name: input.name, description: input.description, detailsVersion: (current.detailsVersion ?? 1) + 1, updatedAt: new Date() }; this.projects.set(record.id, record); return record; }
  async updateRepositoryLabel(repository: RepositoryIdentity) { const current = await this.findByRepositoryId(repository.githubId); if (current) this.projects.set(current.id, { ...current, repository, repositoryVerifiedAt: new Date(), updatedAt: new Date() }); }
  async updateBoard(projectId: string, board: ProjectBoard | null) { const current = this.projects.get(projectId); if (!current) return null; const record = { ...current, board, updatedAt: new Date() }; this.projects.set(projectId, record); return record; }

  async listVisible(_userId: string, query: { search?: string; cursor?: string }) {
    const all = await this.filtered(query.search);
    return this.page(all, query.cursor);
  }

  async findAuthorized(_userId: string, projectId: string) {
    return this.projects.get(projectId) ?? null;
  }

  async findById(projectId: string) {
    return this.projects.get(projectId) ?? null;
  }

  async setLastSelected(userId: string, projectId: string) {
    this.selections.set(userId, projectId);
  }

  async transaction<T>(callback: (dao: ProjectDao) => Promise<T>): Promise<T> {
    const snapshot = new Map(this.projects);
    const selections = new Map(this.selections);
    try {
      return await callback(this);
    } catch (error) {
      this.projects.clear();
      snapshot.forEach((project, id) => this.projects.set(id, project));
      this.selections.clear();
      selections.forEach((projectId, userId) => this.selections.set(userId, projectId));
      throw error;
    }
  }

  private async filtered(search?: string) {
    const all = await this.list();
    return search ? all.filter((project) => (project.externalKey + " " + project.name).toLowerCase().includes(search.toLowerCase())) : all;
  }

  private page(items: ProjectRecord[], value?: string): Page<ProjectRecord> {
    const cursor = decodeCursor(value);
    const start = cursor ? items.findIndex((item) => item.externalKey === cursor.key) + 1 : 0;
    const page = items.slice(start, start + 50);
    return { items: page, nextCursor: items.length > start + page.length ? encodeCursor({ key: page.at(-1)?.externalKey ?? "" }) : null };
  }
}
