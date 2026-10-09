import type { PlanningDecision, PlanningRoute } from "./contract";

export const ROUTE_LABEL: Record<PlanningRoute, string> = { direct_execution: "Execução direta", tech_spec: "Tech Spec", prd: "PRD" };
export const ROUTE_ORDER: PlanningRoute[] = ["direct_execution", "tech_spec", "prd"];
export const planningRoutes: readonly string[] = ROUTE_ORDER;
export const START_ACTION_LABEL = "Analisar próxima etapa";
export const AWAITING_EXPLANATION = "O Dev Control pode analisar a Issue publicada e recomendar a próxima etapa de desenvolvimento.";
export const ROUTE_NEXT_NOTE = "A próxima atividade ainda não foi iniciada.";
export const COMPLEXITY_LABEL: Record<PlanningDecision["complexity"], string> = { low: "Baixa", medium: "Média", high: "Alta" };
export const PLANNING_PROVIDER = "Dev Control";
export const NO_UNCERTAINTIES = "Nenhuma pendência informada";
export const SOURCE_LABEL: Record<PlanningDecision["decisionSource"], string> = { AI: "Recomendada pela análise", HUMAN_OVERRIDE: "Escolhida pela pessoa operadora" };
export const OVERRIDE_NOTE = "Os motivos abaixo explicam a recomendação original, não a rota escolhida.";
export const SNAPSHOT_BASIS = "A análise usa somente o snapshot da Issue publicada. Nenhum repositório foi consultado.";

export const PLANNING_STATUS_LABEL = { awaiting: "Aguardando planejamento", in_progress: "Analisando", review: "Em revisão", failed: "Falhou", approved: "Aprovado" } as const;

export const PLANNING_ANNOUNCEMENT = {
  awaiting: "Issue publicada. O planejamento ainda não começou.",
  in_progress: "O Dev Control está analisando o snapshot da Issue.",
  review: "Recomendação pronta e worktree desta Issue solicitado. Revise a rota e aprove o planejamento.",
  failed: "A análise de planejamento falhou. A Issue publicada não foi alterada.",
  approved: "Planejamento aprovado. Nenhuma atividade seguinte foi iniciada.",
} as const;

export const UNKNOWN_PLANNING_NOTICE = "Este estado de planejamento não é reconhecido por esta versão da tela. Atualize para continuar; nenhuma ação está disponível.";
export const READER_NOTE = "Somente leitura. Apenas a pessoa operadora pode iniciar, alterar a rota ou aprovar o planejamento.";
export const STALE_NOTICE = "Mostrando o último estado confirmado. A atualização mais recente falhou.";
export const UNCERTAIN_NOTICE = "Não recebemos a confirmação da última ação. Verifique o envio antes de tentar de novo.";
export const CONFLICT_NOTICE = "A tarefa mudou desde que você abriu esta tela. Revise a rota salva atual antes de continuar.";

export const OPERATION_STATE_LABEL: Record<string, string> = { queued: "Na fila do Dev Control", running: "Dev Control analisando", failed: "Análise falhou", succeeded: "Análise concluída" };

export const PLANNING_REASON_MESSAGE: Record<string, string> = {
  planning_conflict: CONFLICT_NOTICE,
  planning_exists: "Esta tarefa já tem um planejamento. Atualize para ver o estado atual.",
  planning_retry_required: "A análise falhou. Use “Tentar novamente” para uma nova análise.",
  planning_not_failed: "Não há análise com falha para tentar de novo.",
  planning_approved: "O planejamento já foi aprovado e não aceita mudanças.",
  planning_not_ready: "A recomendação ainda não está pronta para revisão.",
  decision_unavailable: "A decisão de planejamento não está disponível para esta tarefa.",
  planning_capacity: "Há muitas análises em andamento. Tente de novo em instantes.",
  publication_required: "Só uma Issue publicada e confirmada pode ser planejada.",
  planning_input_limit: "O conteúdo da Issue passa do limite que o planejamento aceita. Nada foi cortado.",
  planning_unconfigured: "O Dev Control não está configurado neste ambiente. Nenhuma análise foi iniciada.",
  planning_timeout: "O Dev Control não respondeu a tempo.",
  planning_rate_limited: "O Dev Control limitou as análises por agora.",
  planning_provider_unavailable: "O Dev Control está indisponível no momento.",
  planning_workspace_unavailable: "Não foi possível preparar o worktree desta Issue. Tente o planejamento novamente.",
  planning_invalid_output: "O Dev Control devolveu um resultado inválido, que foi descartado.",
  planning_execution_mismatch: "O resultado do Dev Control não correspondia a esta análise e foi descartado.",
  planning_access_revoked: "O acesso necessário mudou durante a análise, que foi interrompida.",
  planning_deadline: "A análise passou do tempo máximo permitido.",
};
