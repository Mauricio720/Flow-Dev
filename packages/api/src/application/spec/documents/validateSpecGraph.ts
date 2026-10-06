import type { IndexedTaskData, ReviewDiagnostic } from "./specDocumentTypes";

const blocking = (code: string, message: string): ReviewDiagnostic => ({ code, severity: "blocking", documentId: null, blockId: null, message });

export function validateSpecGraph(tasks: IndexedTaskData[], files: readonly string[]): ReviewDiagnostic[] {
  const diagnostics: ReviewDiagnostic[] = [];
  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.id)) diagnostics.push(blocking("duplicate_task", `Tarefa duplicada: ${task.id}`));
    seen.add(task.id);
    if (!files.includes(task.path)) diagnostics.push(blocking("missing_task_file", `Arquivo ausente: ${task.path}`));
    for (const target of task.dependsOn) if (!tasks.some((candidate) => candidate.id === target)) diagnostics.push(blocking("missing_dependency", `${task.id} depende de ${target}, que não existe`));
  }
  return [...diagnostics, ...cycleDiagnostics(tasks)];
}

function cycleDiagnostics(tasks: IndexedTaskData[]): ReviewDiagnostic[] {
  const edges = new Map(tasks.map((task) => [task.id, task.dependsOn]));
  const members = new Set<string>();
  for (const task of tasks) for (const member of cycleThrough(task.id, edges)) members.add(member);
  return members.size ? [blocking("dependency_cycle", `Ciclo de dependências: ${[...members].sort().join(", ")}`)] : [];
}

function cycleThrough(start: string, edges: Map<string, string[]>) {
  const stack: { id: string; path: string[] }[] = [{ id: start, path: [start] }];
  const visited = new Set<string>();
  while (stack.length) {
    const { id, path } = stack.pop()!;
    for (const next of edges.get(id) ?? []) {
      if (next === start) return path;
      if (!visited.has(next) && edges.has(next)) { visited.add(next); stack.push({ id: next, path: [...path, next] }); }
    }
  }
  return [];
}
