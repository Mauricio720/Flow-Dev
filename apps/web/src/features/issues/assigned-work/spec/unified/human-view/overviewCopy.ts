export const OVERVIEW_TAB_LABEL = "Visão geral";
export const APPROVAL_ANCHOR = "package-approval";

export const OVERVIEW_TITLES = {
  next: "Próximo passo",
  delivery: "O que será entregue",
  why: "Por que importa",
  capabilities: "Capacidades",
  decisions: "Decisões",
  risks: "Riscos e pontos de atenção",
  questions: "Em aberto",
  impacts: "Partes afetadas",
  tasks: "Tarefas em ordem",
  coverage: "Cobertura e pendências",
} as const;

export const OVERVIEW_EMPTY = {
  delivery: "O resumo executivo não traz o que muda em formato reconhecível. Leia a parte de produto.",
  capabilities: "Nenhuma história de usuário identificada no catálogo.",
  decisions: "Nenhuma decisão identificada nos documentos.",
  risks: "Nenhum risco identificado nos documentos.",
  questions: "Nenhuma pergunta em aberto registrada.",
  impacts: "Nenhuma análise de impacto identificada.",
  tasks: "Nenhuma tarefa legível nesta versão.",
} as const;

export const OVERVIEW_NOTE = "Esta visão é montada só com o que está escrito nesta versão dos documentos. Cada item leva ao trecho de origem.";
export const SOURCE_PREFIX = "Origem:";
export const DETAIL_LABEL = "Detalhes";
export const APPROVAL_LINK = "Ir para a aprovação";
export const STORY_LINK = "Ver história";
export const FILES_LINK = "Ver referências";
export const NO_DEPENDENCIES = "Sem dependências";
export const COVERS_LABEL = "Cita:";
export const UNKNOWN_DEPENDENCIES = "Dependências não declaradas no plano.";

export function moreLabel(count: number, expanded: boolean) {
  if (expanded) return "Mostrar menos";
  return count === 1 ? "Mais 1 registrada no documento" : `Mais ${count} registradas no documento`;
}

export function storyMeta(criteria: number, edgeCases: number) {
  const parts = [criteria === 1 ? "1 critério de aceite" : `${criteria} critérios de aceite`];
  if (edgeCases > 0) parts.push(edgeCases === 1 ? "1 caso de borda" : `${edgeCases} casos de borda`);
  return criteria > 0 ? parts : [];
}

export function filesLabel(count: number) {
  return count === 1 ? "1 arquivo citado nas referências" : `${count} arquivos citados nas referências`;
}

export function dependencyLabel(numbers: number[]) {
  return `Depende de ${numbers.map((number) => `tarefa ${number}`).join(", ")}`;
}
