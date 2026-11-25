import type { ReviewAction } from "./reviewContract";

export const REVIEW_STAGE_LABEL = "Revisão da feature";
export const REVIEW_LOADING = "Carregando a revisão…";
export const REVIEW_LOAD_FAILED = "Não foi possível carregar a revisão agora. Tentaremos de novo.";
export const REVIEW_NOT_STARTED = "A revisão ainda não começou.";
export const REVIEWER_FIELD_LABEL = "Revisão";
export const EXECUTOR_FIELD_LABEL = "Execução";
export const START_REVIEW_LABEL = "Iniciar revisão";
export const REVIEW_ANYWAY_LABEL = "Revisar mesmo assim";
export const START_ANYWAY_LABEL = "Iniciar mesmo assim";
export const STOP_REVIEW_LABEL = "Parar revisão";
export const END_REVIEW_LABEL = "Encerrar revisão";
export const RETRY_REVIEW_LABEL = "Tentar de novo";
export const ACCEPT_CAVEATS_LABEL = "Aceitar ressalvas";
export const REQUEST_FIX_LABEL = "Pedir correção";
export const REVIEW_CANCEL_LABEL = "Cancelar";
export const REVIEW_APPLYING = "Aplicando…";
export const PARTIAL_MARK = "Parcial";
export const ROUNDS_HEADING = "Rodadas";
export const ROUND_IN_PROGRESS = "Em andamento";
export const REVIEW_CHANGED_MESSAGE = "A revisão mudou. Veja o estado atual.";
export const REVIEW_ACTIVE_MESSAGE = "Já existe uma revisão em andamento neste trabalho.";
export const REVIEW_ACTION_FAILED = "Não foi possível concluir a ação agora. Tente de novo.";
export const REVIEW_START_FAILED = "Não foi possível iniciar a revisão agora. Tente de novo.";
export const STOP_CONFIRM_MESSAGE = "As duas sessões do ciclo serão encerradas. O que elas já mudaram no checkout continua lá. Parar a revisão?";
export const STOP_CONFIRM_LABEL = "Parar a revisão";
export const REPORT_LINK_LABEL = "Abrir relatório";

export const ACTION_LABEL: Record<ReviewAction, string> = { stop: STOP_REVIEW_LABEL, retry: RETRY_REVIEW_LABEL, accept: ACCEPT_CAVEATS_LABEL, fix: REQUEST_FIX_LABEL };
export const VERDICT_LABEL = { approved: "Aprovada", caveats: "Aprovada com ressalvas", rejected: "Reprovada" } as const;

export const missingTasksText = (missing: number, total: number) => `Faltam ${missing} de ${total} tarefas`;
export const partialConfirmText = (missing: number, total: number) => `${missingTasksText(missing, total)}. A revisão sai marcada como parcial e vale só para o que já foi feito. Revisar mesmo assim?`;
export const openSessionsConfirmText = (count: number) => `Há ${count} sessões abertas neste trabalho. A revisão pode ver mudanças que elas ainda estão fazendo. Iniciar mesmo assim?`;
