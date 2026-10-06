import type { IssueDraft } from "./contract";

const GENERATED_PATHS = ["title", "context", "objective", "constraints", "relevantContext", "productConsiderations", "references"] as const;
export const DRAFT_PATHS = [...GENERATED_PATHS, "priorityPoints", "labels"] as const;
export type GeneratedPath = (typeof GENERATED_PATHS)[number];
export type DraftPath = (typeof DRAFT_PATHS)[number];
export type DraftErrors = Partial<Record<DraftPath, string>>;

export const DRAFT_FIELD_LABEL: Record<DraftPath, string> = {
  title: "Título",
  context: "Contexto",
  objective: "Objetivo",
  constraints: "Restrições",
  relevantContext: "Contexto relevante",
  productConsiderations: "Considerações de produto",
  references: "Referências",
  priorityPoints: "Prioridade",
  labels: "Labels",
};

export const MAX_COLLECTION_ENTRIES = 100;
export const MAX_PRODUCT_CONSIDERATIONS = 3;
export const PRIORITY_POINT_OPTIONS = [1, 2, 3, 4, 5] as const;
const NO_PRIORITY_COPY = "Sem prioridade.";
const REQUIRED_PATHS = ["title", "context", "objective"] as const;
const SERVER_ERROR_COPY: Record<string, string> = { required: "é obrigatório para publicar", input_limit: "passa do limite aceito" };
const INVALID_FIELD_COPY = "tem conteúdo inválido";

export function changedPaths(current: IssueDraft, next: IssueDraft): DraftPath[] {
  return DRAFT_PATHS.filter((path) => JSON.stringify(current[path]) !== JSON.stringify(next[path]));
}

export function proposedPaths(current: IssueDraft, proposal: IssueDraft): GeneratedPath[] {
  return GENERATED_PATHS.filter((path) => JSON.stringify(current[path]) !== JSON.stringify(proposal[path]));
}

export function priorityCopy(points: number | null) {
  return points === null ? NO_PRIORITY_COPY : `${points} de ${PRIORITY_POINT_OPTIONS.length} pontos`;
}

export function sameDraft(current: IssueDraft, next: IssueDraft) {
  return changedPaths(current, next).length === 0;
}

export function publicationErrors(draft: IssueDraft): DraftErrors {
  const errors: DraftErrors = {};
  for (const path of REQUIRED_PATHS) if (!draft[path].trim()) errors[path] = `${DRAFT_FIELD_LABEL[path]} ${SERVER_ERROR_COPY.required}.`;
  if (draft.productConsiderations.length > MAX_PRODUCT_CONSIDERATIONS) errors.productConsiderations = `${DRAFT_FIELD_LABEL.productConsiderations} aceita no máximo ${MAX_PRODUCT_CONSIDERATIONS} itens.`;
  return errors;
}

export function serverDraftErrors(fieldErrors: Record<string, string>): DraftErrors {
  const errors: DraftErrors = {};
  for (const path of DRAFT_PATHS) if (fieldErrors[path]) errors[path] = `${DRAFT_FIELD_LABEL[path]} ${SERVER_ERROR_COPY[fieldErrors[path]] ?? INVALID_FIELD_COPY}.`;
  return errors;
}
