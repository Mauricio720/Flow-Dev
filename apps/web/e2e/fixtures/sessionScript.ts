import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { terminalStateDirectory } from "./sessionFiles";

export const sessionScriptDirectory = join(terminalStateDirectory, "session-scripts");

export type SessionScriptStep = Record<string, unknown> & { kind: string };

export const VISIBILITY_QUESTION = "Quem pode ver os comentários?";
export const CHECKS_QUESTION = "Quais verificações rodar?";
const QUESTIONS = [
  { question: VISIBILITY_QUESTION, header: "Visibilidade", multiSelect: false, options: [{ label: "Só membros (Recomendado)", description: "Apenas quem é do projeto" }, { label: "Qualquer pessoa", description: "Também visitantes" }] },
  { question: CHECKS_QUESTION, header: "Verificações", multiSelect: true, options: [{ label: "lint", description: "ESLint" }, { label: "test", description: "Vitest" }] },
];
const BASH_SUGGESTION = { type: "addRules", behavior: "allow", destination: "session", rules: [{ toolName: "Bash", ruleContent: "pnpm test:*" }] };

export const JOURNEY_SCRIPT: SessionScriptStep[] = [
  { kind: "text", text: "Vou começar pela análise." },
  { kind: "ask", questions: QUESTIONS },
  { kind: "permission", toolName: "Bash", input: { command: "pnpm test", description: "Roda os testes" }, suggestions: [BASH_SUGGESTION] },
  { kind: "end_turn" },
  { kind: "wait_message" },
  { kind: "text", text: "Lint rodado." },
  { kind: "end_turn" },
];

export async function writeSessionScript(clonePath: string, steps: SessionScriptStep[]) {
  await mkdir(sessionScriptDirectory, { recursive: true });
  const file = join(sessionScriptDirectory, `${createHash("sha256").update(clonePath).digest("hex")}.json`);
  await writeFile(file, JSON.stringify(steps));
}
