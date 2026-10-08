import { execFile as execFileCallback } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { CLAUDE_AGENT_COMMAND, overlaySettings, shellQuote } from "../spec/compozy/providerOverlayCommands";

const execFile = promisify(execFileCallback);
const MODEL_FILTER_SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../runtime/acp/claudeModelFilter.mjs");
const MODEL_FILTER_CACHE_FILE = "claude-model-filter.json";
const MODEL_FILTER_WARM_FLAG = "--warm";
const MODEL_FILTER_WARM_TIMEOUT_MS = 30_000;
// CompozyOS switches to every advertised Claude model during inspection, which takes longer than its default budget.
const CLAUDE_DISCOVERY_TIMEOUT = "90s";

export type LocalProviderKind = "codex" | "claude";
export type LocalProvider = { id: string; kind: LocalProviderKind; runtimeRoot: string };

export const localProviderHome = (kind: LocalProviderKind) => resolve(homedir(), kind === "codex" ? ".codex" : ".claude");
const modelFilterCache = (runtimeRoot: string) => join(runtimeRoot, MODEL_FILTER_CACHE_FILE);
const toml = (value: string) => JSON.stringify(value);

export function localProviderLines(provider: LocalProvider): string[] {
  const claudeAgentWrapper = `node ${shellQuote(MODEL_FILTER_SCRIPT)} ${shellQuote(modelFilterCache(provider.runtimeRoot))}`;
  const settings = overlaySettings({ providerId: provider.id, providerKind: provider.kind, label: provider.id, homePath: localProviderHome(provider.kind) }, { claudeAgentWrapper });
  const lines = ["", `[providers.${provider.id}]`, ...Object.entries(settings).map(([key, value]) => `${key} = ${toml(value)}`)];
  if (provider.kind !== "claude") return lines;
  return [...lines, "", `[providers.${provider.id}.models.discovery]`, `timeout = ${toml(CLAUDE_DISCOVERY_TIMEOUT)}`];
}

/** Learns which Claude models the signed-in account accepts before CompozyOS inspects the provider. */
export async function warmClaudeModelFilter(runtimeRoot: string, environment: NodeJS.ProcessEnv) {
  const args = [MODEL_FILTER_SCRIPT, MODEL_FILTER_WARM_FLAG, modelFilterCache(runtimeRoot), ...CLAUDE_AGENT_COMMAND];
  const env = { PATH: environment.PATH ?? process.env.PATH, HOME: homedir(), CLAUDE_CONFIG_DIR: localProviderHome("claude") };
  await execFile(process.execPath, args, { cwd: runtimeRoot, env, timeout: MODEL_FILTER_WARM_TIMEOUT_MS }).catch(() => undefined);
}
