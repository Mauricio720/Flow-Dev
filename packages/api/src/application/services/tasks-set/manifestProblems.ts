import type { ManifestEdge } from "./taskSetTypes";

export const MAX_TASKS = 30;
export const FRONTMATTER_PROBLEM = "o frontmatter está ausente ou inválido";
export const GRAPH_MISSING_PROBLEM = "o grafo de tarefas está ausente";
export const TOO_MANY_TASKS_PROBLEM = `há mais de ${MAX_TASKS} tarefas`;
export const CYCLE_PROBLEM = "as dependências formam um ciclo";

export function duplicatedTaskProblem(id: string) {
  return `a tarefa ${id} aparece mais de uma vez`;
}

export function unknownTaskProblem(edge: ManifestEdge) {
  return `a dependência ${edge.from} → ${edge.to} cita uma tarefa inexistente`;
}
