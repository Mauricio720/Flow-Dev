import { z } from "zod";
import type { GenerationResult } from "../../application/issue-author/issueAuthorGateway";
import { issueDraftSchema } from "../../application/services/tasks/draftRules";

const sourceKinds = ["project-file", "project_file", "github-issue", "github_issue"] as const;
const providerSourceSchema = z.object({ type: z.enum(sourceKinds), path: z.string().nullable(), line: z.number().int().positive().nullable(), repository: z.string().nullable(), issueNumber: z.number().int().positive().nullable(), url: z.string().nullable() });
const providerConsiderationSchema = z.union([z.string(), z.object({ consideration: z.string() })]);
const providerDraftSchema = z.object({
  title: z.string(),
  context: z.string(),
  objective: z.string(),
  constraints: z.array(z.string()),
  relevantContext: z.array(z.object({ context: z.string(), source: providerSourceSchema })),
  productConsiderations: z.array(providerConsiderationSchema),
  references: z.array(providerSourceSchema),
});

export const issueAuthorOutputSchema = z.object({
  status: z.enum(["needs_clarification", "draft_ready"]),
  question: z.string().nullable(),
  draft: providerDraftSchema.nullable(),
});

type ProviderSource = z.infer<typeof providerSourceSchema>;

export function issueAuthorJsonSchema() {
  return z.toJSONSchema(issueAuthorOutputSchema);
}

function canonicalSource(source: ProviderSource) {
  return { ...source, type: source.type.replace("_", "-") as "project-file" | "github-issue" };
}

function sourceIsComplete(source: ReturnType<typeof canonicalSource>) {
  if (source.type === "project-file") return Boolean(source.path);
  return Boolean(source.repository && source.issueNumber && source.url);
}

function toCanonicalDraft(draft: z.infer<typeof providerDraftSchema>) {
  return {
    ...draft,
    relevantContext: draft.relevantContext.map((entry) => ({ statement: entry.context, source: canonicalSource(entry.source) })),
    productConsiderations: draft.productConsiderations.map((entry) => (typeof entry === "string" ? entry : entry.consideration)),
    references: draft.references.map(canonicalSource),
  };
}

function readDraft(draft: z.infer<typeof providerDraftSchema>): GenerationResult | null {
  const canonical = toCanonicalDraft(draft);
  const sources = [...canonical.relevantContext.map((entry) => entry.source), ...canonical.references];
  if (!sources.every(sourceIsComplete)) return null;
  const parsed = issueDraftSchema.safeParse(canonical);
  return parsed.success ? { status: "draft_ready", draft: parsed.data } : null;
}

export function parseIssueAuthorOutput(value: unknown): GenerationResult | null {
  const parsed = issueAuthorOutputSchema.safeParse(value);
  if (!parsed.success) return null;
  const { status, question, draft } = parsed.data;
  if (status === "needs_clarification") return question && question.trim() && draft === null ? { status, question } : null;
  return draft && question === null ? readDraft(draft) : null;
}
