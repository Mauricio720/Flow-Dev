import { createHash } from "node:crypto";
import { matchingEvidence } from "../../../../application/services/tasks/sourceRules";
import { TaskError } from "../../../../application/services/tasks/taskErrors";
import type { IssueDraft, IssueSource } from "../../../../application/services/tasks/taskContracts";
import type { taskEvidence } from "../../schema";

type EvidenceRow = typeof taskEvidence.$inferSelect;
type Binding = { evidenceId: string; fieldPath: string; claimHash: string; verification: "retrieved" | "historical" | "author-edited" };

export function bindGeneratedDraft(draft: IssueDraft, repositoryId: string, operationId: string, evidence: EvidenceRow[], priorValue: unknown): Binding[] {
  const prior = asBindings(priorValue);
  return [...contextBindings(draft, repositoryId, operationId, evidence, prior), ...referenceBindings(draft, repositoryId, operationId, evidence, prior)];
}

function contextBindings(draft: IssueDraft, repositoryId: string, operationId: string, evidence: EvidenceRow[], prior: Binding[]) {
  return draft.relevantContext.map((item, index) => makeBinding({ source: item.source, fieldPath: `relevantContext.${index}.statement`, claim: `${item.statement}\n${JSON.stringify(item.source)}`, repositoryId, operationId, evidence, prior }));
}

function referenceBindings(draft: IssueDraft, repositoryId: string, operationId: string, evidence: EvidenceRow[], prior: Binding[]) {
  return draft.references.map((source, index) => makeBinding({ source, fieldPath: `references.${index}`, claim: JSON.stringify(source), repositoryId, operationId, evidence, prior }));
}

function makeBinding(input: { source: IssueSource; fieldPath: string; claim: string; repositoryId: string; operationId: string; evidence: EvidenceRow[]; prior: Binding[] }): Binding {
  const matches = matchingEvidence(input.source, input.repositoryId, input.evidence.map(toEvidence));
  const claimHash = hash(input.claim);
  const retrieved = matches.find((item) => item.operationId === input.operationId);
  if (retrieved) return { evidenceId: retrieved.id, fieldPath: input.fieldPath, claimHash, verification: "retrieved" };
  const previous = input.prior.find((binding) => binding.claimHash === claimHash && matches.some((item) => item.id === binding.evidenceId));
  if (!previous) throw new TaskError("invalid_agent_source", undefined, new Error(`${input.fieldPath} changed a claim whose evidence was not retrieved again in this operation`));
  return { ...previous, fieldPath: input.fieldPath, verification: previous.verification === "author-edited" ? "author-edited" : "historical" };
}

function asBindings(value: unknown): Binding[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Binding => Boolean(item && typeof item === "object" && typeof (item as Binding).evidenceId === "string" && typeof (item as Binding).fieldPath === "string" && typeof (item as Binding).claimHash === "string" && ["retrieved", "historical", "author-edited"].includes(String((item as Binding).verification))));
}

function toEvidence(row: EvidenceRow) { return { id: row.id, repositoryId: row.repositoryId, type: row.type as "project-file" | "github-issue", path: row.path, commitSha: row.commitSha, fromLine: row.fromLine, toLine: row.toLine, issueId: row.issueId, issueNumber: row.issueNumber, url: row.url, operationId: row.operationId }; }
function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
