import type { AccessDao } from "../../database/dao/accessDao";
import type { ProjectDao, RepositoryIdentity, VerifiedProjectInput, VersionedProjectEdit } from "../../database/dao/projectDao";
import type { SessionPrincipal } from "../../../context";
import type { GitHubRepositoryGateway } from "../../github/repositoryGateway";
import type { RepositoryAuthorizationService } from "../../github/repositoryAuthorizationService";
import { ProjectAccessService } from "../access/projectAccessService";
import { ProjectConflictError, ProjectValidationError, StaleProjectVersionError } from "./projectErrors";
import { RepositoryAuthorizationNeededError } from "../../github/repositoryErrors";

export class ProjectLifecycleService {
  private readonly access: ProjectAccessService;
  constructor(private readonly projects: ProjectDao, permissions: AccessDao, private readonly github: GitHubRepositoryGateway, private readonly authorization: RepositoryAuthorizationService) { this.access = new ProjectAccessService(projects, permissions); }
  async create(actor: SessionPrincipal, input: { name: string; description?: string | null; nodeId: string }) {
    await this.access.requireAdmin(actor);
    const name = normalizeName(input.name);
    const description = normalizeDescription(input.description);
    const token = await this.tokenFor(actor);
    const repository = await this.github.resolve(token, input.nodeId);
    const existing = await this.projects.findByRepositoryId?.(repository.githubId);
    if (existing) throw new ProjectConflictError("Repository already linked", existing.id);
    return this.projects.insertVerified!({ name, description, repository, isDemo: false });
  }
  async updateDetails(actor: SessionPrincipal, input: VersionedProjectEdit) {
    await this.access.requireAdmin(actor);
    const result = await this.projects.updateDetails!({ ...input, name: normalizeName(input.name), description: normalizeDescription(input.description) });
    if (result) return result;
    const current = await this.projects.findById?.(input.projectId);
    if (!current) throw new ProjectValidationError("Project unavailable");
    throw new StaleProjectVersionError();
  }
  async repositoryCandidates(actor: SessionPrincipal, query: { search?: string; cursor?: string }) { await this.access.requireAdmin(actor); const page = await this.github.listAccessible(await this.tokenFor(actor), query.cursor); return { items: page.items.filter((repository) => matchesSearch(repository, query.search)), nextCursor: page.nextCursor }; }
  async repositoryPreview(actor: SessionPrincipal, input: { nodeId?: string; owner?: string; name?: string }) { await this.access.requireAdmin(actor); const token = await this.tokenFor(actor); return input.nodeId ? this.github.resolve(token, input.nodeId) : this.github.resolvePath(token, input.owner!, input.name!); }
  private async tokenFor(actor: SessionPrincipal) { const token = await this.authorization.accessToken(actor.userId); if (!token) throw new RepositoryAuthorizationNeededError(); return token; }
}

function matchesSearch(repository: RepositoryIdentity, search?: string) {
  const term = search?.trim().toLowerCase();
  return !term || `${repository.owner}/${repository.name}`.toLowerCase().includes(term);
}
function normalizeName(value: string) { const name = value.trim(); if (name.length < 2 || name.length > 60) throw new ProjectValidationError("Project name is invalid"); return name; }
function normalizeDescription(value: string | null | undefined) { const description = value?.trim() || null; if (description && description.length > 280) throw new ProjectValidationError("Project description is invalid"); return description; }
