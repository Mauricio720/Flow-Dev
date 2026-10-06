import type { SourceReference, TaskRevision } from "./contract";

export type SourceKind = "project" | "github";
export type Verification = "retrieved" | "historical" | "author-edited" | "unverified";
export type DraftSource = { key: string; kind: SourceKind; label: string; statement: string | null; url: string | null; unsafeUrl: boolean; verification: Verification };

export const VERIFICATION_LABEL: Record<Verification, string> = {
  retrieved: "Verificada na consulta",
  historical: "Histórica",
  "author-edited": "Editada pela pessoa autora",
  unverified: "Sem verificação registrada",
};

const PROJECT_FILE = "project-file";
const SECURE_PROTOCOL = "https:";
const GITHUB_HOST = "github.com";
const KNOWN_VERIFICATIONS: string[] = ["retrieved", "historical", "author-edited"];
const MISSING_PATH = "arquivo sem caminho registrado";
const MISSING_ISSUE = "Issue sem número registrado";

export function sourceKind(source: SourceReference): SourceKind {
  return source.type === PROJECT_FILE ? "project" : "github";
}

export function sourceLabel(source: SourceReference) {
  if (source.type === PROJECT_FILE) return source.path ? `${source.path}${source.line ? `:${source.line}` : ""}` : MISSING_PATH;
  return source.issueNumber ? `${source.repository ?? ""}#${source.issueNumber}` : MISSING_ISSUE;
}

export function safeGitHubUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === SECURE_PROTOCOL && url.hostname === GITHUB_HOST ? url.toString() : null;
  } catch {
    return null;
  }
}

function verificationByPath(bindings: unknown[]) {
  const entries = bindings.flatMap((binding) => {
    if (!binding || typeof binding !== "object" || !("fieldPath" in binding) || !("verification" in binding)) return [];
    const verification = String(binding.verification);
    return KNOWN_VERIFICATIONS.includes(verification) ? [[String(binding.fieldPath), verification as Verification] as const] : [];
  });
  return new Map(entries);
}

function toDraftSource(input: { path: string; source: SourceReference; statement: string | null }, verifications: Map<string, Verification>): DraftSource {
  const url = safeGitHubUrl(input.source.url);
  return { key: input.path, kind: sourceKind(input.source), label: sourceLabel(input.source), statement: input.statement, url, unsafeUrl: Boolean(input.source.url) && !url, verification: verifications.get(input.path) ?? "unverified" };
}

export function draftSources(revision: Pick<TaskRevision, "draft" | "evidenceBindings">): DraftSource[] {
  const verifications = verificationByPath(revision.evidenceBindings);
  const context = revision.draft.relevantContext.map((entry, index) => ({ path: `relevantContext.${index}.statement`, source: entry.source, statement: entry.statement }));
  const references = revision.draft.references.map((source, index) => ({ path: `references.${index}`, source, statement: null }));
  return [...context, ...references].map((entry) => toDraftSource(entry, verifications));
}
