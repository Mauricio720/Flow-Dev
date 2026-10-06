import type { SessionPrincipal } from "../../../context";
import type { ProjectBoard } from "../../github/projectBoardGateway";

export type RepositoryVisibility = "public" | "private" | "internal";
export type RepositoryIdentity = { githubId: string; nodeId: string; owner: string; name: string; visibility: RepositoryVisibility; archived: boolean };
export type ProjectRecord = { id: string; externalKey: string; name: string; description: string | null; isDemo: boolean; createdAt: Date; updatedAt?: Date; repository?: RepositoryIdentity; repositoryVerifiedAt?: Date | null; detailsVersion?: number; board?: ProjectBoard | null };
export type Page<T> = { items: T[]; nextCursor: string | null };
export type CatalogQuery = { search?: string; cursor?: string; limit?: number };
export type VerifiedProjectInput = { name: string; description: string | null; repository: RepositoryIdentity; isDemo?: boolean };
export type ImportedProjectInput = VerifiedProjectInput & { externalKey: string };
export type VersionedProjectEdit = { projectId: string; name: string; description: string | null; expectedVersion: number };
export type ProjectActor = string | SessionPrincipal;

export interface ProjectDao {
  listVisible?(actor: ProjectActor, query: CatalogQuery, isAdmin?: boolean): Promise<Page<ProjectRecord>>;
  listAssigned?(userId: string, query: { search?: string; cursor?: string }): Promise<Page<ProjectRecord>>;
  findById?(projectId: string): Promise<ProjectRecord | null>;
  findAuthorized?(userId: string, projectId: string): Promise<ProjectRecord | null>;
  findVisible?(actor: ProjectActor, projectId: string, isAdmin?: boolean): Promise<ProjectRecord | null>;
  findByRepositoryId?(githubRepositoryId: string): Promise<ProjectRecord | null>;
  insertVerified?(input: VerifiedProjectInput): Promise<ProjectRecord>;
  upsertVerified?(input: ImportedProjectInput): Promise<{ record: ProjectRecord; inserted: boolean }>;
  updateDetails?(input: VersionedProjectEdit): Promise<ProjectRecord | null>;
  updateRepositoryLabel?(repository: RepositoryIdentity): Promise<void>;
  updateBoard?(projectId: string, board: ProjectBoard | null): Promise<ProjectRecord | null>;
  setLastSelected?(userId: string, projectId: string): Promise<void>;
  list(): Promise<ProjectRecord[]>;
  findByExternalKey(externalKey: string): Promise<ProjectRecord | null>;
  upsert?(project: { externalKey: string; name: string; description?: string; isDemo?: boolean }): Promise<{ record: ProjectRecord; inserted: boolean }>;
  transaction?<T>(callback: (dao: ProjectDao) => Promise<T>): Promise<T>;
}

export function actorId(actor: ProjectActor) { return typeof actor === "string" ? actor : actor.userId; }
