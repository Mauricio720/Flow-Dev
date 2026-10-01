import type { AccessDao, UserRecord } from "../../database/dao/accessDao";
import type { Page, ProjectRecord } from "../../database/dao/projectDao";
import type { SessionPrincipal } from "../../../context";

export class AdminRequiredError extends Error {}
export class TargetUserUnavailableError extends Error {}
export class AssignmentService {
  constructor(private readonly dao: AccessDao) {}
  async listUsers(actor: SessionPrincipal, query: { search?: string; cursor?: string }): Promise<Page<UserRecord>> { await this.requireAdmin(actor); return this.dao.listUsers(query); }
  async listAssignments(actor: SessionPrincipal, userId: string, cursor?: string): Promise<Page<ProjectRecord>> { await this.requireAdmin(actor); if (!(await this.dao.findUser(userId))) throw new TargetUserUnavailableError(); return this.dao.listAssignments(userId, cursor); }
  async assign(actor: SessionPrincipal, target: { userId: string; projectId: string }) { await this.requireAdmin(actor); if (!(await this.dao.findUser(target.userId))) throw new TargetUserUnavailableError(); await this.dao.assign(target.userId, target.projectId, actor.userId); return { assigned: true as const }; }
  async remove(actor: SessionPrincipal, target: { userId: string; projectId: string }) { await this.requireAdmin(actor); if (!(await this.dao.findUser(target.userId))) throw new TargetUserUnavailableError(); await this.dao.remove(target.userId, target.projectId); return { assigned: false as const }; }
  private async requireAdmin(actor: SessionPrincipal) { if (!(await this.dao.isAdmin(actor.userId))) throw new AdminRequiredError(); }
}
