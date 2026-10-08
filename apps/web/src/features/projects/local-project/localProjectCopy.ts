export const READINESS_LABEL = { ready: "Pronto", blocked: "Bloqueado", checking: "Verificando" } as const;

export const READINESS_NOTE = {
  ready: "A máquina respondeu e o checkout confere com o projeto. Nenhuma ação roda sem a sua preparação explícita.",
  blocked: "A máquina ou o checkout não está pronto. Resolva o motivo abaixo no seu computador e confira de novo.",
  checking: "Conferindo a máquina e o checkout. Isto não executa nada.",
} as const;

export const REASON_MESSAGE: Record<string, string> = {
  link_changed: "O vínculo mudou em outra sessão. Atualize o vínculo para ver o estado atual; nada foi trocado automaticamente.",
  link_unavailable: "O vínculo não está mais disponível. Atualize para conferir.",
  machine_unavailable: "A máquina vinculada não respondeu. Abra o conector no seu computador e tente de novo.",
  machine_revoked: "A máquina foi desconectada. Conecte-a de novo pelo conector local.",
  repository_mismatch: "O checkout local aponta para outro repositório que o do projeto.",
  not_git_root: "A pasta vinculada não é a raiz de um repositório Git.",
  path_invalid: "A pasta vinculada não existe mais no computador.",
  instructions_invalid: "As instruções do projeto no checkout estão inválidas ou incompletas.",
  runtime_incompatible: "O ambiente de execução local não é compatível com esta versão.",
  request_key_reused: "Esta solicitação já foi usada com outros dados. Atualize e tente de novo.",
  work_unavailable: "Este projeto não está disponível para você.",
  connector_unavailable: "Nenhum conector local pareado respondeu. Se for a primeira vez neste computador, confirme o pareamento pelo link que o conector mostra no terminal; depois, deixe o conector rodando e tente de novo.",
  request_expired: "O conector não respondeu a tempo. Confira se ele está rodando e tente de novo.",
  request_superseded: "Um pedido mais recente substituiu este. Acompanhe o pedido mais recente.",
  folder_not_selected: "Nenhuma pasta foi escolhida. O vínculo continua como estava.",
  folder_picker_unavailable: "Este computador não tem uma janela de seleção de pastas. Vincule pelo terminal do conector, informando a pasta.",
  path_not_allowed: "A pasta escolhida está fora das pastas permitidas no conector.",
  repository_authorization_needed: "Autorize a leitura do repositório com a sua conta do GitHub antes de vincular.",
  project_unavailable: "Este projeto não está disponível para você.",
  local_projects_unavailable: "O vínculo local ainda não está disponível neste ambiente.",
};

export const FALLBACK_REASON = "Não foi possível concluir a operação. O vínculo atual continua como estava.";
export const UNAVAILABLE_TITLE = "Vínculo local indisponível";
export const UNAVAILABLE_NOTE = "Este ambiente ainda não oferece o conector local. O trabalho atribuído continua disponível e nenhuma ação roda na sua máquina.";
export const NO_LINK_TITLE = "Nenhum checkout vinculado";
export const NO_LINK_NOTE = "O vínculo é seu e privado: o caminho da pasta fica no seu computador e nunca aparece aqui. Escolha a pasta abaixo: a janela abre no seu computador, pelo conector local.";
export const PREPARATION_NOTE = "A preparação é sempre explícita e acontece no trabalho que você reivindicou, antes de qualquer ação local. Esta tela não executa nada.";

export const FOLDER_ACTION_LABEL = { link: "Escolher pasta", change: "Trocar pasta" } as const;
export const FOLDER_PROGRESS = {
  requesting: "Enviando o pedido ao Flow Dev…",
  pending: "Chamando o conector neste computador…",
  claimed: "A janela de pastas abriu no seu computador. Escolha a pasta do projeto.",
} as const;
export const FOLDER_STEP_LABEL = { requesting: "Pedido enviado", pending: "Conector respondeu", claimed: "Pasta escolhida" } as const;
export const FOLDER_STEPS_LABEL = "Andamento do vínculo da pasta";
export const FOLDER_FAILURE_TITLE = "A pasta não foi vinculada";
export const LINK_TITLE = "Seu checkout";
export const UNLINK_LABEL = "Desvincular checkout";
