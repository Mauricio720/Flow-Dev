import type { PlanningDecision, PlanningRoute } from "./contract";

export const ROUTE_LABEL: Record<PlanningRoute, string> = { direct_execution: "Execução direta", tech_spec: "Tech Spec", prd: "PRD" };
export const ROUTE_ORDER: PlanningRoute[] = ["direct_execution", "tech_spec", "prd"];
export const planningRoutes: readonly string[] = ROUTE_ORDER;
export const START_ACTION_LABEL = "Analisar próxima etapa";
export const AWAITING_EXPLANATION = "O agente de planejamento pode analisar a Issue publicada e recomendar a próxima etapa de desenvolvimento.";
export const ROUTE_NEXT_NOTE = "A próxima atividade ainda não foi iniciada.";
export const COMPLEXITY_LABEL: Record<PlanningDecision["complexity"], string> = { low: "Baixa", medium: "Média", high: "Alta" };
export const PLANNING_PROVIDER = "Agente de planejamento";
export const NO_UNCERTAINTIES = "Nenhuma pendência informada";
export const SOURCE_LABEL: Record<PlanningDecision["decisionSource"], string> = { AI: "Recomendada pela análise", HUMAN_OVERRIDE: "Escolhida pela pessoa operadora" };
export const OVERRIDE_NOTE = "Os motivos abaixo explicam a recomendação original, não a rota escolhida.";
export const SNAPSHOT_BASIS = "A análise parte do snapshot da Issue publicada e só consulta o repositório vinculado quando isso pode mudar a rota.";

export const PLANNING_STATUS_LABEL = { awaiting: "Aguardando planejamento", in_progress: "Analisando", review: "Em revisão", failed: "Falhou", approved: "Aprovado" } as const;

export const PLANNING_ANNOUNCEMENT = {
  awaiting: "Issue publicada. O planejamento ainda não começou.",
  in_progress: "O agente de planejamento está analisando a Issue.",
  review: "Recomendação pronta. Revise a rota e aprove o planejamento.",
  failed: "A análise de planejamento falhou. A Issue publicada não foi alterada.",
  approved: "Planejamento aprovado. Nenhuma atividade seguinte foi iniciada.",
} as const;

export const UNKNOWN_PLANNING_NOTICE = "Este estado de planejamento não é reconhecido por esta versão da tela. Atualize para continuar; nenhuma ação está disponível.";
export const READER_NOTE = "Somente leitura. Apenas a pessoa operadora pode iniciar, alterar a rota ou aprovar o planejamento.";
export const STALE_NOTICE = "Mostrando o último estado confirmado. A atualização mais recente falhou.";
export const UNCERTAIN_NOTICE = "Não recebemos a confirmação da última ação. Verifique o envio antes de tentar de novo.";
export const CONFLICT_NOTICE = "A tarefa mudou desde que você abriu esta tela. Revise a rota salva atual antes de continuar.";

export const REPLAN_COPY = {
  open: "Refazer planejamento",
  group: "Refazer o planejamento desta Issue",
  warning: "O agente de planejamento analisa de novo o texto atual da Issue e recomenda outra rota. Se faltar contexto, atualize a Issue no GitHub antes de confirmar.",
  confirm: "Confirmar novo planejamento",
  back: "Voltar",
};

export const OPERATION_STATE_LABEL: Record<string, string> = { queued: "Na fila do planejamento", running: "Planejamento em análise", failed: "Análise falhou", succeeded: "Análise concluída" };

export const PLANNING_REASON_MESSAGE: Record<string, string> = {
  planning_conflict: CONFLICT_NOTICE,
  planning_exists: "Esta tarefa já tem um planejamento. Atualize para ver o estado atual.",
  planning_retry_required: "A análise falhou. Use “Tentar novamente” para uma nova análise.",
  planning_not_failed: "Não há análise com falha para tentar de novo.",
  planning_approved: "O planejamento já foi aprovado e não aceita mudanças.",
  replan_unavailable: "O planejamento só pode ser refeito quando a Issue mudou depois da aprovação. Atualize para ver o estado atual.",
  planning_not_ready: "A recomendação ainda não está pronta para revisão.",
  decision_unavailable: "A decisão de planejamento não está disponível para esta tarefa.",
  planning_capacity: "Há muitas análises em andamento. Tente de novo em instantes.",
  publication_required: "Só uma Issue publicada e confirmada pode ser planejada.",
  planning_input_limit: "O conteúdo da Issue passa do limite que o planejamento aceita. Nada foi cortado.",
  planning_unconfigured: "O planejamento não está configurado neste ambiente. Nenhuma análise foi iniciada.",
  planning_timeout: "O agente de planejamento não respondeu a tempo.",
  planning_provider_unavailable: "O agente de planejamento está indisponível no momento.",
  planning_invalid_output: "O agente de planejamento devolveu um resultado inválido, que foi descartado.",
  planning_execution_mismatch: "O resultado do agente de planejamento não correspondia a esta análise e foi descartado.",
  planning_access_revoked: "O acesso necessário mudou durante a análise, que foi interrompida.",
  planning_deadline: "A análise passou do tempo máximo permitido.",
};
