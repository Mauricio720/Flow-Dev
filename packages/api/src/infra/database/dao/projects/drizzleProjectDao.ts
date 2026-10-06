import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import type { Database } from "../../client";
import { projectAssignments, projects, users } from "../../schema";
import type { ProjectDao, ProjectActor, CatalogQuery, RepositoryIdentity, VerifiedProjectInput, VersionedProjectEdit, ImportedProjectInput } from "../../../../application/database/dao/projectDao";
import type { ProjectBoard } from "../../../../application/github/projectBoardGateway";
import { actorId } from "../../../../application/database/dao/projectDao";
import { ProjectConflictError } from "../../../../application/services/projects/projectErrors";
import { isUniqueViolation, toRecord, valuesFor } from "./projectRecordMapper";
import { listPage, pageFilters } from "./projectPage";

export class DrizzleProjectDao implements ProjectDao {
  constructor(private readonly database: Database) {}

  async list() {
    const rows = await this.database.select().from(projects).orderBy(asc(projects.createdAt), asc(projects.id));
    return rows.map(toRecord);
  }

  async findByExternalKey(externalKey: string) {
    const row = (await this.database.select().from(projects).where(eq(projects.externalKey, externalKey)).limit(1))[0];
    return row ? toRecord(row) : null;
  }

  async findByRepositoryId(githubRepositoryId: string) {
    const row = (await this.database.select().from(projects).where(eq(projects.githubRepositoryId, githubRepositoryId)).limit(1))[0];
    return row ? toRecord(row) : null;
  }

  async listVisible(actor: ProjectActor, query: CatalogQuery, isAdmin = false) {
    return listPage(this.database, pageFilters(query, actorId(actor), isAdmin), { isAdmin, pageSize: query.limit });
  }

  async findVisible(actor: ProjectActor, projectId: string, isAdmin = false) {
    const filters: SQL[] = [eq(projects.id, projectId)];
    if (!isAdmin) filters.push(eq(projectAssignments.userId, actorId(actor)));
    const query = this.database.select({ project: projects }).from(projects);
    const joined = isAdmin ? query : query.innerJoin(projectAssignments, eq(projectAssignments.projectId, projects.id));
    const rows = await joined.where(and(...filters)).limit(1);
    return rows[0] ? toRecord(rows[0].project) : null;
  }

  async findById(projectId: string) {
    const row = (await this.database.select().from(projects).where(eq(projects.id, projectId)).limit(1))[0];
    return row ? toRecord(row) : null;
  }

  async findAuthorized(userId: string, projectId: string) { return this.findVisible(userId, projectId, false); }

  async setLastSelected(userId: string, projectId: string) {
    await this.database.update(users).set({ lastProjectId: projectId, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async insertVerified(input: VerifiedProjectInput) {
    const id = crypto.randomUUID();
    try {
      const [row] = await this.database.insert(projects).values(valuesFor(input, id)).returning();
      if (!row) throw new Error("Project insert failed");
      return toRecord(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ProjectConflictError("Project identity already exists", (await this.findByRepositoryId(input.repository.githubId))?.id);
      throw error;
    }
  }

  async upsertVerified(input: ImportedProjectInput) {
    const current = await this.findByExternalKey(input.externalKey);
    if (current && current.repository?.githubId !== input.repository.githubId) throw new ProjectConflictError("External key is linked to another repository", current.id);
    if (current) {
      const [row] = await this.database.update(projects).set({ name: input.name, description: input.description, isDemo: input.isDemo ?? current.isDemo, githubNodeId: input.repository.nodeId, repositoryOwner: input.repository.owner, repositoryName: input.repository.name, repositoryVisibility: input.repository.visibility, repositoryArchived: input.repository.archived, repositoryVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(projects.externalKey, input.externalKey)).returning();
      if (!row) throw new Error("Project import update failed");
      return { record: toRecord(row), inserted: false };
    }
    const id = crypto.randomUUID();
    const [row] = await this.database.insert(projects).values({ ...valuesFor(input, id), externalKey: input.externalKey }).returning();
    if (!row) throw new Error("Project import insert failed");
    return { record: toRecord(row), inserted: true };
  }

  async updateDetails(input: VersionedProjectEdit) {
    try {
      const [row] = await this.database.update(projects).set({ name: input.name, description: input.description, detailsVersion: sql`${projects.detailsVersion} + 1`, updatedAt: new Date() }).where(and(eq(projects.id, input.projectId), eq(projects.detailsVersion, input.expectedVersion))).returning();
      return row ? toRecord(row) : null;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ProjectConflictError("Project name already exists");
      throw error;
    }
  }

  async updateRepositoryLabel(repository: RepositoryIdentity) {
    await this.database.update(projects).set({ githubNodeId: repository.nodeId, repositoryOwner: repository.owner, repositoryName: repository.name, repositoryVisibility: repository.visibility, repositoryArchived: repository.archived, repositoryVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(projects.githubRepositoryId, repository.githubId));
  }

  async updateBoard(projectId: string, board: ProjectBoard | null) {
    const [row] = await this.database.update(projects).set({ githubProjectNodeId: board?.nodeId ?? null, githubProjectUrl: board?.url ?? null, githubProjectTitle: board?.title ?? null, updatedAt: new Date() }).where(eq(projects.id, projectId)).returning();
    return row ? toRecord(row) : null;
  }

  async transaction<T>(callback: (dao: ProjectDao) => Promise<T>): Promise<T> { return this.database.transaction((tx) => callback(new DrizzleProjectDao(tx as unknown as Database))); }
}
