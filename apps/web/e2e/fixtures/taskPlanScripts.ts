import type { SessionScriptStep } from "./sessionScript";

export const TASKS_FOLDER = "docs/specs/login";
export const SPEC_PATH = `${TASKS_FOLDER}/spec.md`;

const MANIFEST = [
  "---",
  'schema_version: "compozy.tasks/v2"',
  "workflow: login",
  "graph:",
  "  nodes:",
  "    - id: task_01",
  "      file: task_01.md",
  "    - id: task_02",
  "      file: task_02.md",
  "  edges:",
  "    - from: task_01",
  "      to: task_02",
  "---",
  "",
  "# Tarefas: Login",
  "",
].join("\n");

function taskFile(number: string, status: string, checked: boolean) {
  const box = checked ? "x" : " ";
  return `---\nstatus: ${status}\ntitle: Tarefa ${number}\ntype: backend\ncomplexity: medium\n---\n\n# Task ${number}\n\n## Mini-tarefas\n- [${box}] **${number}.1 — Primeira**\n- [${box}] **${number}.2 — Segunda**\n`;
}

const write = (path: string, content: string): SessionScriptStep => ({ kind: "write_file", path, content });

export const GENERATION_SCRIPT: SessionScriptStep[] = [
  { kind: "text", text: "Vou quebrar a spec em tarefas." },
  write(`${TASKS_FOLDER}/_tasks.md`, MANIFEST),
  write(`${TASKS_FOLDER}/task_01.md`, taskFile("01", "pending", false)),
  write(`${TASKS_FOLDER}/task_02.md`, taskFile("02", "pending", false)),
  { kind: "text", text: "Tarefas geradas." },
  { kind: "end_turn" },
];

export const EXECUTION_SCRIPT: SessionScriptStep[] = [
  { kind: "text", text: "Implementando a tarefa 01." },
  write(`${TASKS_FOLDER}/task_01.md`, taskFile("01", "completed", true)),
  { kind: "end_turn" },
];
