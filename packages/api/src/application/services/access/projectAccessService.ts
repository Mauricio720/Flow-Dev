import type { AccessDao } from "../../database/dao/accessDao";
import type { CatalogQuery, Page, ProjectDao, ProjectRecord } from "../../database/dao/projectDao";
import type { SessionPrincipal } from "../../../context";
import { decodeCursor, encodeCursor } from "../../pagination/cursor";
import { mapProjectDto, type ProjectDto } from "../../../controllers/mappers/projectDtoMapper";

export class ProjectUnavailableError extends Error {}
export class ProjectAdminRequiredError extends Error {}

export class ProjectAccessService {
  constructor(private readonly projects: ProjectDao, private readonly permissions?: AccessDao) {}

  async listVisible(actor: SessionPrincipal, query: CatalogQuery): Promise<Page<ProjectDto>> {
    const isAdmin = !this.permissions || await this.permissions.isAdmin(actor.userId);
    const page = this.projects.listVisible ? await this.projects.listVisible(actor, query, isAdmin) : await this.fallback(actor, query, isAdmin);
    return { items: page.items.map(mapProjectDto), nextCursor: page.nextCursor };
  }

  async requireProject(actor: SessionPrincipal, projectId: string) {
    const isAdmin = !this.permissions || await this.permissions.isAdmin(actor.userId);
    const project = this.projects.findVisible ? await this.projects.findVisible(actor, projectId, isAdmin) : await this.fallbackById(actor, projectId, isAdmin);
    if (!project) throw new ProjectUnavailableError();
    return project;
  }

  async select(actor: SessionPrincipal, projectId: string) {
    const project = await this.requireProject(actor, projectId);
    await this.projects.setLastSelected?.(actor.userId, projectId);
    return project;
  }

  async requireAdmin(actor: SessionPrincipal) {
    if (this.permissions && !(await this.permissions.isAdmin(actor.userId))) throw new ProjectAdminRequiredError();
  }

  private async fallback(actor: SessionPrincipal, query: CatalogQuery, isAdmin: boolean) {
    const all = await this.projects.list();
    const visible = isAdmin ? all : await this.assigned(actor.userId, all);
    const filtered = query.search ? visible.filter((project) => matches(project, query.search!)) : visible;
    return page(filtered, query.cursor);
  }

  private async fallbackById(actor: SessionPrincipal, projectId: string, isAdmin: boolean) {
    if (isAdmin) return (await this.projects.findById?.(projectId)) ?? (await this.projects.list()).find((item) => item.id === projectId) ?? null;
    return await this.projects.findAuthorized?.(actor.userId, projectId) ?? null;
  }

  private async assigned(userId: string, projects: ProjectRecord[]) {
    if (!this.permissions) return projects;
    const result: ProjectRecord[] = [];
    for (const project of projects) if (await this.permissions.hasAssignment(userId, project.id)) result.push(project);
    return result;
  }
}

function matches(project: ProjectRecord, search: string) {
  const haystack = [project.externalKey, project.name, project.repository?.owner, project.repository?.name].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(search.toLowerCase());
}

function page(items: ProjectRecord[], value?: string): Page<ProjectRecord> {
  const cursor = decodeCursor(value);
  const start = cursor?.id ? items.findIndex((item) => item.id === cursor.id) + 1 : 0;
  const current = items.slice(start, start + 50);
  return { items: current, nextCursor: items.length > start + current.length ? encodeCursor({ key: current.at(-1)?.createdAt.toISOString() ?? "", id: current.at(-1)?.id }) : null };
}
