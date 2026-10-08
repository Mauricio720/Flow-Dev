export const LAYER_TITLES: Record<string, string> = {
  application: "Configuração do aplicativo",
  account: "Conexões",
  runtime: "Runtime CompozyOS",
  host: "Pré-requisitos do host",
};

export const STATE_LABELS: Record<string, string> = {
  ready: "Pronto",
  blocked: "Bloqueado",
  unknown: "Desconhecido",
};

export const REASON_ACTIONS: Record<string, string> = {
  software_disabled: "Ative o Software e informe o proxy de documentação para liberar novas execuções.",
  docs_proxy_required: "Informe a URL HTTPS do proxy de documentação.",
  no_connection: "Conecte uma conta Codex para oferecer opções de execução.",
  auth_required: "Reconecte a conta: o login expirou ou não foi concluído.",
  runtime_unreachable: "O runtime não respondeu. Confira o serviço CompozyOS no host e atualize.",
  runtime_incompatible: "A versão ou o contrato do runtime não confere com o pin. Um operador precisa reparar o host.",
  service_unavailable: "O runtime está indisponível no momento. Tente atualizar em instantes.",
  workspace_root_unavailable: "O diretório de trabalho do host não está gravável.",
  runtime_image_unpinned: "A imagem do runtime precisa estar fixada por digest.",
  rootless_isolation_unavailable: "O isolamento rootless do Podman não está disponível neste host.",
  credential_root_not_private: "O diretório de credenciais precisa ser privado e pertencer ao serviço.",
  host_check_failed: "A verificação do host falhou. Atualize para tentar novamente.",
  check_missing: "A verificação ainda não retornou. Atualize para tentar novamente.",
  check_malformed: "A verificação retornou dados inválidos e não é tratada como pronta.",
  check_contradictory: "A verificação retornou dados contraditórios e não é tratada como pronta.",
  catalog_stale: "O catálogo de modelos está desatualizado. Atualize a descoberta do provedor.",
  disabled: "A conexão está desativada.",
};

export const AUTH_STATE_LABELS: Record<string, string> = {
  unconnected: "Não conectada",
  pending: "Aguardando autorização",
  connected: "Conectada",
  failed: "Falhou",
  expired: "Expirada",
  disconnected: "Desconectada",
  setup_required: "Configuração necessária",
};

export const EVENT_LABELS: Record<string, string> = {
  "settings.saved": "Configurações salvas",
  "connection.created": "Conexão criada",
  "connection.connected": "Conta conectada",
  "connection.reconnected": "Conta reconectada",
  "connection.disconnected": "Conta desconectada",
  "connection.renamed": "Conexão renomeada",
};

export const FAILURE_MESSAGES: Record<string, string> = {
  plan_version_changed: "As configurações mudaram em outra sessão. Os valores atuais foram carregados; revise e salve de novo.",
  connection_revision_changed: "A conexão mudou em outra sessão. Atualize a lista e tente novamente.",
  label_taken: "Já existe uma conexão com este nome.",
  label_invalid: "Use de 1 a 60 caracteres no nome da conexão.",
  login_in_progress: "Já existe uma autenticação em andamento para esta conexão.",
  login_expired: "A autenticação expirou. Inicie novamente.",
  operation_not_authenticated: "A autenticação ainda não foi concluída no navegador.",
};

export const GENERIC_FAILURE = "Não foi possível concluir a operação. Confira o estado atual e tente novamente.";
