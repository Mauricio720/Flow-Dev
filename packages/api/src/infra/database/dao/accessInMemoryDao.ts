import type { AccessDao, UserRecord } from "../../../application/database/dao/accessDao";
import type { Page, ProjectRecord } from "../../../application/database/dao/projectDao";
import { decodeCursor, encodeCursor } from "../../../application/pagination/cursor";
import { InMemoryProjectDao } from "./projects/inMemoryProjectDao";

export class InMemoryAccessDao implements AccessDao {
  private readonly users = new Map<string, UserRecord>();
  private readonly assignments = new Set<string>();
  private readonly admins = new Set<string>();
  private readonly projects = new InMemoryProjectDao();

  async findUser(id: string) {
    const user = this.users.get(id);
    return user ? { ...user, assignmentCount: this.countAssignments(id) } : null;
  }

  async listUsers(query: { search?: string; cursor?: string }): Promise<Page<UserRecord>> {
    const all = [...this.users.values()].filter((user) => !query.search || user.githubLogin.includes(query.search)).sort((a, b) => a.githubLogin.localeCompare(b.githubLogin) || a.id.localeCompare(b.id));
    const cursor = decodeCursor(query.cursor);
    const start = cursor ? all.findIndex((user) => user.id === cursor.id) + 1 : 0;
    const items = all.slice(start, start + 50).map((user) => ({ ...user, assignmentCount: this.countAssignments(user.id) }));
    return { items, nextCursor: all.length > start + items.length ? encodeCursor({ key: items.at(-1)?.githubLogin ?? "", id: items.at(-1)?.id }) : null };
  }

  async isAdmin(userId: string) {
    const user = this.users.get(userId);
    return !!user && this.admins.has(user.githubId);
  }

  async listAssignments(userId: string, cursor?: string) {
    const all = (await this.projects.list()).filter((project) => this.assignments.has(this.key(userId, project.id)));
    const decoded = decodeCursor(cursor);
    const start = decoded ? all.findIndex((project) => project.externalKey === decoded.key) + 1 : 0;
    const items = all.slice(start, start + 50);
    return { items, nextCursor: all.length > start + items.length ? encodeCursor({ key: items.at(-1)?.externalKey ?? "" }) : null };
  }

  async hasAssignment(userId: string, projectId: string) {
    return this.assignments.has(this.key(userId, projectId));
  }

  async findProject(projectId: string) {
    return this.projects.findAuthorized("", projectId);
  }

  async assign(userId: string, projectId: string, _createdBy: string) {
    if (!(await this.findProject(projectId))) throw new Error("Project unavailable");
    this.assignments.add(this.key(userId, projectId));
  }

  async remove(userId: string, projectId: string) {
    const key = this.key(userId, projectId);
    const present = this.assignments.has(key);
    this.assignments.delete(key);
    return present;
  }

  async replaceAdmins(ids: Array<{ githubUserId: string; resolvedLogin: string }>) {
    this.admins.clear();
    ids.forEach((id) => this.admins.add(id.githubUserId));
  }

  async transaction<T>(callback: (dao: AccessDao) => Promise<T>): Promise<T> {
    const snapshot = new Set(this.assignments);
    try {
      return await callback(this);
    } catch (error) {
      this.assignments.clear();
      snapshot.forEach((key) => this.assignments.add(key));
      throw error;
    }
  }

  seedUser(user: Omit<UserRecord, "assignmentCount"> & { assignmentCount?: number }) {
    this.users.set(user.id, { ...user, assignmentCount: user.assignmentCount ?? 0 });
  }

  private key(userId: string, projectId: string) {
    return userId + ":" + projectId;
  }

  private countAssignments(userId: string) {
    return [...this.assignments].filter((key) => key.startsWith(userId + ":")).length;
  }
}

export const sharedAccessDao = new InMemoryAccessDao();
