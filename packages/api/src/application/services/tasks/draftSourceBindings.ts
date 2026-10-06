import { createHash } from "node:crypto";
import type { TaskEvidenceRecord, TaskRevisionRecord } from "../../database/dao/taskDao";
import type { IssueDraft, IssueSource } from "./taskContracts";
import { validateSource } from "./sourceRules";
import { TaskError } from "./taskErrors";

type Binding = { evidenceId: string; fieldPath: string; claimHash: string; verification: "retrieved" | "historical" | "author-edited" };

export function buildManualEvidenceBindings(draft: IssueDraft, repositoryId: string, evidence: TaskEvidenceRecord[], revision: TaskRevisionRecord | null): Binding[] {
  const prior = parseBindings(revision?.evidenceBindings);
  const items = [
    ...draft.relevantContext.map((item, index) => ({ source: item.source, fieldPath: `relevantContext.${index}.statement`, claim: `${item.statement}\n${JSON.stringify(item.source)}` })),
    ...draft.references.map((source, index) => ({ source, fieldPath: `references.${index}`, claim: JSON.stringify(source) })),
  ];
  return items.map((item) => bindSource(item, repositoryId, evidence, prior));
}

function bindSource(item: { source: IssueSource; fieldPath: string; claim: string }, repositoryId: string, evidence: TaskEvidenceRecord[], prior: Binding[]): Binding {
  const match = validateSource(item.source, repositoryId, evidence);
  const claimHash = hash(item.claim);
  const previous = prior.find((binding) => binding.fieldPath === item.fieldPath && binding.evidenceId === match.id && binding.claimHash === claimHash);
  return { evidenceId: match.id, fieldPath: item.fieldPath, claimHash, verification: previous?.verification ?? "author-edited" };
}

function parseBindings(value: unknown): Binding[] {
  if (!Array.isArray(value)) return [];
  const valid = value.filter((item): item is Binding => Boolean(item && typeof item === "object" && typeof (item as Binding).evidenceId === "string" && typeof (item as Binding).fieldPath === "string" && typeof (item as Binding).claimHash === "string" && ["retrieved", "historical", "author-edited"].includes(String((item as Binding).verification))));
  if (valid.length !== value.length) throw new TaskError("invalid_stored_content");
  return valid;
}

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
