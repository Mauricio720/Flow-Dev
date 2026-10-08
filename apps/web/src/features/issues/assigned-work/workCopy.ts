import type { WorkView } from "./contract";

export const CLAIM_STATE_LABEL: Record<WorkView["claim"]["state"], string> = {
  unclaimed: "Sem reivindicação",
  pending: "Reivindicação pendente",
  uncertain: "Reivindicação não confirmada",
  failed: "Reivindicação falhou",
  claimed: "Reivindicada",
};

export const CLAIM_STATE_NOTE: Record<WorkView["claim"]["state"], string> = {
  unclaimed: "Ninguém reivindicou esta Issue. Reivindicar é uma ação explícita na fila Ready.",
  pending: "Um pedido de reivindicação aguarda confirmação do GitHub. Quem pediu ainda não é a pessoa operadora.",
  uncertain: "O GitHub não confirmou a mudança de status. Nada foi iniciado e a tela confere o estado de novo sozinha.",
  failed: "A reivindicação não foi concluída. O status da Issue no quadro não mudou.",
  claimed: "A Issue tem uma pessoa operadora responsável.",
};

export const OPERATOR_NOTE = "Você é a pessoa operadora. Cada etapa só começa quando você pedir.";
export const OBSERVER_NOTE = "Você acompanha em modo leitura. Nenhuma ação operacional está disponível para você.";
export const NOT_STARTED_TITLE = "Trabalho ainda não iniciado";
export const NOT_STARTED_NOTE = "Nenhuma ação foi aceita para esta Issue. Planejamento, especificação e execução começam somente quando a pessoa operadora pedir.";
export const SOURCE_CHANGED_NOTE = "O texto da Issue mudou no GitHub depois do snapshot analisado. Decisões e execuções novas ficam bloqueadas até a fonte ser reavaliada.";
export const ORIGIN_LABEL = { flow_dev: "Criada no Flow Dev", external: "Issue do GitHub" } as const;
export const QUEUE_EMPTY = "Nenhuma Issue atribuída a você está em Ready neste projeto.";
export const QUEUE_CONTINUING = "Ainda procurando no quadro. Isto não significa que a fila esteja vazia.";
export const ACTIVE_EMPTY = "Você ainda não tem trabalho reivindicado neste projeto.";
export const ACTIVE_SHARED_EMPTY = "Ninguém neste projeto tem trabalho reivindicado agora.";
export const NO_OPERATOR = "Operador não identificado";
export const STAGE_NONE = "Sem etapa em andamento";
export const NEEDS_ATTENTION = "Precisa de atenção";
