import { GITHUB_TIMEOUT_MS, githubRequest } from "./githubRequest";
import { ProjectBoardNotFoundError } from "../../application/github/projectBoardGateway";
import { RepositoryAuthorizationNeededError, RepositoryForbiddenError, RepositoryRateLimitedError, RepositoryUnavailableError } from "../../application/github/repositoryErrors";

const ACCEPT = "application/vnd.github+json";
const RATE_LIMIT_WAIT_SECONDS = 60;
type GraphqlError = { type?: string };
export type GraphqlTransport = { fetcher: typeof fetch; baseUrl: string; timeoutMs: number };

export const DEFAULT_TRANSPORT = (fetcher: typeof fetch = fetch, baseUrl = "https://api.github.com", timeoutMs = GITHUB_TIMEOUT_MS): GraphqlTransport => ({ fetcher, baseUrl, timeoutMs });

export async function githubGraphql<T>(transport: GraphqlTransport, token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const init = { method: "POST", headers: { accept: ACCEPT, "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ query, variables }) };
  const { body } = await githubRequest<{ data?: T; errors?: GraphqlError[] }>(transport.fetcher, { url: transport.baseUrl + "/graphql", init }, transport.timeoutMs);
  if (body.errors?.length) throw classifyGraphqlErrors(body.errors);
  if (!body.data) throw new RepositoryUnavailableError();
  return body.data;
}

export function classifyGraphqlErrors(errors: GraphqlError[]) {
  const types = errors.map((error) => error.type);
  if (types.includes("INSUFFICIENT_SCOPES")) return new RepositoryAuthorizationNeededError("Project board scope is missing");
  if (types.includes("RATE_LIMITED")) return new RepositoryRateLimitedError(RATE_LIMIT_WAIT_SECONDS);
  if (types.includes("NOT_FOUND")) return new ProjectBoardNotFoundError();
  if (types.includes("FORBIDDEN")) return new RepositoryForbiddenError();
  return new RepositoryUnavailableError();
}
