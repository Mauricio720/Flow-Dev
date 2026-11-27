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

export const ROUTE_SWITCH_OPENING = "Vou analisar.";
export const BUTTON_TEXT_QUESTION = "Qual texto o botão deve mostrar?";
export const ROUTE_SWITCH_EXPLANATION = "Com a resposta, a mudança fica só no texto de uma tela e segue os padrões do repositório.";
export const ROUTE_SWITCH_SUMMARY = "Mudança de texto em uma tela, sem regra nova.";
export const ROUTE_SWITCH_REASONS = ["As respostas fixaram o texto e a tela.", "Segue o padrão de planningCopy.ts."];
export const ROUTE_SWITCH_FENCE = "flow-dev-troca-de-rota";
export const ROUTE_SWITCH_CLOSING = "Implementando.";
const BUTTON_TEXT_QUESTIONS = [{ question: BUTTON_TEXT_QUESTION, header: "Texto", multiSelect: false, options: [{ label: "Entrar (Recomendado)", description: "Corrige o erro de digitação" }, { label: "Acessar", description: "Troca a palavra" }] }];
const ROUTE_SWITCH_BLOCK = ["```" + ROUTE_SWITCH_FENCE, "rota: execucao_direta", `resumo: ${ROUTE_SWITCH_SUMMARY}`, ...ROUTE_SWITCH_REASONS.map((reason) => `- ${reason}`), "```"].join("\n");

export const ROUTE_SWITCH_SCRIPT: SessionScriptStep[] = [
  { kind: "text", text: ROUTE_SWITCH_OPENING },
  { kind: "ask", questions: BUTTON_TEXT_QUESTIONS },
  { kind: "text", text: `${ROUTE_SWITCH_EXPLANATION}\n\n${ROUTE_SWITCH_BLOCK}` },
  { kind: "end_turn" },
  { kind: "wait_message" },
  { kind: "text", text: ROUTE_SWITCH_CLOSING },
  { kind: "end_turn" },
];

export const WORKTREE_SESSION_TEXT = "Trabalhando no worktree da Issue.";
export const WORKTREE_SCRIPT: SessionScriptStep[] = [{ kind: "text", text: WORKTREE_SESSION_TEXT }, { kind: "end_turn" }];

export async function writeSessionScript(clonePath: string, steps: SessionScriptStep[]) {
  await mkdir(sessionScriptDirectory, { recursive: true });
  const file = join(sessionScriptDirectory, `${createHash("sha256").update(clonePath).digest("hex")}.json`);
  await writeFile(file, JSON.stringify(steps));
}
