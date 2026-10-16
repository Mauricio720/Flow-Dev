export const WORK_SUMMARY_TITLE = "Resumo do trabalho";
export const WORK_SUMMARY_TOGGLE = { collapse: "Recolher", expand: "Mostrar resumo" } as const;
export const WORK_SUMMARY_LOADING = "Carregando o resumo da spec…";
export const WORK_SUMMARY_FAILED = "Não foi possível carregar o resumo. Os documentos continuam disponíveis na etapa Spec.";
export const WORK_SUMMARY_CELLS = { what: "O que será entregue", why: "Por que importa", impact: "Impacto", status: "Status atual" } as const;
export const WORK_SUMMARY_LISTS = { capabilities: "Principais capacidades", decisions: "Decisões importantes", risks: "Riscos e pontos de atenção" } as const;
export const WORK_SUMMARY_STATUS = { stage: "Etapa", document: "Documento", next: "Próxima ação" } as const;
export const WORK_SUMMARY_CTA = { review: "Revisar Spec", product: "Abrir PRD" } as const;
export const SEE_ALL = "Ver todas";
export const NOT_SPECIFIED_SHORT = "Não especificado.";
export const LIST_LIMIT = 3;

export function impactLabel(parts: number, files: number | null) {
  const partsText = parts === 1 ? "1 parte afetada" : `${parts} partes afetadas`;
  if (files === null) return partsText;
  return `${partsText} · ${files === 1 ? "1 arquivo citado" : `${files} arquivos citados`}`;
}

export function requirementMeta(criteria: number, tests: number) {
  const criteriaText = criteria === 1 ? "1 critério" : `${criteria} critérios`;
  return `${criteriaText} · ${tests === 1 ? "1 teste" : `${tests} testes`}`;
}
