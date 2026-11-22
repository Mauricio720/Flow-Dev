import type { TerminalPreflight } from "@/features/issues/assigned-work/terminalContract";

export const CHECKOUT_PATH = "/home/ana/Área de trabalho/shop";
export const DEFAULT_PROMPT = "/flow-dev:direct-executor Implemente a Issue abaixo.\n\nIssue #42 — Trocar 'Entar' por 'Entrar'\nhttps://github.com/acme/shop/issues/42";

export function preflightOf(patch: Partial<TerminalPreflight> = {}): TerminalPreflight {
  const checkout = { path: CHECKOUT_PATH, branch: "main", detachedSha: null, dirty: false };
  return { checkout, defaultPrompt: DEFAULT_PROMPT, maxPromptLength: 20_000, issueImages: [], ...patch };
}

export function terminalRejection(reason: string, message: string, code = "PRECONDITION_FAILED") {
  return Object.assign(new Error(message), { data: { code, reason } });
}
