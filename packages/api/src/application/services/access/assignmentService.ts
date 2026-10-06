import type { AccessDao, UserRecord } from "../../database/dao/accessDao";
import type { Page, ProjectRecord } from "../../database/dao/projectDao";
import type { SessionPrincipal } from "../../../context";

export class AdminRequiredError extends Error {}
export class TargetUserUnavailableError extends Error {}
export class ProjectUnavailableError extends Error {}

export class AssignmentService {
  constructor(private readonly dao: AccessDao) {}

  async listUsers(actor: SessionPrincipal, query: { search?: string; cursor?: string }): Promise<Page<UserRecord>> {
    await this.requireAdmin(actor);
    return this.dao.listUsers(query);
  }

  async listAssignments(actor: SessionPrincipal, userId: string, cursor?: string): Promise<Page<ProjectRecord>> {
    await this.requireAdmin(actor);
    await this.requireUser(userId);
    return this.dao.listAssignments(userId, cursor);
  }

  async assign(actor: SessionPrincipal, target: { userId: string; projectId: string }) {
    return this.inTransaction((dao) => new AssignmentService(dao).assignNow(actor, target));
  }

  async remove(actor: SessionPrincipal, target: { userId: string; projectId: string }) {
    return this.inTransaction((dao) => new AssignmentService(dao).removeNow(actor, target));
  }

  private async assignNow(actor: SessionPrincipal, target: { userId: string; projectId: string }) {
    await this.requireAdmin(actor);
    await this.requireUser(target.userId);
    await this.requireProject(target.projectId);
    await this.dao.assign(target.userId, target.projectId, actor.userId);
    return { assigned: true as const };
  }

  private async removeNow(actor: SessionPrincipal, target: { userId: string; projectId: string }) {
    await this.requireAdmin(actor);
    await this.requireUser(target.userId);
    await this.requireProject(target.projectId);
    await this.dao.remove(target.userId, target.projectId);
    return { assigned: false as const };
  }

  private async requireAdmin(actor: SessionPrincipal) {
    if (!(await this.dao.isAdmin(actor.userId))) throw new AdminRequiredError();
  }

  private async requireUser(userId: string) {
    if (!(await this.dao.findUser(userId))) throw new TargetUserUnavailableError();
  }

  private async requireProject(projectId: string) {
    if (!(await this.dao.findProject(projectId))) throw new ProjectUnavailableError();
  }

  private inTransaction<T>(callback: (dao: AccessDao) => Promise<T>) {
    return this.dao.transaction ? this.dao.transaction(callback) : callback(this.dao);
  }
}
