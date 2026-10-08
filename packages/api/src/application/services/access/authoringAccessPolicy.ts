import type { SessionPrincipal } from "../../../context";
import type { AccessDao } from "../../database/dao/accessDao";
import { TaskError } from "../tasks/taskErrors";

export class AuthoringAccessPolicy {
  constructor(private readonly permissions: AccessDao) {}

  isAdmin(actor: SessionPrincipal) {
    return this.permissions.isAdmin(actor.userId);
  }

  async requireAdmin(actor: SessionPrincipal) {
    if (!(await this.isAdmin(actor))) throw new TaskError("admin_required");
  }

  async canAuthor(actor: SessionPrincipal, task: { authorUserId: string | null }) {
    return task.authorUserId === actor.userId && await this.isAdmin(actor);
  }
}
