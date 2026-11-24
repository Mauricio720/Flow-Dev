type TaskFileInput = { status?: string; title?: string; type?: string; complexity?: string; minis?: boolean[]; extraSection?: string };

export function taskFileWith(input: TaskFileInput = {}) {
  const lines = ["---"];
  if (input.status) lines.push(`status: ${input.status}`);
  lines.push(`title: ${input.title ?? "Tarefa"}`, `type: ${input.type ?? "backend"}`, `complexity: ${input.complexity ?? "medium"}`, "---", "", "# Task", "", "## Mini-tarefas");
  for (const done of input.minis ?? []) lines.push(`- [${done ? "x" : " "}] **item**`, "  - **Arquivos:** a.ts");
  lines.push("", input.extraSection ?? "");
  return lines.join("\n");
}
