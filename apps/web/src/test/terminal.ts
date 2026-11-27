import type { TerminalPreflight } from "@/features/issues/assigned-work/terminalContract";

export const CHECKOUT_PATH = "/home/ana/Área de trabalho/shop";
export const DEFAULT_PROMPT = "/flow-dev:direct-executor Implemente a Issue abaixo.\n\nIssue #42 — Trocar 'Entar' por 'Entrar'\nhttps://github.com/acme/shop/issues/42";

export const OPUS_MAX = { agent: "claude", model: "opus", effort: "max" } as const;
export const CODEX_REASON = "O catálogo do Codex ainda não foi publicado.";

export const AGENTS: TerminalPreflight["agents"] = [
  { agent: "claude", available: true, reason: null, models: ["opus", "sonnet", "haiku"], efforts: ["low", "medium", "high", "xhigh", "max"] },
  { agent: "codex", available: false, reason: CODEX_REASON, models: [], efforts: [] },
];

export function preflightOf(patch: Partial<TerminalPreflight> = {}): TerminalPreflight {
  const checkout = { path: CHECKOUT_PATH, branch: "main", detachedSha: null, dirty: false };
  return { checkout, worktree: { mode: "checkout" }, defaultPrompt: DEFAULT_PROMPT, maxPromptLength: 20_000, issueImages: [], sessionService: { running: true }, prompt: DEFAULT_PROMPT, choice: null, agents: AGENTS, ...patch };
}

export function terminalRejection(reason: string, message: string, code = "PRECONDITION_FAILED") {
  return Object.assign(new Error(message), { data: { code, reason } });
}
