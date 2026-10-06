import { createHash } from "node:crypto";
import type { ScopedContextResult, ScopedEvidence } from "../../application/github/scopedContextGateway";
import type { RepositoryIdentity } from "../../application/database/dao/projectDao";

type Json = Record<string, unknown>;

export function unavailable(reason: string): ScopedContextResult { return { status: "unavailable", reason, data: null, evidence: [] }; }
export function fullName(repository: RepositoryIdentity) { return `${repository.owner}/${repository.name}`; }
export function repoPath(repository: RepositoryIdentity) { return `${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`; }
export function safeQuery(value: string) { if (/(^|\s)(repo|org|user|owner|path|filename):/iu.test(value) || /https?:\/\//iu.test(value)) throw new Error("invalid_query"); return value.trim(); }
export function safePath(value: string) { const path = value.replaceAll("\\", "/"); if (!path || path.startsWith("/") || path.includes("\0") || path.split("/").some((part) => !part || part === "." || part === ".." || part.startsWith("."))) throw new Error("invalid_path"); return path; }
export function isIssue(value: Json, repository: RepositoryIdentity): boolean {
  if (value.pull_request || !Number.isSafeInteger(value.id) || !Number.isSafeInteger(value.number) || Number(value.number) < 1 || typeof value.html_url !== "string") return false;
  try { const url = new URL(value.html_url); return url.protocol === "https:" && url.hostname === "github.com" && url.pathname === `/${repository.owner}/${repository.name}/issues/${value.number}` && !url.search && !url.hash; }
  catch { return false; }
}
export function safeString(value: unknown, max: number) { return typeof value === "string" ? value.slice(0, max) : ""; }
export function fileEvidence(repository: RepositoryIdentity, commitSha: string, path: string, fromLine: number, toLine: number, excerpt: string): ScopedEvidence { const url = `https://github.com/${repository.owner}/${repository.name}/blob/${commitSha}/${path.split("/").map(encodeURIComponent).join("/")}`; return { type: "project-file", path, commitSha, fromLine, toLine, issueId: null, issueNumber: null, url, sourceHash: createHash("sha256").update(excerpt).digest("hex"), excerpt }; }
export function issueEvidence(repository: RepositoryIdentity, issue: Json, excerpt: string): ScopedEvidence { return { type: "github-issue", path: null, commitSha: null, fromLine: null, toLine: null, issueId: String(issue.id), issueNumber: Number(issue.number), url: String(issue.html_url), sourceHash: createHash("sha256").update(excerpt).digest("hex"), excerpt }; }
export async function boundedText(response: Response, limit: number) {
  if (!response.body) throw new Error("empty_response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error("response_limit"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
