import type { ProjectRecord, RepositoryIdentity, VerifiedProjectInput } from "../../../../application/database/dao/projectDao";
import { projects } from "../../schema";

export function valuesFor(input: VerifiedProjectInput, id: string) { return { id, externalKey: `project-${id}`, name: input.name, description: input.description, isDemo: input.isDemo ?? false, githubRepositoryId: input.repository.githubId, githubNodeId: input.repository.nodeId, repositoryOwner: input.repository.owner, repositoryName: input.repository.name, repositoryVisibility: input.repository.visibility, repositoryArchived: input.repository.archived, repositoryVerifiedAt: new Date(), detailsVersion: 1 }; }
export function toRecord(row: typeof projects.$inferSelect): ProjectRecord {
  const hasRepository = row.githubRepositoryId !== null && row.githubNodeId !== null && row.repositoryOwner !== null && row.repositoryName !== null && row.repositoryVisibility !== null;
  const repository = hasRepository ? { githubId: row.githubRepositoryId!, nodeId: row.githubNodeId!, owner: row.repositoryOwner!, name: row.repositoryName!, visibility: row.repositoryVisibility as RepositoryIdentity["visibility"], archived: row.repositoryArchived } : undefined;
  return { id: row.id, externalKey: row.externalKey, name: row.name, description: row.description, isDemo: row.isDemo, createdAt: row.createdAt, updatedAt: row.updatedAt, repository, repositoryVerifiedAt: row.repositoryVerifiedAt, detailsVersion: row.detailsVersion, board: boardOf(row) };
}
function boardOf(row: typeof projects.$inferSelect) {
  if (!row.githubProjectNodeId || !row.githubProjectUrl || !row.githubProjectTitle) return null;
  return { nodeId: row.githubProjectNodeId, url: row.githubProjectUrl, title: row.githubProjectTitle };
}
const UNIQUE_VIOLATION = "23505";

function hasUniqueViolationCode(value: unknown) {
  return typeof value === "object" && value !== null && "code" in value && value.code === UNIQUE_VIOLATION;
}

export function isUniqueViolation(error: unknown) {
  return hasUniqueViolationCode(error) || (error instanceof Error && hasUniqueViolationCode(error.cause));
}
