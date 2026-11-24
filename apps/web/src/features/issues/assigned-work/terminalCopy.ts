import { formatTimeOfDay } from "@/lib/tasks/formatMoment";

export const TERMINAL_ACTION_LABEL = "Iniciar sessão";
export const TERMINAL_DIALOG_TITLE = "Iniciar sessão";
export const TERMINAL_DIALOG_INTRO = "O agente escolhido roda por trás do Flow Dev, na pasta do seu clone, e a conversa aparece nesta tarefa. O prompt abaixo é a primeira mensagem.";
export const SERVICE_OFFLINE_MESSAGE = "O serviço de sessões do Flow Dev não está rodando. Inicie o Flow Dev com pnpm dev e tente de novo.";
export const PERMISSION_MODE_LEGEND = "Modo de permissões";
export const PERMISSION_MODE_OPTIONS = [
  { value: "bypass", label: "Tudo liberado", description: "O agente não pede aprovação de nenhuma ferramenta. As perguntas com opções continuam aparecendo." },
  { value: "accept_edits", label: "Aceitar edições, perguntar comandos", description: "Edições de arquivo no clone seguem sozinhas; comandos e as demais ferramentas pedem a sua aprovação." },
  { value: "ask_all", label: "Perguntar tudo", description: "Edições, comandos e as demais ferramentas pedem a sua aprovação, salvo leituras e regras já liberadas." },
] as const;
export const CHECKOUT_FOLDER_LABEL = "Pasta";
export const DIRTY_WARNING = "Há mudanças não commitadas nesta pasta. O agente vai trabalhar sobre elas.";
export const NO_CHECKOUT_MESSAGE = "Você ainda não vinculou o clone local deste projeto. Vincule a pasta nas Configurações para abrir a execução.";
export const SETTINGS_LINK_LABEL = "Abrir Configurações do projeto";
export const PROMPT_LABEL = "Prompt";
export const PROMPT_LIMIT_MESSAGE = "O prompt precisa ter entre 1 e 20.000 caracteres.";
export const LOADING_MESSAGE = "Preparando a abertura…";
export const PREFLIGHT_FAILED_MESSAGE = "Não foi possível preparar a abertura agora. Feche e tente de novo.";
export const OPEN_FAILED_MESSAGE = "Não foi possível iniciar a sessão agora. Tente de novo; a mesma confirmação não inicia duas sessões.";
export const CANCEL_LABEL = "Cancelar";
export const SESSION_ACTIVE_MESSAGE = "Já existe uma sessão aberta para esta tarefa. Abrir outra?";
export const OPEN_ANOTHER_LABEL = "Abrir outra";
export const SENDING_LABEL = "Iniciando…";

export function branchLabel(branch: string | null, detachedSha: string | null) {
  return branch ? `Branch: ${branch}` : `HEAD destacado (${detachedSha ?? "desconhecido"})`;
}

export function characterCounter(length: number, maxLength: number) {
  return `${length.toLocaleString("pt-BR")} / ${maxLength.toLocaleString("pt-BR")}`;
}

export function openedNote(userName: string, openedAt: string) {
  return `Sessão iniciada por ${userName} às ${formatTimeOfDay(openedAt)}`;
}

export const ATTACHMENTS_HEADING = "Anexos";
export const ATTACHMENTS_INPUT_LABEL = "Anexar arquivos";
export const ATTACHMENTS_PICK_LABEL = "Escolher arquivos";
export const ATTACHMENTS_DROP_LABEL = "Soltar arquivos aqui";
export const ATTACHMENTS_DROP_HINT = "Arraste imagens, PDFs ou arquivos de texto para cá, ou escolha no computador.";
export const ATTACHMENTS_ACCEPT = "image/png,image/jpeg,image/gif,image/webp,application/pdf,text/*,.png,.jpg,.jpeg,.gif,.webp,.pdf,.md,.txt,.json,.csv,.yaml,.yml,.xml,.log,.html,.css,.sql,.ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.rb,.php,.sh";
export const ATTACHMENTS_LIMIT_MESSAGE = "Limite de 10 arquivos por abertura.";
export const ATTACHMENTS_TOTAL_MESSAGE = "Os anexos passariam de 30 MB.";
export const ATTACHMENT_RETRY_LABEL = "Tentar de novo";
export const ATTACHMENT_REMOVE_LABEL = "Remover";
export const ISSUE_IMAGES_HEADING = "Imagens da Issue";
export const PREVIEW_HEADING = "Anexos (leia antes de começar):";
export const PREVIEW_PATH_NOTE = "caminho definido ao abrir";
export const PREVIEW_CAPTION = "Esta seção é acrescentada ao prompt quando você confirma.";

export function uploadProgressLabel(progress: number) {
  return `Enviando… ${Math.round(progress * 100)}%`;
}

export function skippedImagesNotice(count: number) {
  return count === 1 ? "1 imagem da Issue ficou desmarcada pelo limite." : `${count} imagens da Issue ficaram desmarcadas pelo limite.`;
}

export function unavailableImagesNotice(count: number) {
  return count === 1 ? "1 imagem da Issue não está mais disponível." : `${count} imagens da Issue não estão mais disponíveis.`;
}
