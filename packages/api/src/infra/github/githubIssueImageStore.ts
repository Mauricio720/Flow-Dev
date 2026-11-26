import type { IssueImageStore, IssueImageWrite } from "../../application/github/issueImageStore";
import { TaskError } from "../../application/services/tasks/taskErrors";

import { githubApiBase } from "./githubRequest";
const GITHUB_API_VERSION = "2026-03-10";
const REQUEST_TIMEOUT_MS = 20_000;
const BRANCH_README_PATH = "README.md";
const BRANCH_README = "Imagens anexadas às issues publicadas pelo Flow Dev.\n";
const BRANCH_COMMIT_MESSAGE = "Create Flow Dev issue assets branch";
const BLOB_FILE_MODE = "100644";
const ALREADY_EXISTS_STATUS = 422;
const DENIED_STATUSES = [401, 403, 404];
const RATE_LIMITED_STATUS = 429;

type Fetcher = typeof fetch;
type Repository = Pick<IssueImageWrite, "owner" | "name" | "token">;
type WriteRequest = { method: "POST" | "PUT"; body: unknown };

export class GitHubHttpIssueImageStore implements IssueImageStore {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  async put(input: IssueImageWrite) {
    if (await this.exists(input)) return;
    await this.ensureBranch(input);
    const content = Buffer.from(input.content).toString("base64");
    const response = await this.send(input, contentsPath(input.path), { method: "PUT", body: { message: input.message, content, branch: input.branch } });
    if (response.ok) return;
    if (response.status === ALREADY_EXISTS_STATUS && await this.exists(input)) return;
    throw writeFailure(response.status);
  }

  private async exists(input: IssueImageWrite) {
    const response = await this.send(input, `${contentsPath(input.path)}?ref=${encodeURIComponent(input.branch)}`);
    if (response.ok) return true;
    if (response.status === 404) return false;
    throw writeFailure(response.status);
  }

  private async ensureBranch(input: IssueImageWrite) {
    const response = await this.send(input, `git/ref/heads/${encodeURIComponent(input.branch)}`);
    if (response.ok) return;
    if (response.status !== 404) throw writeFailure(response.status);
    await this.createOrphanBranch(input);
  }

  private async createOrphanBranch(input: IssueImageWrite) {
    const tree = await this.createObject(input, "git/trees", { tree: [{ path: BRANCH_README_PATH, mode: BLOB_FILE_MODE, type: "blob", content: BRANCH_README }] });
    const commit = await this.createObject(input, "git/commits", { message: BRANCH_COMMIT_MESSAGE, tree, parents: [] });
    const response = await this.send(input, "git/refs", { method: "POST", body: { ref: `refs/heads/${input.branch}`, sha: commit } });
    if (response.ok || response.status === ALREADY_EXISTS_STATUS) return;
    throw writeFailure(response.status);
  }

  private async createObject(repository: Repository, path: string, body: unknown) {
    const response = await this.send(repository, path, { method: "POST", body });
    if (!response.ok) throw writeFailure(response.status);
    const payload: unknown = await response.json().catch(() => null);
    const sha = payload && typeof payload === "object" && "sha" in payload ? payload.sha : null;
    if (typeof sha !== "string") throw new TaskError("invalid_provider_response");
    return sha;
  }

  private async send(repository: Repository, path: string, request?: WriteRequest) {
    const url = `${githubApiBase()}/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/${path}`;
    try { return await this.fetcher(url, requestOptions(repository.token, request)); }
    catch (error) { throw new TaskError("provider_unavailable", undefined, error); }
  }
}

function contentsPath(path: string) {
  return `contents/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function requestOptions(token: string, request?: WriteRequest): RequestInit {
  const headers = { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": GITHUB_API_VERSION, ...(request ? { "content-type": "application/json" } : {}) };
  return { method: request?.method ?? "GET", headers, ...(request ? { body: JSON.stringify(request.body) } : {}), signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), redirect: "error" };
}

function writeFailure(status: number) {
  if (DENIED_STATUSES.includes(status)) return new TaskError("image_permission_denied");
  if (status === RATE_LIMITED_STATUS) return new TaskError("provider_rate_limited");
  return new TaskError("provider_unavailable");
}
