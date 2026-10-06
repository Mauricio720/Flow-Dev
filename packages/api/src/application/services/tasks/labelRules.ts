import { GENERIC_TASK_LABEL, TASK_LABELS, type TaskLabel } from "../../../schemas/taskLabels";
import type { IssueDraft } from "./taskContracts";

type AreaLabel = Exclude<TaskLabel, typeof GENERIC_TASK_LABEL>;
type LabelSignals = { paths: RegExp; terms: RegExp };
type ClassifiableDraft = Pick<IssueDraft, "title" | "context" | "objective" | "constraints" | "relevantContext" | "productConsiderations" | "references">;

const PROJECT_FILE = "project-file";
const CITED_FILE_WEIGHT = 3;
const MINIMUM_SCORE = 2;
const DOMINANCE_RATIO = 0.35;
const DIACRITICS = /\p{Diacritic}/gu;
const SIGNALS: Record<AreaLabel, LabelSignals> = {
  frontend: {
    paths: /(^|\/)(components|pages|views|styles|hooks|features|public|web|frontend)\/|\.(tsx|jsx|vue|svelte|css|scss|html)$/i,
    terms: /\b(front-?end|telas?|botao|botoes|layout|interface|componentes?|paginas?|formularios?|css|responsiv\w*|modal|ui|ux)\b/g,
  },
  backend: {
    paths: /(^|\/)(api|server|backend|controllers?|services?|routers?|dao|repositories|migrations?|drizzle|prisma|database|db|workers?|use-?cases?|domain|queries)\/|\.(sql|py|go|rb|java|php|cs|rs)$/i,
    terms: /\b(back-?end|api|endpoints?|banco de dados|migrations?|migracao|servidor|query|queries|workers?|webhooks?|trpc|controllers?|dao|tabelas?)\b/g,
  },
  infra: {
    paths: /(^|\/)(\.github|terraform|k8s|helm|deploy)\/|(^|\/)(dockerfile|docker-compose[^/]*)$|\.tf$/i,
    terms: /\b(infra|infraestrutura|deploys?|pipelines?|docker|kubernetes|ci)\b/g,
  },
  docs: {
    paths: /(^|\/)docs?\/|\.mdx?$/i,
    terms: /\b(documentacao|documentar|readme|docs)\b/g,
  },
};
const AREA_LABELS = Object.keys(SIGNALS) as AreaLabel[];

export function classifyLabels(draft: ClassifiableDraft): TaskLabel[] {
  const paths = sourcePaths(draft);
  const text = searchableText(draft);
  const scores = AREA_LABELS.map((label) => ({ label, score: signalScore(SIGNALS[label], paths, text) }));
  const strongest = Math.max(...scores.map((entry) => entry.score));
  const threshold = Math.max(MINIMUM_SCORE, strongest * DOMINANCE_RATIO);
  const matched = scores.filter((entry) => entry.score >= threshold).map((entry) => entry.label);
  return matched.length ? matched : [GENERIC_TASK_LABEL];
}

function signalScore(signals: LabelSignals, paths: string[], text: string) {
  const citedFiles = paths.filter((path) => signals.paths.test(path)).length;
  return citedFiles * CITED_FILE_WEIGHT + (text.match(signals.terms)?.length ?? 0);
}

export function normalizeLabels(labels: readonly TaskLabel[]): TaskLabel[] {
  return TASK_LABELS.filter((label) => labels.includes(label));
}

export function resolveLabels(draft: ClassifiableDraft & { labels?: readonly TaskLabel[] }): TaskLabel[] {
  const chosen = normalizeLabels(draft.labels ?? []);
  return chosen.length ? chosen : classifyLabels(draft);
}

function sourcePaths(draft: ClassifiableDraft) {
  const sources = [...draft.references, ...draft.relevantContext.map((entry) => entry.source)];
  return [...new Set(sources.flatMap((source) => (source.type === PROJECT_FILE && source.path ? [source.path] : [])))];
}

function searchableText(draft: ClassifiableDraft) {
  const parts = [draft.title, draft.context, draft.objective, ...draft.constraints, ...draft.productConsiderations, ...draft.relevantContext.map((entry) => entry.statement)];
  return parts.join("\n").normalize("NFD").replace(DIACRITICS, "").toLowerCase();
}
