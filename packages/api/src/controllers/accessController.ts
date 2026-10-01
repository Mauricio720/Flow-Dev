import { TRPCError } from "@trpc/server";
import type { AccessDao } from "../application/database/dao/accessDao";
import { AdminRequiredError, AssignmentService, TargetUserUnavailableError } from "../application/services/access/assignmentService";
import type { SessionPrincipal } from "../context";

export class AccessController {
  constructor(private readonly service: AssignmentService, private readonly dao: AccessDao) {}
  async me(actor: SessionPrincipal) { const user = await this.dao.findUser(actor.userId); if (!user) throw new TRPCError({ code: "NOT_FOUND" }); return { id: user.id, githubLogin: user.githubLogin, isAdmin: await this.dao.isAdmin(user.id), lastProjectId: user.lastProjectId }; }
  async users(actor: SessionPrincipal, query: { search?: string; cursor?: string }) { const page = await this.service.listUsers(actor, query); return { ...page, items: page.items.map(toUserDto) }; }
  async assignments(actor: SessionPrincipal, userId: string, cursor?: string) { const page = await this.service.listAssignments(actor, userId, cursor); return { ...page, items: page.items.map((project) => ({ id: project.id, name: project.name, description: project.description, isDemo: project.isDemo })) }; }
  assign(actor: SessionPrincipal, target: { userId: string; projectId: string }) { return this.service.assign(actor, target); }
  remove(actor: SessionPrincipal, target: { userId: string; projectId: string }) { return this.service.remove(actor, target); }
}

function toUserDto(user: { id: string; githubLogin: string; displayName?: string; avatarUrl?: string; lastProjectId: string | null }) { return { id: user.id, githubLogin: user.githubLogin, displayName: user.displayName, avatarUrl: user.avatarUrl, lastProjectId: user.lastProjectId }; }

export function mapAccessError(error: unknown): never {
  if (error instanceof AdminRequiredError) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso administrativo necessário" });
  if (error instanceof TargetUserUnavailableError) throw new TRPCError({ code: "NOT_FOUND", message: "Usuário indisponível" });
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível concluir a operação" });
}
