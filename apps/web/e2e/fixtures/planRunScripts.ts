import type { SessionScriptStep } from "./sessionScript";
import { TASKS_FOLDER, taskFile } from "./taskPlanScripts";

export const RUN_QUESTION = "Pode implementar a tarefa 01?";

const QUESTION = [{ question: RUN_QUESTION, header: "Confirmação", multiSelect: false, options: [{ label: "Sim (Recomendado)", description: "Segue com a tarefa" }, { label: "Não", description: "Para aqui" }] }];
const complete = (number: string): SessionScriptStep => ({ kind: "write_file", path: `${TASKS_FOLDER}/task_${number}.md`, content: taskFile(number, "completed", true) });

export const ASK_THEN_COMPLETE_01: SessionScriptStep[] = [
  { kind: "text", text: "Antes de começar, uma pergunta." },
  { kind: "ask", questions: QUESTION },
  complete("01"),
  { kind: "end_turn" },
  { kind: "wait_message" },
];

export const COMPLETE_02: SessionScriptStep[] = [
  { kind: "text", text: "Implementando a tarefa 02." },
  complete("02"),
  { kind: "end_turn" },
  { kind: "wait_message" },
];
