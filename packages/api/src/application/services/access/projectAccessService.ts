import type { Page, ProjectDao, ProjectRecord } from "../../database/dao/projectDao";
import type { SessionPrincipal } from "../../../context";

export type ProjectDto = { id: string; name: string; description: string | null; isDemo: boolean };
export class ProjectUnavailableError extends Error {}
export class ProjectAccessService {
  constructor(private readonly projects: ProjectDao, private readonly permissions?: { isAdmin(userId: string): Promise<boolean>; hasAssignment(userId: string, projectId: string): Promise<boolean> }) {}
  async listVisible(actor: SessionPrincipal, query: { search?: string; cursor?: string }): Promise<Page<ProjectDto>> {
    const rows = this.projects.listVisible ? await this.projects.listVisible(actor.userId, query) : { items: await this.projects.list(), nextCursor: null };
    const visible = this.permissions && !(await this.permissions.isAdmin(actor.userId)) ? { ...rows, items: (await Promise.all(rows.items.map(async (item) => (await this.permissions?.hasAssignment(actor.userId, item.id)) ? item : null))).filter((item): item is ProjectRecord => !!item) } : rows;
    return { items: visible.items.map(map), nextCursor: visible.nextCursor };
  }
  async requireProject(actor: SessionPrincipal, projectId: string) {
    const candidate = this.projects.findAuthorized ? await this.projects.findAuthorized(actor.userId, projectId) : (await this.projects.list()).find((item) => item.id === projectId) ?? null;
    const project = candidate && this.permissions && !(await this.permissions.isAdmin(actor.userId)) && !(await this.permissions.hasAssignment(actor.userId, projectId)) ? null : candidate;
    if (!project) throw new ProjectUnavailableError();
    return project;
  }
  async select(actor: SessionPrincipal, projectId: string) {
    const project = await this.requireProject(actor, projectId);
    await this.projects.setLastSelected?.(actor.userId, projectId);
    return project;
  }
}
function map(project: ProjectRecord): ProjectDto { return { id: project.id, name: project.name, description: project.description, isDemo: project.isDemo }; }
