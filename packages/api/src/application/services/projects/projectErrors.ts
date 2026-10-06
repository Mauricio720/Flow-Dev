export class ProjectConflictError extends Error {
  constructor(message = "Project conflict", readonly existingProjectId?: string) { super(message); }
}
export class StaleProjectVersionError extends Error {}
export class RepositoryRequiredError extends Error {}
export class RepositoryIdentityMismatchError extends Error {}
export class ProjectValidationError extends Error {}

export type ProjectConflictKind = "repository" | "name" | "version";

export function projectConflictKind(error: unknown): ProjectConflictKind | undefined {
  if (error instanceof StaleProjectVersionError) return "version";
  if (!(error instanceof ProjectConflictError)) return undefined;
  return error.existingProjectId ? "repository" : "name";
}
