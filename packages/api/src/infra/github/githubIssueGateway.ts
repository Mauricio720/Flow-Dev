import type { ApprovedIssueRequest, CreationOutcome, GitHubIssueGateway, GitHubIssueLabelGateway, IssueEligibility, IssueLabelOutcome, IssueLabelRequest, IssueReceipt, LabelDefinitionOutcome, LabelDefinitionRequest } from "../../application/github/issueGateway";
import { TaskError } from "../../application/services/tasks/taskErrors";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
type Fetcher = typeof fetch;
type JsonRecord = Record<string, unknown>;

export class GitHubHttpIssueGateway implements GitHubIssueGateway, GitHubIssueLabelGateway {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  async eligibility(input: { repositoryId: string; owner: string; name: string; token: string; publisherGithubId: string }): Promise<IssueEligibility> {
    if (!input.token.trim()) throw new TaskError("repository_authorization_needed");
    const profile = await this.get(input.token, "/user");
    if (String(profile.id) !== input.publisherGithubId) throw new TaskError("identity_mismatch");
    const repository = await this.get(input.token, `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.name)}`);
    if (String(repository.id) !== input.repositoryId) throw new TaskError("destination_unavailable");
    const permissions = asRecord(repository.permissions);
    return { repositoryId: input.repositoryId, owner: input.owner, name: input.name, publisherGithubId: input.publisherGithubId, publisherLogin: typeof profile.login === "string" ? profile.login : null, archived: repository.archived === true, issuesEnabled: repository.has_issues === true, canRead: permissions.pull === true, canCreateIssues: permissions.pull === true || permissions.push === true || permissions.triage === true };
  }

  async create(input: ApprovedIssueRequest): Promise<CreationOutcome> {
    let response: Response;
    try { response = await this.fetcher(issueUrl(input), requestOptions(input, issuePayload(input))); }
    catch { return { status: "uncertain", reason: "delivery_unknown" }; }
    if (response.status === 201) return this.created(response, input);
    if ([400, 401, 403, 404, 410, 422, 429].includes(response.status)) return rejected(response);
    return { status: "uncertain", reason: "delivery_unknown" };
  }

  async verify(input: ApprovedIssueRequest & { issueNumber: number }) {
    const issue = await this.get(input.token, `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.name)}/issues/${input.issueNumber}`);
    return receipt(issue, input);
  }

  async label(input: IssueLabelRequest): Promise<IssueLabelOutcome> {
    let response: Response;
    try { response = await this.fetcher(`${issueUrl(input)}/${input.issueNumber}/labels`, requestOptions(input, { labels: input.labels })); }
    catch (error) { throw new TaskError("provider_unavailable", undefined, error); }
    if (response.ok) return "labelled";
    if (response.status === 403) return "denied";
    if (response.status === 404 || response.status === 410) return "missing";
    throw new TaskError(response.status === 429 ? "provider_rate_limited" : "provider_unavailable");
  }

  async define(input: LabelDefinitionRequest): Promise<LabelDefinitionOutcome> {
    const appearance = { color: input.color, description: input.description };
    const created = await this.send(labelsUrl(input), input, { name: input.label, ...appearance });
    if (created.status === 201) return "created";
    if (created.status !== 422) return definitionFailure(created.status);
    if (!input.overwrite) return "kept";
    const updated = await this.send(`${labelsUrl(input)}/${encodeURIComponent(input.label)}`, input, appearance, "PATCH");
    return updated.ok ? "updated" : definitionFailure(updated.status);
  }

  private async send(url: string, input: { token: string }, body: unknown, method = "POST") {
    try { return await this.fetcher(url, requestOptions(input, body, method)); }
    catch (error) { throw new TaskError("provider_unavailable", undefined, error); }
  }

  private async created(response: Response, input: ApprovedIssueRequest): Promise<CreationOutcome> {
    try { return { status: "created", receipt: receipt(asRecord(await response.json()), input) }; }
    catch { return { status: "uncertain", reason: "invalid_creation_receipt" }; }
  }

  private async get(token: string, path: string): Promise<JsonRecord> {
    let response: Response;
    try { response = await this.fetcher(`${GITHUB_API}${path}`, requestOptions({ token }, undefined, "GET")); }
    catch { throw new TaskError("provider_unavailable"); }
    if (response.status === 429) throw new TaskError("provider_rate_limited");
    if (!response.ok) throw new TaskError("destination_unavailable");
    try { return asRecord(await response.json()); }
    catch (error) { if (error instanceof TaskError) throw error; throw new TaskError("invalid_provider_response", undefined, error); }
  }
}

function requestOptions(input: { token: string }, body?: unknown, method = "POST"): RequestInit {
  return { method, headers: { accept: "application/vnd.github+json", authorization: `Bearer ${input.token}`, "x-github-api-version": GITHUB_API_VERSION, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10_000), redirect: "error" };
}
function issuePayload(input: ApprovedIssueRequest) { return { title: input.title, body: input.body, ...(input.labels.length ? { labels: input.labels } : {}) }; }
function labelsUrl(input: { owner: string; name: string }) { return `${GITHUB_API}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.name)}/labels`; }
function definitionFailure(status: number): LabelDefinitionOutcome { if (status === 403 || status === 404) return "denied"; throw new TaskError(status === 429 ? "provider_rate_limited" : "provider_unavailable"); }
function issueUrl(input: { owner: string; name: string }) { return `${GITHUB_API}/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.name)}/issues`; }
function rejected(response: Response): CreationOutcome { return { status: "rejected", reason: rejectionReason(response.status), ...(response.status === 429 ? { retryAfterSeconds: retryAfter(response.headers.get("retry-after")) } : {}) }; }
function rejectionReason(status: number) { return status === 429 ? "provider_rate_limited" : status === 410 ? "issues_disabled" : status === 422 ? "content_rejected" : status === 401 ? "repository_authorization_needed" : status === 403 ? "issue_permission_denied" : "destination_unavailable"; }
function retryAfter(value: string | null) { const seconds = Number(value); return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined; }
function asRecord(value: unknown): JsonRecord { if (!value || typeof value !== "object" || Array.isArray(value)) throw new TaskError("invalid_provider_response"); return value as JsonRecord; }

function receipt(value: JsonRecord, input: ApprovedIssueRequest): IssueReceipt {
  const id = value.id;
  const number = value.number;
  const user = asRecord(value.user);
  const url = value.html_url;
  if (value.pull_request || (!Number.isSafeInteger(id) && typeof id !== "string") || !value.node_id || !Number.isSafeInteger(number) || Number(number) < 1 || String(user.id) !== input.publisherGithubId || typeof url !== "string" || !isExpectedIssueUrl(url, input, Number(number)) || typeof value.created_at !== "string" || Number.isNaN(Date.parse(value.created_at))) throw new TaskError("invalid_provider_response");
  return { issueId: String(id), nodeId: String(value.node_id), number: Number(number), url, repositoryId: input.repositoryId, publisherGithubId: input.publisherGithubId, createdAt: value.created_at };
}

function isExpectedIssueUrl(value: string, input: ApprovedIssueRequest, number: number) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "github.com" && url.pathname === `/${input.owner}/${input.name}/issues/${number}` && !url.search && !url.hash; } catch { return false; }
}
