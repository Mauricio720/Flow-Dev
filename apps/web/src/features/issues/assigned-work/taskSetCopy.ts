import type { TaskStatus } from "./taskSetContract";

export const TASKS_STAGE_LABEL = "Tarefas da spec";
export const TASKS_LIST_LABEL = "Tarefas";
export const SPEC_STAGE_LABEL = "Spec da tarefa";
export const SPECS_LIST_LABEL = "Specs capturadas";
export const NO_TASKS_NOTE = "Nenhuma tarefa gerada ainda.";
export const OVERVIEW_LABEL = "Visão geral";
export const TASK_FILE_MISSING = "Arquivo da tarefa não capturado";
export const TASK_WITHOUT_TITLE = "Sem título";
export const TASK_SET_LOADING = "Carregando as tarefas…";
export const TASK_SET_LOAD_FAILED = "Não foi possível carregar as tarefas agora. Tentaremos de novo.";
export const NO_DEPENDENCY_MARK = "—";
export const FOLDER_FILES_HEADING = "Arquivos da pasta";
export const TASK_SET_HEADING = "Conjunto de tarefas";
export const TASK_COLUMNS = { task: "Tarefa", area: "Área", dependsOn: "Depende de", mini: "Mini", status: "Estado" } as const;
export const COMPLEXITY_LABEL = new Map([["low", "baixa"], ["medium", "média"], ["high", "alta"]]);

export const complexityText = (complexity: string) => `complexidade ${COMPLEXITY_LABEL.get(complexity) ?? complexity}`;
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function taskSetSummaryText(input: { total: number; completed: number; miniDone: number; miniTotal: number }) {
  return `${plural(input.total, "tarefa", "tarefas")} · ${plural(input.completed, "concluída", "concluídas")} · ${input.miniDone} de ${plural(input.miniTotal, "mini-tarefa", "mini-tarefas")}`;
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = { pending: "Pendente", in_progress: "Em andamento", completed: "Concluída", unknown: "Desconhecido" };

export function manifestProblemNote(problem: string) {
  return `Não foi possível ler o _tasks.md: ${problem}.`;
}

export function otherFolderNote(folder: string) {
  return `Há outro conjunto de tarefas em ${folder}.`;
}
