import type { PlanningComplexity, PlanningRoute } from "../tasks/planningContracts";

export const SKILLS_PLUGIN_NAME = "flow-dev";

const DIRECT_EXECUTION_INSTRUCTION = `/${SKILLS_PLUGIN_NAME}:direct-executor Implemente a Issue abaixo. Rode as verificações do projeto antes de terminar e resuma o que mudou e o que foi verificado. Não faça commit, push nem PR sem eu pedir.`;
const SPEC_INSTRUCTION = `/${SKILLS_PLUGIN_NAME}:spec-writer Escreva a spec da Issue abaixo e pare para minha revisão. Não implemente ainda.`;

export const ROUTE_INSTRUCTION: Record<PlanningRoute, string> = {
  direct_execution: DIRECT_EXECUTION_INSTRUCTION,
  tech_spec: SPEC_INSTRUCTION,
  prd: SPEC_INSTRUCTION,
};

export const ROUTE_LABEL: Record<PlanningRoute, string> = { direct_execution: "Execução direta", tech_spec: "Tech Spec", prd: "PRD" };
export const COMPLEXITY_LABEL: Record<PlanningComplexity, string> = { low: "Baixa", medium: "Média", high: "Alta" };

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
