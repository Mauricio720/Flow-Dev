import type { Page, ProjectRecord } from "./projectDao";

export type UserRecord = { id: string; githubId: string; githubLogin: string; displayName?: string; avatarUrl?: string; lastProjectId: string | null; assignmentCount: number };
export interface AccessDao {
  findUser(id: string): Promise<UserRecord | null>;
  listUsers(query: { search?: string; cursor?: string }): Promise<Page<UserRecord>>;
  isAdmin(userId: string): Promise<boolean>;
  listAssignments(userId: string, cursor?: string): Promise<Page<ProjectRecord>>;
  hasAssignment(userId: string, projectId: string): Promise<boolean>;
  findProject(projectId: string): Promise<ProjectRecord | null>;
  assign(userId: string, projectId: string, createdBy: string): Promise<void>;
  remove(userId: string, projectId: string): Promise<boolean>;
  replaceAdmins(ids: Array<{ githubUserId: string; resolvedLogin: string }>): Promise<void>;
  transaction?<T>(callback: (dao: AccessDao) => Promise<T>): Promise<T>;
}
