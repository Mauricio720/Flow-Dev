import type { RepositoryIdentity } from "../database/dao/projectDao";

export type RepositoryPage = { items: RepositoryIdentity[]; nextCursor: string | null };
export type RepositoryContext = { repository: RepositoryIdentity; defaultBranch: string };
export interface GitHubRepositoryGateway {
  listAccessible(token: string, cursor?: string): Promise<RepositoryPage>;
  resolve(token: string, nodeId: string): Promise<RepositoryIdentity>;
  resolvePath(token: string, owner: string, name: string, expectedGithubId?: string): Promise<RepositoryIdentity>;
  context?(token: string, repository: RepositoryIdentity): Promise<RepositoryContext>;
}
