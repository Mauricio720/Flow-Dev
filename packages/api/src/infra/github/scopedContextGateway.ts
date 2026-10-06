import type { ScopedContextGateway, ScopedContextResult } from "../../application/github/scopedContextGateway";
import type { IssueContextRequest } from "../../application/github/scopedContextGateway";
import type { RepositoryIdentity } from "../../application/database/dao/projectDao";
import { boundedText, fileEvidence, fullName, issueEvidence, isIssue, repoPath, safePath, safeQuery, safeString, unavailable } from "./scopedContextHelpers";
import { searchProject, type ProjectReader } from "./projectSearch";

const API_ROOT = "https://api.github.com";
const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_EXCERPT_CHARS = 2_000;
type Json = Record<string, unknown>;

export class GitHubScopedContextGateway implements ScopedContextGateway {
  constructor(private readonly fetcher: typeof fetch = fetch) {}
  async pinCommit(input: { token: string; repository: RepositoryIdentity; defaultBranch: string }) {
    const value = await this.get(input.token, `/repos/${repoPath(input.repository)}/commits/${encodeURIComponent(input.defaultBranch)}`);
    const sha = value.sha;
    if (typeof sha !== "string" || !/^[a-f\d]{40}$/i.test(sha)) throw new Error("invalid_commit");
    return sha;
  }
  async execute(input: { token: string; repository: RepositoryIdentity; commitSha: string; request: IssueContextRequest }): Promise<ScopedContextResult> {
    try {
      switch (input.request.tool) {
        case "readProjectFile": return await this.readFile({ ...input, request: input.request });
        case "searchProject": return await searchProject(this.projectReader(input), input, input.request.query);
        case "searchGitHubIssues": return await this.searchIssues({ ...input, request: input.request });
        case "getGitHubIssue": return await this.getIssue({ ...input, request: input.request });
      }
    } catch { return { status: "unavailable", reason: "repository_lookup_unavailable", data: null, evidence: [] }; }
  }
  private async readFile(input: Parameters<ScopedContextGateway["execute"]>[0] & { request: Extract<IssueContextRequest, { tool: "readProjectFile" }> }): Promise<ScopedContextResult> {
    const path = safePath(input.request.path);
    const file = await this.contents(input, path);
    if (file.type !== "file") return unavailable(file.type === "too_large" ? "context_limit" : "unsupported_context");
    const lines = file.text.split(/\r?\n/u);
    const start = input.request.fromLine;
    const end = Math.min(input.request.toLine, lines.length);
    if (start > lines.length) return { status: "empty", data: { path, fromLine: start, toLine: end, content: "" }, evidence: [] };
    const excerpt = lines.slice(start - 1, end).map((line, index) => `${start + index}: ${line}`).join("\n");
    const evidence = fileEvidence(input.repository, input.commitSha, path, start, end, excerpt);
    return { status: "done", data: { path, commitSha: input.commitSha, fromLine: start, toLine: end, url: evidence.url, content: excerpt }, evidence: [evidence] };
  }
  private projectReader(input: Parameters<ScopedContextGateway["execute"]>[0]): ProjectReader {
    return { get: (path) => this.get(input.token, path), file: (path) => this.contents(input, path) };
  }
  private async searchIssues(input: Parameters<ScopedContextGateway["execute"]>[0] & { request: Extract<IssueContextRequest, { tool: "searchGitHubIssues" }> }): Promise<ScopedContextResult> {
    const query = safeQuery(input.request.query);
    const repo = fullName(input.repository);
    const search = await this.get(input.token, `/search/issues?q=${encodeURIComponent(`repo:${repo} ${query} is:issue`)}&sort=updated&order=desc&per_page=5`);
    const items = Array.isArray(search.items) ? search.items.filter((item): item is Json => isIssue(item, input.repository)).slice(0, 5) : [];
    return this.issueResult(input.repository, query, items);
  }
  private async getIssue(input: Parameters<ScopedContextGateway["execute"]>[0] & { request: Extract<IssueContextRequest, { tool: "getGitHubIssue" }> }): Promise<ScopedContextResult> {
    const issue = await this.get(input.token, `/repos/${repoPath(input.repository)}/issues/${input.request.issueNumber}`);
    if (!isIssue(issue, input.repository)) return unavailable("unsupported_context");
    return this.issueResult(input.repository, String(input.request.issueNumber), [issue]);
  }
  private issueResult(repository: RepositoryIdentity, query: string, items: Json[]): ScopedContextResult {
    const issues = items.map((item) => ({ id: String(item.id), number: Number(item.number), title: safeString(item.title, 300), state: safeString(item.state, 40), url: String(item.html_url), updatedAt: safeString(item.updated_at, 40), summary: safeString(item.body, MAX_EXCERPT_CHARS) }));
    const evidence = items.map((item, index) => issueEvidence(repository, item, issues[index]!.summary));
    return { status: issues.length ? "done" : "empty", data: { query, repository: fullName(repository), issues }, evidence };
  }
  private async contents(input: Parameters<ScopedContextGateway["execute"]>[0], path: string) {
    const value = await this.get(input.token, `/repos/${repoPath(input.repository)}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${input.commitSha}`);
    if (value.type !== "file" || typeof value.content !== "string" || value.encoding !== "base64") return { type: safeString(value.type, 20), text: "" };
    const bytes = Buffer.from(value.content.replace(/\s/gu, ""), "base64");
    if (bytes.byteLength > MAX_SOURCE_BYTES) return { type: "too_large", text: "" };
    if (bytes.includes(0)) return { type: "unsupported", text: "" };
    return { type: "file", text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  }
  private async get(token: string, path: string): Promise<Json> {
    const response = await this.fetcher(API_ROOT + path, { headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28" }, signal: AbortSignal.timeout(10_000), redirect: "error" });
    if (!response.ok) throw new Error("github_unavailable");
    const value: unknown = JSON.parse(await boundedText(response, 2 * 1024 * 1024));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_github_response");
    return value as Json;
  }
}
