import type { StageState } from "./spec/unified/flowStages";

export const PLANNING_STAGE_LABEL = "Planejamento";
export const FLOW_DONE_LABEL = "Concluído";
export const REVIEWING_LABEL = "Em revisão";
export const LEGACY_HEADLINE = "Fluxo anterior: acompanhe as etapas no detalhe da Issue.";
export const READER_WAITING_HEADLINE = "Aguardando a pessoa operadora continuar o fluxo.";
export const NOT_PLANNED_HEADLINE = "O planejamento ainda não começou.";
export const LIVE_RUN_TITLE = "Executando agora";
export const FIRST_UPDATE = "Aguardando a primeira atualização do agente…";

export const PLANNING_STAGE_STATE: Record<string, StageState> = { awaiting: "yours", in_progress: "current", review: "yours", failed: "failed", approved: "done" };

export const PLANNING_HEADLINE: Record<string, string> = {
  awaiting: "Peça a análise da próxima etapa",
  in_progress: "O Dev Control está analisando a Issue",
  review: "Revise e aprove a rota do planejamento",
  failed: "A análise de planejamento falhou",
};

export const ROUTE_CHIP_LABEL: Record<string, string> = { direct_execution: "Execução direta", tech_spec: "Tech Spec", prd: "PRD" };

export const ACTIVITY_LABEL: Record<string, string> = {
  agent_message: "Mensagem do agente", tool_call: "Usando ferramenta", tool_result: "Ferramenta concluída",
  interaction: "Interação", lifecycle: "Etapa do runtime", warning: "Aviso do runtime",
};
