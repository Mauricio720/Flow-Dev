import type { StageKey, StageState } from "./flowStages";

type NowCopy = { title: string; detail: string };

export const STAGE_LABELS: Record<StageKey, { label: string; actor: string }> = {
  spec: { label: "Spec", actor: "PRD + Tech Spec" },
  spec_review: { label: "Aprovar spec", actor: "Você revisa" },
  tasks: { label: "Tarefas", actor: "Agente decompõe" },
  tasks_review: { label: "Aprovar tarefas", actor: "Você revisa" },
  execution: { label: "Implementação", actor: "Loop executa" },
  review: { label: "Review", actor: "Loop revisa e corrige" },
  pull_request: { label: "Pull Request", actor: "Agente publica" },
  direct: { label: "Execução direta", actor: "Agente implementa" },
};

export const STAGE_STATE_LABELS: Record<StageState, string> = { done: "Concluída", current: "Em andamento", failed: "Falhou", pending: "Pendente", yours: "Aguardando você" };
export const READER_STATE_LABELS: Record<StageState, string> = { ...STAGE_STATE_LABELS, yours: "Aguardando a pessoa operadora" };

export const QUESTION_NOW: NowCopy = { title: "O agente precisa da sua resposta", detail: "A execução está parada esperando você. Responda abaixo e a mesma sessão continua de onde parou." };
export const FINISHED_NOW: NowCopy = { title: "Fluxo concluído", detail: "Spec, tarefas, implementação e review terminaram. Os documentos e o histórico continuam disponíveis na aba de cada etapa." };
export const CONCLUDED_NOW: NowCopy = { title: "Fluxo concluído pela pessoa operadora", detail: "O Review parou antes de uma rodada limpa e a pessoa operadora decidiu encerrar o fluxo assim. As tentativas que falharam continuam no histórico." };
export const CONCLUDE_COPY = {
  open: "Considerar a Issue concluída",
  group: "Concluir sem Review limpo",
  warning: "O Review não terminou com uma rodada limpa. Ao confirmar, o fluxo é encerrado como concluído com o código que está no checkout hoje, e o Review não poderá mais ser retomado nesta Issue. As tentativas que falharam continuam no histórico.",
  confirm: "Confirmar conclusão",
  back: "Voltar",
  done: "Fluxo concluído por decisão sua. O Review não será retomado.",
};
export const READER_NOTE = "Somente leitura. Apenas a pessoa operadora escolhe, inicia e aprova ações do fluxo.";

const RETRY_HINT = "Veja abaixo o que a última tentativa registrou e escolha como tentar de novo. As tentativas anteriores ficam no histórico de execuções, no fim desta etapa.";
export const RETRY_LABEL = "Tentar de novo";
export const RETRY_PREPARING_LABEL = "Preparando o projeto local…";
export const RETRY_COPY = {
  title: "Tentar de novo",
  lastChoice: "Escolha da última tentativa",
  change: "Escolher outros modelos",
  incompatible: "A conexão da última tentativa não executa neste checkout. Escolha outros modelos para tentar de novo.",
  renewed: "Esta etapa passou a pedir um modelo para cada agente. Escolha os modelos para tentar de novo.",
  unavailable: "Um modelo da última tentativa não está disponível agora. Escolha outros modelos ou aguarde a lista ser atualizada.",
  editorTitle: "Modelos da próxima tentativa",
  editorHelp: "Troque só o que precisa mudar: outra conexão se a conta atingiu o limite de uso, outro modelo se o atual ficou indisponível. Revise o checkout antes de tentar de novo.",
  missing: "Falta completar a escolha de:",
  confirm: "Tentar de novo com estes modelos",
  back: "Voltar",
  resumeAbove: "Falhou. Tente de novo em “Agora”, no topo desta etapa.",
};

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
  pull_request: {
    yours: { title: "Abra a Pull Request", detail: "O Review terminou com uma rodada limpa. Em Ações da etapa, adicione Abrir Pull Request, escolha o modelo, salve, prepare o projeto local e inicie. O agente cria os commits, envia a branch e abre a PR." },
    current: { title: "O agente está publicando a Issue", detail: "Ele separa as alterações em commits, envia a branch da Issue ao GitHub e abre a Pull Request. Nenhum arquivo de código é alterado nesta etapa." },
    failed: { title: "A Pull Request não foi aberta", detail: RETRY_HINT },
    done: { title: "Pull Request aberta", detail: "Os commits foram enviados e a Pull Request está aberta no GitHub, vinculada à Issue. O histórico continua disponível abaixo." },
    pending: { title: "Esta Issue não segue para Pull Request", detail: "O fluxo foi concluído pela pessoa operadora sem uma rodada limpa de Review, e a publicação só é liberada por um Review limpo." },
  },
  direct: {
    yours: { title: "Inicie a execução direta", detail: "O planejamento aprovou implementar esta Issue sem spec. Em Ações da etapa, escolha conexão e modelo, salve, prepare o projeto local e inicie." },
    current: { title: "O agente está implementando a Issue", detail: "Ele trabalha no worktree da Issue no seu projeto local, seguindo os padrões do repositório. Se precisar de uma decisão sua, a pergunta aparece aqui." },
    failed: { title: "A execução direta parou", detail: "Confira o motivo no histórico de execuções. Se o agente apontou que falta uma decisão de especificação, esta Issue precisa de Tech Spec ou PRD em vez de execução direta." },
    done: { title: "Execução direta concluída", detail: "A Issue foi implementada no worktree local e as verificações obrigatórias passaram. O histórico continua disponível abaixo." },
  },
};
