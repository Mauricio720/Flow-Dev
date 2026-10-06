import { createHash } from "node:crypto";
import { TaskError } from "./taskErrors";
import type { IssueSource } from "./taskContracts";

export type EvidenceRecord = { id: string; repositoryId: string; type: "project-file" | "github-issue"; path: string | null; commitSha: string | null; fromLine: number | null; toLine: number | null; issueId: string | null; issueNumber: number | null; url: string | null; operationId?: string };

export function matchingEvidence(source: IssueSource, repositoryId: string, evidence: EvidenceRecord[]) {
  const matches = evidence.filter((item) => matchesEvidence(source, repositoryId, item));
  if (!matches.length) throw new TaskError("invalid_agent_source", undefined, new Error(`no retrieved evidence matches ${describeSource(source)}`));
  return matches;
}

export function validateSource(source: IssueSource, repositoryId: string, evidence: EvidenceRecord[]) {
  return matchingEvidence(source, repositoryId, evidence)[0]!;
}

export function sourceClaimHash(statement: string) { return createHash("sha256").update(statement).digest("hex"); }

export function classifySource(input: { previousHash?: string; statement: string; generated: boolean }) {
  const claimHash = sourceClaimHash(input.statement);
  if (input.previousHash === claimHash) return { claimHash, verification: "historical" as const };
  if (!input.generated) return { claimHash, verification: "author-edited" as const };
  return { claimHash, verification: "retrieved" as const };
}

function describeSource(source: IssueSource) {
  return source.type === "project-file" ? `${source.path}:${source.line} (${source.url ?? "no url"})` : `issue #${source.issueNumber} (${source.url})`;
}

function matchesEvidence(source: IssueSource, repositoryId: string, item: EvidenceRecord) {
  if (item.repositoryId !== repositoryId || item.type !== source.type) return false;
  if (source.type === "project-file") return source.path === item.path && source.line !== null && source.line >= (item.fromLine ?? 0) && source.line <= (item.toLine ?? 0) && Boolean(item.commitSha) && sameFileReference(source.url, item.url);
  return source.issueNumber === item.issueNumber && source.url === item.url && Boolean(item.issueId);
}

function sameFileReference(sourceUrl: string | null, evidenceUrl: string | null) {
  if (!sourceUrl) return true;
  if (!evidenceUrl) return false;
  const source = parseFileReference(sourceUrl);
  const evidence = parseFileReference(evidenceUrl);
  return source !== null && evidence !== null && source === evidence;
}

function parseFileReference(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com") return null;
    const match = url.pathname.match(/^\/([^/]+\/[^/]+)\/blob\/([^/]+)\/(.+)$/);
    return match ? [match[1], match[2], match[3]].join("/") : null;
  } catch { return null; }
}
