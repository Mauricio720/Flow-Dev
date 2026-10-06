import { TRPCError } from "@trpc/server";
import type { AccessDao } from "../application/database/dao/accessDao";
import type { ProjectDao } from "../application/database/dao/projectDao";
import { ProjectAdminRequiredError, ProjectAccessService, ProjectUnavailableError } from "../application/services/access/projectAccessService";
import { ConnectionStateService } from "../application/services/projects/connectionStateService";
import { ProjectLifecycleService } from "../application/services/projects/projectLifecycleService";
import { ProjectConflictError, ProjectValidationError, StaleProjectVersionError } from "../application/services/projects/projectErrors";
import { RepositoryAccessService } from "../application/services/projects/repositoryAccessService";
import { AccountMismatchError, RepositoryArchivedError, RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryIdentityMismatchError, RepositoryNotFoundError, RepositoryRateLimitedError, RepositoryUnavailableError } from "../application/github/repositoryErrors";
import { BacklogStatusMissingError, ProjectBoardNotFoundError, type GitHubProjectBoardGateway } from "../application/github/projectBoardGateway";
import { ProjectBoardService } from "../application/services/projects/projectBoardService";
import type { GitHubRepositoryGateway } from "../application/github/repositoryGateway";
import type { RepositoryAuthorizationService } from "../application/github/repositoryAuthorizationService";
import type { SessionPrincipal } from "../context";
import { mapProjectDto } from "./mappers/projectDtoMapper";

type Dependencies = { github: GitHubRepositoryGateway; authorization: RepositoryAuthorizationService; boards?: GitHubProjectBoardGateway };
export class ProjectsController {
  private readonly access: ProjectAccessService;
  private readonly lifecycle?: ProjectLifecycleService;
  private readonly repository?: RepositoryAccessService;
  private readonly states?: ConnectionStateService;
  private readonly boards?: ProjectBoardService;
  constructor(private readonly projects: ProjectDao, permissions?: AccessDao, dependencies?: Dependencies) {
    this.access = new ProjectAccessService(projects, permissions);
    if (permissions && dependencies) { this.lifecycle = new ProjectLifecycleService(projects, permissions, dependencies.github, dependencies.authorization); this.repository = new RepositoryAccessService(projects, permissions, dependencies.authorization, dependencies.github); this.states = new ConnectionStateService(projects, permissions, dependencies.authorization, dependencies.github); }
    if (permissions && dependencies?.boards) this.boards = new ProjectBoardService({ projects, permissions, authorization: dependencies.authorization, boards: dependencies.boards });
  }
  async list(actor: SessionPrincipal, query: { search?: string; cursor?: string }) { return this.access.listVisible(actor, query); }
  async byId(actor: SessionPrincipal, projectId: string) { return mapProjectDto(await this.access.requireProject(actor, projectId)); }
  async select(actor: SessionPrincipal, projectId: string) { return mapProjectDto(await this.access.select(actor, projectId)); }
  async candidates(actor: SessionPrincipal, query: { search?: string; cursor?: string }) { const page = await this.requiredLifecycle().repositoryCandidates(actor, query); const items = await Promise.all(page.items.map(async (repository) => ({ repository, linkedProjectId: (await this.projects.findByRepositoryId?.(repository.githubId))?.id }))); return { items, nextCursor: page.nextCursor }; }
  async preview(actor: SessionPrincipal, input: { nodeId?: string; owner?: string; name?: string }) { const repository = await this.requiredLifecycle().repositoryPreview(actor, input); return { repository, linkedProjectId: (await this.projects.findByRepositoryId?.(repository.githubId))?.id }; }
  async create(actor: SessionPrincipal, input: { name: string; description?: string | null; nodeId: string }) { return mapProjectDto(await this.requiredLifecycle().create(actor, input)); }
  async updateDetails(actor: SessionPrincipal, input: { projectId: string; name: string; description: string | null; expectedVersion: number }) { return mapProjectDto(await this.requiredLifecycle().updateDetails(actor, input)); }
  async updateBoard(actor: SessionPrincipal, input: { projectId: string; boardUrl: string | null }) { const boards = this.requiredBoards(); return mapProjectDto(input.boardUrl ? await boards.link(actor, { projectId: input.projectId, boardUrl: input.boardUrl }) : await boards.unlink(actor, input.projectId)); }
  async connectionStates(actor: SessionPrincipal, projectIds: string[]) { return this.requiredStates().forVisibleProjects(actor, projectIds); }
  async repositoryContext(actor: SessionPrincipal, projectId: string) { return this.requiredRepository().context(actor, projectId); }
  private requiredLifecycle() { if (!this.lifecycle) throw new Error("Project lifecycle is not configured"); return this.lifecycle; }
  private requiredRepository() { if (!this.repository) throw new Error("Repository access is not configured"); return this.repository; }
  private requiredBoards() { if (!this.boards) throw new Error("Project boards are not configured"); return this.boards; }
  private requiredStates() { if (!this.states) throw new Error("Connection states are not configured"); return this.states; }
}

export function mapProjectError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  if (error instanceof ProjectAdminRequiredError) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso administrativo necessário", cause: error });
  if (error instanceof ProjectUnavailableError || error instanceof RepositoryNotFoundError) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto indisponível", cause: error });
  if (error instanceof ProjectBoardNotFoundError) throw new TRPCError({ code: "NOT_FOUND", message: "Quadro do GitHub indisponível", cause: error });
  if (error instanceof BacklogStatusMissingError) throw new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: "O quadro não tem o status Backlog", cause: error });
  if (error instanceof ProjectValidationError) throw new TRPCError({ code: "BAD_REQUEST", message: "Dados do projeto inválidos", cause: error });
  if (error instanceof ProjectConflictError || error instanceof StaleProjectVersionError) throw new TRPCError({ code: "CONFLICT", message: "O projeto foi alterado ou já está vinculado", cause: error });
  if (error instanceof RepositoryAuthorizationNeededError) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Autorize o acesso aos repositórios", cause: error });
  if (error instanceof RepositoryForbiddenError || error instanceof RepositoryArchivedError) throw new TRPCError({ code: "FORBIDDEN", message: "Acesso ao repositório indisponível", cause: error });
  if (error instanceof RepositoryRateLimitedError) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "O GitHub limitou esta tentativa", cause: error });
  if (error instanceof RepositoryUnavailableError) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "O GitHub está temporariamente indisponível", cause: error });
  if (error instanceof RepositoryIdentityMismatchError || error instanceof AccountMismatchError) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A identidade do repositório não pôde ser confirmada", cause: error });
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível concluir a operação", cause: error });
}
