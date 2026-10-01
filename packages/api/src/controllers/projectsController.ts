import { TRPCError } from "@trpc/server";
import type { ProjectDao } from "../application/database/dao/projectDao";
import { ProjectAccessService, ProjectUnavailableError } from "../application/services/access/projectAccessService";
import type { SessionPrincipal } from "../context";
import { mapProjectDto } from "./mappers/projectDtoMapper";
import type { AccessDao } from "../application/database/dao/accessDao";

export class ProjectsController {
  private readonly access: ProjectAccessService;
  constructor(projects: ProjectDao, permissions?: AccessDao) { this.access = new ProjectAccessService(projects, permissions); }
  list(actor: SessionPrincipal, query: { search?: string; cursor?: string }) { return this.access.listVisible(actor, query); }
  async byId(actor: SessionPrincipal, projectId: string) { return mapProjectDto(await this.access.requireProject(actor, projectId)); }
  async select(actor: SessionPrincipal, projectId: string) { return mapProjectDto(await this.access.select(actor, projectId)); }
}

export function mapProjectError(error: unknown): never {
  if (error instanceof ProjectUnavailableError) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto indisponível" });
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível carregar o projeto" });
}
