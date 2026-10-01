import type { AccessDao, UserRecord } from "../../../application/database/dao/accessDao";
import type { Page, ProjectRecord } from "../../../application/database/dao/projectDao";
import { InMemoryProjectDao } from "./projects/inMemoryProjectDao";

const users = new Map<string, UserRecord>();
const assignments = new Set<string>();
const admins = new Set<string>();
const projects = new InMemoryProjectDao();
export class InMemoryAccessDao implements AccessDao {
  async findUser(id: string) { return users.get(id) ?? null; }
  async listUsers(query: { search?: string; cursor?: string }): Promise<Page<UserRecord>> { const all = [...users.values()].filter((u) => !query.search || u.githubLogin.includes(query.search)); const items = all.slice(query.cursor ? Number(query.cursor) : 0, (query.cursor ? Number(query.cursor) : 0) + 50); return { items, nextCursor: all.length > items.length ? String(items.length) : null }; }
  async isAdmin(userId: string) { const user = users.get(userId); return !!user && admins.has(user.githubId); }
  async listAssignments(userId: string, cursor?: string): Promise<Page<ProjectRecord>> { const all = (await projects.list()).filter((p) => assignments.has(`${userId}:${p.id}`)); const offset = cursor ? Number(cursor) : 0; const items = all.slice(offset, offset + 50); return { items, nextCursor: all.length > offset + items.length ? String(offset + items.length) : null }; }
  async hasAssignment(userId: string, projectId: string) { return assignments.has(`${userId}:${projectId}`); }
  async assign(userId: string, projectId: string) { if (!(await projects.findAuthorized(userId, projectId))) throw new Error("Project unavailable"); assignments.add(`${userId}:${projectId}`); }
  async remove(userId: string, projectId: string) { const key = `${userId}:${projectId}`; const present = assignments.has(key); assignments.delete(key); return present; }
  async replaceAdmins(ids: Array<{ githubUserId: string; resolvedLogin: string }>) { admins.clear(); ids.forEach((id) => admins.add(id.githubUserId)); }
  seedUser(user: UserRecord) { users.set(user.id, user); }
}
export const sharedAccessDao = new InMemoryAccessDao();
