import type { StageKey, StageState } from "./flowStages";

type NowCopy = { title: string; detail: string };

export const STAGE_LABELS: Record<StageKey, { label: string; actor: string }> = {
  spec: { label: "Spec", actor: "PRD + Tech Spec" },
  spec_review: { label: "Aprovar spec", actor: "Você revisa" },
  tasks: { label: "Tarefas", actor: "Agente decompõe" },
  tasks_review: { label: "Aprovar tarefas", actor: "Você revisa" },
  execution: { label: "Implementação", actor: "Loop executa" },
  review: { label: "Review", actor: "Loop revisa e corrige" },
};

export const STAGE_STATE_LABELS: Record<StageState, string> = { done: "Concluída", current: "Em andamento", failed: "Falhou", pending: "Pendente", yours: "Aguardando você" };
export const READER_STATE_LABELS: Record<StageState, string> = { ...STAGE_STATE_LABELS, yours: "Aguardando a pessoa operadora" };

export const QUESTION_NOW: NowCopy = { title: "O agente precisa da sua resposta", detail: "A execução está parada esperando você. Responda abaixo e a mesma sessão continua de onde parou." };
export const FINISHED_NOW: NowCopy = { title: "Fluxo concluído", detail: "Spec, tarefas, implementação e review terminaram. Os documentos e o histórico continuam disponíveis na aba de cada etapa." };
export const READER_NOTE = "Somente leitura. Apenas a pessoa operadora escolhe, inicia e aprova ações do fluxo.";

const RETRY_HINT = "Confira o histórico de execuções. Se a conta atingiu o limite da sessão, escolha outra conexão ou provedor antes de criar outra tentativa.";
export const RETRY_LABEL = "Tentar de novo";
export const RETRY_PREPARING_LABEL = "Preparando o projeto local…";

export const NOW_COPY: Record<StageKey, Partial<Record<StageState, NowCopy>>> = {
  spec: {
    yours: { title: "Inicie a spec", detail: "Em Ações da etapa, escolha conexão, modelo e checkout, salve e inicie. O agente escreve o PRD e a Tech Spec no mesmo pacote e pode fazer perguntas no caminho." },
    current: { title: "O agente está escrevendo a spec", detail: "PRD e Tech Spec saem juntos, no mesmo pacote. Se o agente precisar de uma decisão sua, a pergunta aparece aqui." },
    failed: { title: "A spec não foi gerada", detail: RETRY_HINT },
  },
  spec_review: {
    yours: { title: "Revise e aprove a spec", detail: "Leia o PRD e a Tech Spec em Documentos, confirme os pontos que o agente deixou em aberto e aprove a versão. Aprovar não inicia a etapa seguinte." },
  },
  tasks: {
    yours: { title: "Prepare as tarefas", detail: "A spec está aprovada. Em Ações da etapa, adicione Criar tarefas, escolha o modelo, salve e inicie." },
    current: { title: "O agente está quebrando a spec em tarefas", detail: "Ele lê a spec aprovada e escreve uma tarefa por arquivo, sem alterar os documentos aprovados." },
    failed: { title: "As tarefas não foram geradas", detail: RETRY_HINT },
  },
  tasks_review: {
    yours: { title: "Revise e aprove as tarefas", detail: "Leia o plano e cada tarefa em Documentos e aprove a versão. Aprovar libera a implementação por um Loop, sem iniciá-la." },
  },
  execution: {
    yours: { title: "Inicie a implementação", detail: "As tarefas estão aprovadas. Em Ações da etapa, adicione a Implementação, escolha o modelo de cada papel, salve e inicie." },
    current: { title: "O Loop está implementando as tarefas", detail: "O Loop trabalha no checkout escolhido. O estado é atualizado sozinho enquanto a execução estiver ativa." },
    failed: { title: "A implementação parou", detail: RETRY_HINT },
  },
  review: {
    yours: { title: "Revise o que foi implementado", detail: "A implementação terminou. Em Ações da etapa, adicione o Review, escolha o modelo, salve e inicie." },
    current: { title: "O Review está revisando e corrigindo", detail: "Cada rodada revisa o código, registra os achados e corrige os válidos. O Review termina quando uma rodada volta limpa." },
    failed: { title: "O Review parou", detail: RETRY_HINT },
  },
};
