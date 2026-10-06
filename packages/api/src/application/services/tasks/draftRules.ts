import { createHash } from "node:crypto";
import { z } from "zod";
import { TASK_LABELS, type TaskLabel } from "../../../schemas/taskLabels";
import { resolveLabels } from "./labelRules";
import { TaskError } from "./taskErrors";
import type { IssueDraft, IssueSource } from "./taskContracts";

const MAX_TEXT = 10_000;
const MAX_TITLE = 256;
const MAX_BODY_BYTES = 60_000;
const MIN_PRIORITY_POINTS = 1;
const MAX_PRIORITY_POINTS = 5;
const sourceSchema = z.object({ type: z.enum(["project-file", "github-issue"]), path: z.string().nullable(), line: z.number().int().positive().nullable(), repository: z.string().nullable(), issueNumber: z.number().int().positive().nullable(), url: z.string().nullable() });
export const issueDraftSchema = z.object({ title: z.string().max(MAX_TITLE), context: z.string().max(MAX_TEXT), objective: z.string().max(MAX_TEXT), constraints: z.array(z.string().max(MAX_TEXT)).max(100), relevantContext: z.array(z.object({ statement: z.string().max(MAX_TEXT), source: sourceSchema })).max(100), productConsiderations: z.array(z.string().max(MAX_TEXT)).max(3), references: z.array(sourceSchema).max(100), priorityPoints: z.number().int().min(MIN_PRIORITY_POINTS).max(MAX_PRIORITY_POINTS).nullable().default(null), labels: z.array(z.enum(TASK_LABELS)).max(TASK_LABELS.length).default([]) });

export function parseIssueDraft(value: unknown): IssueDraft {
  assertDraftLimits(value);
  const parsed = issueDraftSchema.safeParse(value);
  if (!parsed.success) throw new TaskError("invalid_draft", z.flattenError(parsed.error).fieldErrors as Record<string, string>);
  return { ...parsed.data, labels: resolveLabels(parsed.data) };
}

export function storedDraftLabels(value: unknown): TaskLabel[] {
  try { return parseIssueDraft(value).labels; } catch { return []; }
}

export function validatePublicationDraft(draft: IssueDraft) {
  assertDraftLimits(draft);
  const fieldErrors: Record<string, string> = {};
  for (const field of ["title", "context", "objective"] as const) if (!draft[field].trim()) fieldErrors[field] = "required";
  if (draft.title.length > MAX_TITLE) fieldErrors.title = "input_limit";
  if (Object.keys(fieldErrors).length) throw new TaskError("invalid_draft", fieldErrors);
  const bodyMarkdown = renderIssueBody(draft);
  if (Buffer.byteLength(bodyMarkdown, "utf8") > MAX_BODY_BYTES) throw new TaskError("input_limit", { bodyMarkdown: "input_limit" });
  return bodyMarkdown;
}

function assertDraftLimits(value: unknown) {
  if (!value || typeof value !== "object") return;
  const draft = value as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};
  if (typeof draft.title === "string" && [...draft.title].length > MAX_TITLE) fieldErrors.title = "input_limit";
  for (const field of ["context", "objective"] as const) if (typeof draft[field] === "string" && [...draft[field] as string].length > MAX_TEXT) fieldErrors[field] = "input_limit";
  for (const field of ["constraints", "relevantContext", "references"] as const) if (Array.isArray(draft[field]) && draft[field].length > 100) fieldErrors[field] = "input_limit";
  if (Array.isArray(draft.productConsiderations) && draft.productConsiderations.length > 3) fieldErrors.productConsiderations = "input_limit";
  if (Object.keys(fieldErrors).length) throw new TaskError("input_limit", fieldErrors);
}

export function renderIssueBody(draft: IssueDraft) {
  assertSafeSources(draft);
  const sections = [section("Contexto", draft.context), section("Objetivo", draft.objective)];
  addListSection(sections, "Restrições", draft.constraints);
  addRelevantSection(sections, draft.relevantContext);
  addListSection(sections, "Considerações de produto", draft.productConsiderations);
  addReferencesSection(sections, draft.references);
  return sections.filter(Boolean).join("\n\n");
}

export function previewHash(input: { revisionId: string; body: string; title: string; repositoryId: string; owner: string; name: string; publisherGithubId: string; labels: readonly string[] }) {
  const source = [input.revisionId, input.title, input.body, input.labels.join(","), input.repositoryId, input.owner, input.name, input.publisherGithubId].join("\n");
  return createHash("sha256").update(source).digest("hex");
}

function section(title: string, value: string) { return `## ${title}\n\n${value}`; }
function addListSection(sections: string[], title: string, entries: string[]) { if (entries.length) sections.push(section(title, entries.map((entry) => `- ${entry}`).join("\n"))); }
function addRelevantSection(sections: string[], entries: IssueDraft["relevantContext"]) { if (entries.length) sections.push(section("Contexto relevante", entries.map(({ statement, source }) => `- ${statement}${formatSource(source)}`).join("\n"))); }
function addReferencesSection(sections: string[], entries: IssueSource[]) { if (entries.length) sections.push(section("Referências", entries.map((source) => `- ${formatSourceLabel(source)}${safeLink(source.url)}`).join("\n"))); }
function formatSource(source: IssueSource) { return ` (${formatSourceLabel(source)}${safeLink(source.url)})`; }
function formatSourceLabel(source: IssueSource) { return source.type === "project-file" ? `${source.path ?? "arquivo"}${source.line ? `:${source.line}` : ""}` : `${source.repository ?? "repositório"}#${source.issueNumber ?? "?"}`; }
function safeLink(url: string | null) { return url ? ` — [abrir](${url})` : ""; }
function assertSafeSources(draft: IssueDraft) {
  const sources = [...draft.references, ...draft.relevantContext.map((item) => item.source)];
  for (const source of sources) if (source.url && !isGitHubUrl(source.url)) throw new TaskError("unsafe_source");
}
function isGitHubUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "github.com" || url.hostname.endsWith(".github.com")); } catch { return false; } }
