export const FLOW_REGION_LABEL = "Fluxo CompozyOS da tarefa";

export const ACTION_LABELS: Record<string, string> = {
  create_spec: "Criar spec",
  create_tasks: "Criar tarefas",
  loop: "Loop",
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  create_spec: "Gera uma spec no idioma escolhido, com resumo executivo para leitura rápida e os contratos técnicos completos.",
  create_tasks: "Decompõe a spec aprovada em tarefas no idioma escolhido. Só fica disponível depois de aprovar a spec.",
};

export const RUN_STATE_LABELS: Record<string, string> = {
  queued: "Na fila", dispatching: "Iniciando", running: "Em execução", waiting: "Aguardando", finalizing: "Finalizando",
  stopping: "Parando", reconciling: "Reconciliando o resultado", succeeded: "Concluída", failed: "Falhou", canceled: "Cancelada",
  blocked: "Bloqueada", stalled: "Travada", exhausted: "Limites esgotados", unknown: "Resultado desconhecido",
};

export const RUN_STATE_MARKS: Record<string, string> = { succeeded: "✓", failed: "✕", blocked: "⊘", canceled: "–", stalled: "…", exhausted: "!", unknown: "?" };

export const START_REASONS: Record<string, string> = {
  no_ready_connection: "Nenhuma conexão pronta. Peça a um administrador para conectar uma conta em Software.",
  host_not_ready: "O host não está pronto para novas execuções.",
  runtime_not_ready: "O runtime CompozyOS não está pronto para novas execuções.",
  account_not_ready: "Nenhuma conta está autenticada para novas execuções.",
  application_not_ready: "O Software CompozyOS não está habilitado.",
  legacy_flow_active: "Esta tarefa segue o fluxo anterior de Spec.",
  planning_required: "Aprove o planejamento antes de iniciar o fluxo.",
  publication_required: "Publique a Issue antes de iniciar o fluxo.",
  route_unsupported: "A rota escolhida no planejamento não usa o fluxo de spec.",
  author_required: "Somente a pessoa operadora pode alterar ou iniciar o fluxo.",
};

export const FAILURE_COPY: Record<string, string> = {
  plan_version_changed: "O fluxo mudou em outra aba. O estado atual foi carregado; revise e salve de novo.",
  action_already_started: "Esta ação já foi iniciada e sua escolha não pode mais ser alterada.",
  action_active: "Já existe uma execução ativa para esta tarefa.",
  capacity_reached: "O limite de execuções simultâneas foi atingido por outra tarefa. Aguarde ela terminar, cancele-a ou aumente o limite em Configurações.",
  stage_prerequisite: "A etapa anterior ainda não foi concluída e aprovada.",
  catalog_stale: "O catálogo de modelos está desatualizado. Escolha novamente.",
  model_unavailable: "O modelo não está mais disponível. Escolha outra opção pronta.",
  reasoning_effort_unsupported: "Esse nível de raciocínio não é suportado pelo modelo.",
  connection_unavailable: "A conexão não está mais disponível.",
  auth_required: "A conta precisa ser reconectada por um administrador.",
  runtime_incompatible: "O runtime ou o host não está pronto. Um operador precisa reparar o ambiente.",
  software_not_enabled: "O Software CompozyOS não está habilitado.",
  package_version_changed: "Há uma versão mais nova do pacote. Revise a versão atual antes de aprovar.",
  worktree_not_ready: "O workspace escolhido não está pronto. Verifique o vínculo local ou escolha um checkout isolado.",
  author_required: "Somente a pessoa operadora pode fazer esta alteração.",
};

export const PREPARATION_FAILED_STATES = ["failed", "blocked", "canceled", "expired", "unknown"];
export const PREPARATION_FAILURES: Record<string, string> = {
  runtime_incompatible: "A preparação local foi recusada: confira na sua máquina a versão do CompozyOS e o login do provedor escolhido.",
  path_invalid: "A preparação local não encontrou o checkout vinculado. Refaça o vínculo em Projeto local.",
  gate_policy_unresolved: "A preparação local não conseguiu identificar as verificações obrigatórias do projeto.",
};
export const PREPARATION_FAILURE_FALLBACK = "A preparação local não foi concluída. Confira se o conector local está em execução e prepare novamente.";

export const GENERIC_FAILURE = "Não foi possível concluir a operação. Confira o estado atual e tente novamente.";

export const PACKAGE_STATUS_LABELS: Record<string, string> = { review_ready: "Em revisão", approved: "Aprovado", superseded: "Substituído" };

export const SPEC_PART_TABS = { product: "Produto · PRD", technical: "Técnica · Tech Spec" } as const;
export const PACKAGE_FORMAT_LABELS: Record<string, string> = { os_spec_v1: "Spec", os_tasks_v1: "Tarefas" };

export const DOCUMENT_TABS: Record<string, string> = { spec: "Spec", user_stories: "Histórias", dx: "DX", uiux: "UI/UX", tests: "Testes", tasks_manifest: "Plano de tarefas", task: "Tarefas", adr: "ADR" };

export const LEGACY_NOTE = "Esta tarefa já começou no fluxo anterior de PRD e Tech Spec. Ele continua legível e não é convertido.";
export const LOADING_LABELS = { flow: "Carregando o fluxo…", plan: "Carregando as ações do fluxo…", documents: "Carregando os documentos…", history: "Carregando o histórico de execuções…" } as const;
