import type { FrozenIssueIdentity } from "../../application/services/issue-deletion/issueDeletionContracts";
import type { GitHubIssueDeletionGateway, InspectExpectation, IssueFacts, ProviderFailure } from "../../application/github/issueDeletionGateway";
import { ProjectBoardNotFoundError } from "../../application/github/projectBoardGateway";
import { RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryNotFoundError, RepositoryRateLimitedError } from "../../application/github/repositoryErrors";
import { githubGraphql, type GraphqlTransport, DEFAULT_TRANSPORT } from "./githubGraphql";
import { GITHUB_TIMEOUT_MS, githubApiBase } from "./githubRequest";

const INSPECT_QUERY = `query($id: ID!) {
  node(id: $id) {
    __typename
    ... on Issue {
      id
      number
      title
      viewerCanDelete
      author { __typename ... on User { databaseId login } }
      repository { id databaseId name owner { login } }
    }
  }
}`;

const REMOVE_MUTATION = `mutation($id: ID!) { deleteIssue(input: { issueId: $id }) { clientMutationId } }`;

const REPOSITORY_QUERY = `query($id: ID!) {
  node(id: $id) {
    __typename
    ... on Repository { id databaseId name owner { login } }
  }
}`;

type RawInspect = {
  node?: ({ __typename?: string } & {
    id?: string | null;
    number?: number | null;
    title?: string | null;
    viewerCanDelete?: boolean | null;
    author?: { __typename?: string; databaseId?: number | null; login?: string | null } | null;
    repository?: { id?: string | null; databaseId?: number | null; name?: string | null; owner?: { login?: string | null } | null } | null;
  }) | null;
};
type RawRemove = { deleteIssue?: { clientMutationId?: string | null } | null };
type RawRepository = { node?: ({ __typename?: string } & { id?: string | null; databaseId?: number | null; name?: string | null; owner?: { login?: string | null } | null }) | null };

export class GitHubHttpIssueDeletionGateway implements GitHubIssueDeletionGateway {
  private readonly transport: GraphqlTransport;

  constructor(fetcher: typeof fetch = fetch, baseUrl = githubApiBase(), timeoutMs = GITHUB_TIMEOUT_MS) {
    this.transport = DEFAULT_TRANSPORT(fetcher, baseUrl, timeoutMs);
  }

  async inspect(token: string, issueNodeId: string, expected?: InspectExpectation): Promise<IssueFacts | ProviderFailure> {
    const data = await this.graphql<RawInspect>(token, INSPECT_QUERY, { id: issueNodeId });
    const node = data.node;
    if (!node || node.__typename !== "Issue") return { kind: "invalid_target" };
    if (!node.id || node.number === null || node.number === undefined) return { kind: "invalid_target" };
    const repositoryId = node.repository?.databaseId !== null && node.repository?.databaseId !== undefined ? String(node.repository.databaseId) : null;
    const repositoryNodeId = node.repository?.id ?? null;
    if (!repositoryId || !repositoryNodeId) return { kind: "provider_unavailable" };
    if (expected?.repositoryId && expected.repositoryId !== repositoryId) return { kind: "identity_conflict" };
    if (expected?.repositoryNodeId && expected.repositoryNodeId !== repositoryNodeId) return { kind: "identity_conflict" };
    if (node.viewerCanDelete === false) return { kind: "github_permission_denied" };
    const author = node.author && node.author.__typename === "User" && node.author.databaseId ? String(node.author.databaseId) : null;
    return {
      nodeId: node.id,
      number: node.number,
      title: node.title ?? "",
      repositoryId,
      repositoryNodeId,
      repositoryOwner: node.repository?.owner?.login ?? "",
      repositoryName: node.repository?.name ?? "",
      authorDatabaseId: author,
      viewerCanDelete: node.viewerCanDelete === true,
    };
  }

  async remove(token: string, issueNodeId: string): Promise<"accepted" | ProviderFailure> {
    let data: RawRemove;
    try {
      data = await this.graphql<RawRemove>(token, REMOVE_MUTATION, { id: issueNodeId });
    } catch (error) {
      return mapGraphqlError(error);
    }
    if (!data.deleteIssue) return { kind: "provider_unavailable" };
    return "accepted";
  }

  async absence(token: string, target: FrozenIssueIdentity): Promise<"present" | "absent" | ProviderFailure> {
    let read: RawRepository;
    try {
      read = await this.graphql<RawRepository>(token, REPOSITORY_QUERY, { id: target.repositoryNodeId });
    } catch (error) {
      return mapGraphqlError(error);
    }
    const repository = read.node;
    if (!repository || repository.__typename !== "Repository" || !repository.owner?.login || !repository.name) return { kind: "not_found" };
    if (repository.databaseId === null || repository.databaseId === undefined || String(repository.databaseId) !== target.repositoryId) return { kind: "identity_conflict" };
    const url = `${this.transport.baseUrl}/repos/${repository.owner.login}/${repository.name}/issues/${target.issueNumber}`;
    const init = { method: "GET", headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}` }, redirect: "manual" as const };
    let response: Response;
    try {
      response = await this.transport.fetcher(url, init);
    } catch {
      return { kind: "provider_unavailable" };
    }
    if (response.status === 410) return "absent";
    if (response.status === 404) return { kind: "not_found" };
    if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) return { kind: "identity_conflict" };
    if (response.status === 401) return { kind: "authorization_needed" };
    if (response.status === 403) return { kind: "github_permission_denied" };
    if (response.status === 429) return { kind: "provider_rate_limited", retryAfterSeconds: retryDelay(response.headers) };
    if (response.status >= 200 && response.status < 300) return "present";
    return { kind: "provider_unavailable" };
  }

  private async graphql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
    try {
      return await githubGraphql<T>(this.transport, token, query, variables);
    } catch (error) {
      throw mapGraphqlError(error);
    }
  }
}

export function mapGraphqlError(error: unknown): ProviderFailure {
  if (error && typeof error === "object" && "kind" in error && typeof (error as ProviderFailure).kind === "string") return error as ProviderFailure;
  if (error instanceof RepositoryRateLimitedError) return { kind: "provider_rate_limited", retryAfterSeconds: error.retryAfterSeconds ?? 60 };
  if (error instanceof RepositoryAuthorizationNeededError) return { kind: "authorization_needed" };
  if (error instanceof RepositoryForbiddenError) return { kind: "github_permission_denied" };
  if (error instanceof RepositoryNotFoundError || error instanceof ProjectBoardNotFoundError) return { kind: "not_found" };
  return { kind: "provider_unavailable" };
}

function retryDelay(headers: Headers): number {
  const value = headers.get("retry-after");
  const seconds = value && /^\d+$/.test(value) ? Number(value) : 60;
  return seconds;
}
