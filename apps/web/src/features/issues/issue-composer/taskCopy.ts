import type { TaskFailure, TaskStatus } from "./contract";

export { TASK_STATUS_LABEL as STATUS_LABEL } from "@/components/tasks/taskStatus";

export const STATUS_ANNOUNCEMENT: Record<TaskStatus, string> = {
  generating: "O Issue Author está gerando o draft.",
  awaiting_clarification: "O Issue Author fez uma pergunta. Responda para continuar.",
  draft_ready: "Draft pronto para revisão.",
  generation_failed: "A geração falhou. O que já estava salvo continua disponível.",
  publishing: "Publicando a Issue no GitHub. Edição, mensagens e ditado ficam indisponíveis.",
  publication_uncertain: "Verificando publicação. Uma nova criação fica bloqueada até o resultado ser confirmado.",
  published: "Issue publicada. O trabalho seguinte começa em Trabalho atribuído, com claim explícito.",
};

const FALLBACK_MESSAGE = "Não foi possível concluir a operação. O que já estava salvo continua disponível; tente novamente.";
const CONNECTION_MESSAGE = "Sem resposta do servidor. Confira a conexão e tente novamente.";

const REASON_MESSAGE: Record<string, string> = {
  blank_message: "Escreva uma mensagem antes de enviar.",
  input_limit: "O texto passa do limite aceito. Ajuste o conteúdo; nada foi cortado.",
  input_capacity: "A conversa chegou ao limite que o Issue Author consegue receber. O draft salvo continua disponível para revisão manual.",
  refinement_pending: "Resolva a proposta de refinamento antes de continuar.",
  author_required: "Somente a pessoa autora pode alterar esta tarefa.",
  admin_required: "Somente administradores podem criar e publicar Issues neste projeto.",
  task_complete: "Esta tarefa já foi concluída. Comece uma nova intenção ou abra a Issue no GitHub.",
  operation_active: "Já existe uma operação em andamento nesta tarefa. Aguarde ela terminar.",
  revision_conflict: "A tarefa mudou em outra aba. Carregue a versão mais recente antes de continuar.",
  generation_not_failed: "Não há geração com falha para tentar de novo.",
  request_key_reused: "Este envio já foi registrado com outro conteúdo. Atualize a tarefa e tente novamente.",
  invalid_draft: "O draft tem campos inválidos. Corrija os campos indicados.",
  unsafe_source: "Uma fonte do draft aponta para um endereço não confiável. Remova a fonte para salvar.",
  invalid_field_path: "A seleção de campos da proposta não é válida.",
  stale_proposal: "A proposta foi gerada para uma revisão anterior. Revise de novo com o draft atual.",
  preview_not_ready: "Ainda não existe uma revisão salva para publicar.",
  preview_changed: "O draft ou o destino mudou desde a revisão. Revise a publicação de novo.",
  repository_archived: "O repositório está arquivado no GitHub e não aceita novas Issues.",
  issues_disabled: "As Issues estão desativadas neste repositório.",
  identity_mismatch: "A conta do GitHub autorizada não é a mesma da sua entrada no Flow Dev.",
  issue_permission_denied: "Sua conta do GitHub não tem permissão para criar Issues neste repositório.",
  invalid_stored_content: "O conteúdo salvo desta tarefa não pôde ser lido com segurança. Nada foi inventado no lugar.",
  provider_rate_limited: "O GitHub limitou as consultas por agora. Tente de novo em alguns minutos.",
  provider_unavailable: "O Issue Author está indisponível no momento.",
  provider_usage_limit: "O provedor do modelo do Issue Author atingiu o limite de uso. Tente de novo mais tarde.",
  generation_timeout: "O Issue Author não respondeu a tempo.",
  invalid_agent_output: "O Issue Author devolveu um resultado inválido, que foi descartado.",
  invalid_agent_source: "O Issue Author citou uma fonte que não foi consultada; o resultado foi descartado.",
  invalid_agent_activity: "A atividade informada pelo Issue Author não confere com o que foi registrado; o resultado foi descartado.",
  context_limit: "O contexto consultado passou do limite permitido.",
  task_unavailable: "Esta tarefa não existe neste projeto ou não está disponível para você.",
  service_unavailable: "O serviço está temporariamente indisponível.",
  publication_unavailable: "A publicação não está disponível neste ambiente. O draft salvo continua intacto.",
  repository_authorization_needed: "Entrar no Flow Dev não libera repositórios. Autorize a leitura com a sua conta do GitHub para continuar.",
};

export function reasonMessage(reason: string | null) {
  return (reason && REASON_MESSAGE[reason]) || FALLBACK_MESSAGE;
}

export function failureMessage(failure: TaskFailure) {
  if (failure.code === null && failure.reason === null) return CONNECTION_MESSAGE;
  return reasonMessage(failure.reason);
}
