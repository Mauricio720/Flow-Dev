import type { AgentChoice, LaunchPurpose } from "./terminalContract";
import { TERMINAL_DIALOG_INTRO, TERMINAL_DIALOG_TITLE } from "./terminalCopy";

export const AGENT_FIELD_LABEL = "Agente";
export const MODEL_FIELD_LABEL = "Modelo";
export const EFFORT_FIELD_LABEL = "Esforço";
export const SPEC_FIELD_LABEL = "Spec";
export const UNAVAILABLE_SUFFIX = "(indisponível)";
export const GENERATE_TASKS_LABEL = "Gerar tarefas";
export const REGENERATE_TASKS_LABEL = "Gerar tarefas de novo";
export const REGENERATE_CONFIRM_LABEL = "Gerar de novo";

export function regenerateConfirmText(folder: string) {
  const location = folder === "" ? "da raiz do repositório" : `de ${folder}`;
  return `Gerar de novo escreve outra vez os arquivos de tarefa ${location}. O status e o registro de execução desses arquivos podem voltar ao começo; as versões já capturadas continuam acessíveis. Gerar de novo?`;
}
export const GENERATE_DIALOG_TITLE = "Gerar as tarefas da spec";
export const GENERATE_DIALOG_INTRO = "O agente escolhido roda a skill spec-to-tasks na pasta do seu clone e grava as tarefas ao lado da spec. O prompt abaixo é a primeira mensagem.";
export const PLAN_DIALOG_TITLE = "Iniciar a sessão do plano";
export const PLAN_DIALOG_INTRO = "A sessão roda com o agente, o modelo e o esforço definidos no plano. O prompt abaixo é a primeira mensagem.";

const AGENT_LABELS = new Map([["claude", "Claude Code"], ["codex", "Codex"]]);
const MODEL_LABELS = new Map([["opus", "Opus"], ["sonnet", "Sonnet"], ["haiku", "Haiku"]]);
const EFFORT_LABELS = new Map([["low", "Baixo"], ["medium", "Médio"], ["high", "Alto"], ["xhigh", "Muito alto"], ["max", "Máximo"]]);

export const agentLabel = (agent: string) => AGENT_LABELS.get(agent) ?? agent;
export const modelLabel = (model: string) => MODEL_LABELS.get(model) ?? model;
export const effortLabel = (effort: string) => EFFORT_LABELS.get(effort) ?? effort;

export function agentChoiceLabel(choice: AgentChoice) {
  return `${agentLabel(choice.agent)} · ${modelLabel(choice.model)} · ${effortLabel(choice.effort)}`;
}

export function plannedChoiceLabel(choice: AgentChoice) {
  return `${agentLabel(choice.agent)} · ${modelLabel(choice.model)} · esforço ${effortLabel(choice.effort)} (definido no plano)`;
}

const DIALOG_COPY: Record<LaunchPurpose["kind"], { title: string; intro: string }> = {
  route: { title: TERMINAL_DIALOG_TITLE, intro: TERMINAL_DIALOG_INTRO },
  generate_tasks: { title: GENERATE_DIALOG_TITLE, intro: GENERATE_DIALOG_INTRO },
  plan_item: { title: PLAN_DIALOG_TITLE, intro: PLAN_DIALOG_INTRO },
};

export const dialogCopyOf = (kind: LaunchPurpose["kind"]) => DIALOG_COPY[kind];
