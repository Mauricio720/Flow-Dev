import type { ReviewRole } from "./reviewCycleTypes";

const REVIEW_STAGE_NOT_UPDATED = "A sessão de revisão terminou sem atualizar";
const EXECUTE_STAGE_NOT_UPDATED = "A sessão de execução terminou sem atualizar";
const REVIEW_REPORT_NOT_NEW = "O relatório indicado em";
export const SESSION_STEP_INTERRUPTED = "A sessão foi interrompida ou encerrada antes de terminar a etapa.";
export const REVIEW_CLAIM_LOST = "Você não opera mais este trabalho.";
export const REVIEW_PLANNING_NOT_APPROVED = "O planejamento não está mais aprovado.";
export const REVIEW_TASK_SET_UNREADABLE = "O conjunto de tarefas não está legível.";
export const PARTIAL_REVIEW_NOTE = "Há tarefas não concluídas: faça a revisão parcial e marque o relatório como parcial.";
export const REVIEW_INITIAL_PROMPT = `/flow-dev:spec-conformance Revise a feature inteira contra a spec e as tarefas da pasta {pasta}. Salve o relatório em {reportFolder}/ com o próximo número livre e registre a linha na "Revisão final" do _tasks.md. Ao terminar, grave em {documento} a linha "etapa: execute" se o veredito for REPROVADO, "etapa: aprovada" se for APROVADO ou "etapa: ressalvas" se for APROVADO COM RESSALVAS, e a linha "relatorio: " com o caminho do relatório.`;
export const REVIEW_CONTINUATION = "A execução terminou as correções. Revise de novo a feature com a mesma skill, conferindo as correções e tudo o que elas tocaram. Salve um relatório novo em {reportFolder}/ e atualize {documento} como na primeira vez.";
export const EXECUTE_INITIAL_PROMPT = "Corrija os achados do relatório {caminho}, na ordem do \"Prompt de correção\" dele, e rode as verificações que ele pede antes de terminar. Não altere a spec nem os relatórios de revisão. Não faça commit, push nem PR sem eu pedir. Ao terminar, grave a linha \"etapa: review\" em {documento}.";
export const EXECUTE_CONTINUATION = "A revisão reprovou de novo em {caminho}. Corrija os achados dele como antes e, ao terminar, grave \"etapa: review\" em {documento}.";
export const CAVEATS_PROMPT = "Corrija as ressalvas do relatório {caminho} que dependem de código, na ordem do \"Prompt de correção\" dele, e rode as verificações que ele pede antes de terminar. Não altere a spec nem os relatórios de revisão. Não faça commit, push nem PR sem eu pedir. Ao terminar, grave \"etapa: review\" em {documento}.";

export function stageNotUpdatedReason(role: ReviewRole, document: string) {
  const session = role === "review" ? REVIEW_STAGE_NOT_UPDATED : EXECUTE_STAGE_NOT_UPDATED;
  return `${session} ${document}.`;
}

export function reportNotNewReason(document: string) {
  return `${REVIEW_REPORT_NOT_NEW} ${document} não é novo.`;
}
