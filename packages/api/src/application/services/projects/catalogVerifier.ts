import type { AccessDao } from "../../database/dao/accessDao";
import type { RepositoryIdentity } from "../../database/dao/projectDao";
import type { RepositoryAuthorizationService } from "../../github/repositoryAuthorizationService";
import type { GitHubRepositoryGateway } from "../../github/repositoryGateway";
import { RepositoryAuthorizationNeededError, RepositoryIdentityMismatchError } from "../../github/repositoryErrors";
import { ProjectAdminRequiredError } from "../access/projectAccessService";

export type CatalogEntry = { externalKey: string; name: string; description?: string; repository: RepositoryIdentity };
export class InvalidCatalogManifestError extends Error {}
type Dependencies = { permissions: AccessDao; authorization: RepositoryAuthorizationService; github: GitHubRepositoryGateway };

export class CatalogVerifier {
  constructor(private readonly dependencies: Dependencies) {}
  async verify(userId: string, manifest: CatalogEntry[]) {
    if (!await this.dependencies.permissions.isAdmin(userId)) throw new ProjectAdminRequiredError();
    validateManifest(manifest);
    const token = await this.dependencies.authorization.accessToken(userId);
    if (!token) throw new RepositoryAuthorizationNeededError();
    const entries: CatalogEntry[] = [];
    for (const entry of manifest) {
      const repository = await this.dependencies.github.resolve(token, entry.repository.nodeId);
      if (repository.githubId !== entry.repository.githubId) throw new RepositoryIdentityMismatchError();
      entries.push({ ...entry, repository });
    }
    return entries;
  }
}

function validateManifest(manifest: CatalogEntry[]) {
  if (!Array.isArray(manifest)) throw new InvalidCatalogManifestError("Manifest must be an array");
  const keys = new Set<string>();
  for (const entry of manifest) {
    if (!entry || typeof entry.externalKey !== "string" || !/^[-a-z0-9]+$/.test(entry.externalKey) || keys.has(entry.externalKey)) throw new InvalidCatalogManifestError("Manifest contains duplicate or invalid externalKey");
    if (typeof entry.name !== "string" || entry.name.trim().length < 2 || entry.name.trim().length > 60) throw new InvalidCatalogManifestError("Manifest contains an invalid name");
    if (entry.description !== undefined && (typeof entry.description !== "string" || entry.description.trim().length > 280)) throw new InvalidCatalogManifestError("Manifest contains an invalid description");
    if (!entry.repository || !/^\d+$/.test(entry.repository.githubId) || typeof entry.repository.nodeId !== "string" || !entry.repository.nodeId) throw new InvalidCatalogManifestError("Manifest contains an invalid repository reference");
    keys.add(entry.externalKey);
  }
}
