export const PLANNING_STAGE_LABEL = "Planejamento";
export const READER_WAITING_HEADLINE = "Aguardando a pessoa operadora continuar o fluxo.";
export const NOT_PLANNED_HEADLINE = "O planejamento ainda não começou.";

export const PLANNING_HEADLINE: Record<string, string> = {
  awaiting: "Peça a análise da próxima etapa",
  in_progress: "O Dev Control está analisando a Issue",
  review: "Revise e aprove a rota do planejamento",
  failed: "A análise de planejamento falhou",
  approved: "Rota do planejamento aprovada",
};

export const ROUTE_CHIP_LABEL: Record<string, string> = { direct_execution: "Execução direta", tech_spec: "Tech Spec", prd: "PRD" };
