import { GITHUB_TIMEOUT_MS, githubRequest } from "./githubRequest";
import type { GitHubRepositoryGateway, RepositoryContext, RepositoryPage } from "../../application/github/repositoryGateway";
import type { RepositoryIdentity, RepositoryVisibility } from "../../application/database/dao/projectDao";
import { decodeRepositoryPage } from "../../application/pagination/cursor";
import { RepositoryIdentityMismatchError, RepositoryRateLimitedError, RepositoryNotFoundError, RepositoryUnavailableError } from "../../application/github/repositoryErrors";

const ACCEPT = "application/vnd.github+json";
export class GitHubHttpRepositoryGateway implements GitHubRepositoryGateway {
  constructor(private readonly fetcher: typeof fetch = fetch, private readonly baseUrl = "https://api.github.com", private readonly timeoutMs = GITHUB_TIMEOUT_MS) {}
  async listAccessible(token: string, cursor?: string): Promise<RepositoryPage> {
    const page = parsePage(cursor);
    const response = await this.request<unknown[]>(`/user/repos?affiliation=owner%2Ccollaborator%2Corganization_member&per_page=100&page=${page}`, token);
    const items = response.body.map(toIdentity);
    return { items, nextCursor: nextPage(response.headers.get("link")) };
  }
  async resolve(token: string, nodeId: string) {
    const response = await githubRequest<{ data?: { node?: { databaseId?: number; id?: string; name?: string; owner?: { login?: string }; visibility?: string; isArchived?: boolean } | null }; errors?: { type?: string }[] }>(this.fetcher, { url: this.baseUrl + "/graphql", init: { method: "POST", headers: { accept: ACCEPT, "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ query: "query($id:ID!){ node(id:$id){ ... on Repository { databaseId,id,name,owner{login},visibility,isArchived } } }", variables: { id: nodeId } }) } });
    const body = response.body;
    if (body.errors?.some((error) => error.type === "RATE_LIMITED")) throw new RepositoryRateLimitedError(60);
    if (body.errors?.some((error) => error.type !== "NOT_FOUND")) throw new RepositoryUnavailableError();
    if (!body.data?.node) throw new RepositoryNotFoundError();
    const identity = toIdentity({ id: body.data.node.databaseId, node_id: body.data.node.id, name: body.data.node.name, owner: body.data.node.owner, visibility: body.data.node.visibility?.toLowerCase(), archived: body.data.node.isArchived });
    if (identity.nodeId !== nodeId) throw new RepositoryIdentityMismatchError();
    return identity;
  }
  async resolvePath(token: string, owner: string, name: string, expectedGithubId?: string) {
    const response = await this.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, token);
    const identity = toIdentity(response.body);
    if (expectedGithubId && identity.githubId !== expectedGithubId) throw new RepositoryIdentityMismatchError();
    return identity;
  }
  async context(token: string, repository: RepositoryIdentity): Promise<RepositoryContext> {
    const current = await this.resolvePath(token, repository.owner, repository.name);
    if (current.githubId !== repository.githubId) throw new RepositoryIdentityMismatchError();
    return { repository: current, defaultBranch: await this.defaultBranch(token, current) };
  }
  private async defaultBranch(token: string, repository: RepositoryIdentity) {
    const response = await this.request<{ id: number; default_branch?: string }>(`/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`, token);
    if (String(response.body.id) !== repository.githubId) throw new RepositoryIdentityMismatchError();
    return response.body.default_branch ?? "main";
  }
  private request<T = unknown>(path: string, token: string) {
    return githubRequest<T>(this.fetcher, { url: this.baseUrl + path, init: { headers: { accept: ACCEPT, ...(token ? { authorization: `Bearer ${token}` } : {}) } } }, this.timeoutMs);
  }
}

function parsePage(cursor?: string) { const page = decodeRepositoryPage(cursor); if (page === null) throw new Error("Invalid GitHub cursor"); return page; }
function nextPage(link: string | null) { const match = link?.match(/[?&]page=(\d+)[^>]*>;\s*rel="next"/); return match?.[1] ? Buffer.from(match[1]).toString("base64url") : null; }
function toIdentity(value: unknown): RepositoryIdentity { const row = value as { id?: number; node_id?: string; owner?: { login?: string }; name?: string; visibility?: string; private?: boolean; archived?: boolean; isArchived?: boolean }; if (!row.id || !row.node_id || !row.owner?.login || !row.name) throw new RepositoryUnavailableError(); return { githubId: String(row.id), nodeId: row.node_id, owner: row.owner.login, name: row.name, visibility: visibility(row.visibility, row.private), archived: row.archived === true || row.isArchived === true }; }
function visibility(value: string | undefined, isPrivate: boolean | undefined): RepositoryVisibility { const normalized = value?.toLowerCase(); if (normalized === "internal") return "internal"; return isPrivate || normalized === "private" ? "private" : "public"; }
