import type { PlanningComplexity, PlanningRoute } from "../tasks/planningContracts";
import type { RouteSwitchDiscardReason } from "../../terminal/routeSwitch";
import { ROUTE_SWITCH_FENCE } from "./routeSwitchBlock";

export const SKILLS_PLUGIN_NAME = "flow-dev";

const DIRECT_EXECUTION_INSTRUCTION = `/${SKILLS_PLUGIN_NAME}:direct-executor Implemente a Issue abaixo. Rode as verificações do projeto antes de terminar e resuma o que mudou e o que foi verificado. Não faça commit, push nem PR sem eu pedir.`;
const SPEC_INSTRUCTION = `/${SKILLS_PLUGIN_NAME}:spec-writer Escreva a spec da Issue abaixo e pare para minha revisão. Não implemente ainda.

Depois de responder às perguntas e registrar as decisões, aplique esta régua: nada de O QUÊ em aberto sobre fluxo, escopo, permissões, ciclo de vida ou critérios de aceite. O COMO segue os padrões do repositório ou depende apenas de escolhas locais de baixo risco, sem pendência bloqueante. Tamanho, número de arquivos e quantidade de mudanças não determinam a rota. Se nenhuma spec tiver sido escrita e essa régua estiver cumprida, não escreva a spec. Explique em uma ou duas frases por que a implementação é direta e encerre sua mensagem com o bloco abaixo. Aguarde a resposta do Flow Dev e não implemente antes dela. O resumo deve caber em 500 caracteres e os motivos devem ser de 1 a 8 itens, com até 300 caracteres cada.

\`\`\`${ROUTE_SWITCH_FENCE}
rota: execucao_direta
resumo: <resumo da mudança>
- <motivo objetivo>
\`\`\``;

export const ROUTE_INSTRUCTION: Record<PlanningRoute, string> = {
  direct_execution: DIRECT_EXECUTION_INSTRUCTION,
  tech_spec: SPEC_INSTRUCTION,
  prd: SPEC_INSTRUCTION,
};

export const ROUTE_LABEL: Record<PlanningRoute, string> = { direct_execution: "Execução direta", tech_spec: "Tech Spec", prd: "PRD" };
export const COMPLEXITY_LABEL: Record<PlanningComplexity, string> = { low: "Baixa", medium: "Média", high: "Alta" };
export const ROUTE_SWITCH_CONFIRMED_MESSAGE = `/${SKILLS_PLUGIN_NAME}:direct-executor A troca para execução direta foi confirmada. Implemente a Issue desta sessão usando as respostas já dadas como decisões. Não escreva spec nem tarefas. Rode as verificações do projeto antes de terminar e resuma o que mudou e o que foi verificado. Não faça commit, push nem PR sem eu pedir.`;
export const ROUTE_SWITCH_DECLINED_MESSAGE = "A troca para execução direta foi recusada. Continue com a spec. Só proponha de novo depois de uma nova pergunta respondida.";
export const ROUTE_SWITCHED_SUFFIX = "trocada para Execução direta";

const ROUTE_SWITCH_DISCARD_MESSAGES: Record<RouteSwitchDiscardReason, string> = {
  declined_without_answer: "a troca já foi recusada e não houve resposta nova",
  spec_exists: "já existe spec deste trabalho",
  already_switched: "este trabalho já foi trocado",
  malformed: "o bloco veio fora do formato",
};

export function routeSwitchDiscardMessage(reason: RouteSwitchDiscardReason): string {
  return `A proposta de troca não foi aceita: ${ROUTE_SWITCH_DISCARD_MESSAGES[reason]}. Continue com a spec.`;
}

export const REASONS_HEADING = "Motivos do planejamento:";
export const UNCERTAINTIES_HEADING = "Pendências informadas:";
export const NO_UNCERTAINTIES = "Nenhuma";
export const ATTACHMENTS_HEADING = "Anexos (leia antes de começar):";
export const BODY_TRUNCATION_MARKER = "[corpo cortado — leia a Issue completa no link]";

export const SPEC_TO_TASKS_COMMAND = `/${SKILLS_PLUGIN_NAME}:spec-to-tasks`;
export const GENERATION_REQUEST = "Quebre em tarefas a spec";
export const GENERATION_REVIEW_NOTE = "Salve os arquivos na pasta dela e pare para minha revisão. Não implemente.";
export const EXECUTION_REQUEST = "Implemente, nesta ordem, as tarefas";
export const EXECUTION_RULES = `Siga o "Como executar" do _tasks.md: uma mini-tarefa por vez; marque [x] e atualize o status no arquivo da tarefa e no _tasks.md só depois de rodar o "Pronto quando". Pare ao terminar essas tarefas e não comece outras. Não faça commit, push nem PR sem eu pedir.`;
export const ROOT_FOLDER_LOCATION = "na raiz do repositório";
