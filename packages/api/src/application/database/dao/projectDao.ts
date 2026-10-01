export type ProjectRecord = { id: string; externalKey: string; name: string; description: string | null; isDemo: boolean; createdAt: Date; updatedAt?: Date };
export type Page<T> = { items: T[]; nextCursor: string | null };

export interface ProjectDao {
  listVisible?(userId: string, query: { search?: string; cursor?: string }): Promise<Page<ProjectRecord>>;
  findAuthorized?(userId: string, projectId: string): Promise<ProjectRecord | null>;
  setLastSelected?(userId: string, projectId: string): Promise<void>;
  list(): Promise<ProjectRecord[]>;
  findByExternalKey(externalKey: string): Promise<ProjectRecord | null>;
  upsert(project: { externalKey: string; name: string; description?: string; isDemo?: boolean }): Promise<{ record: ProjectRecord; inserted: boolean }>;
}
