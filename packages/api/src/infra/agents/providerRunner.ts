import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AGENT_CATALOG } from "../../application/agents/agentCatalog";
import type { AgentProvider } from "../../application/agents/agentTypes";
import { AgentRunError, type AgentRun, type AgentRunResult, type LocalAgentRunner } from "../../application/agents/localAgentRunner";
import { buildAgentEnvironment } from "./agentEnvironment";
import { PROVIDER_INFO } from "./agentProviderInfo";
import { ClaudeCodeRunner } from "./claudeCodeRunner";
import { CodexRunner } from "./codexRunner";

const VERSION_TIMEOUT_MS = 5000;
const execFileAsync = promisify(execFile);

export type ProviderRunnerOptions = { claudeBin?: string; codexBin?: string; env?: NodeJS.ProcessEnv; log?: (message: string) => void };

export class ProviderRunner implements LocalAgentRunner {
  private readonly runners: Partial<Record<AgentProvider, LocalAgentRunner>>;
  private readonly versionLogged = new Set<AgentProvider>();
  private readonly active = new Map<Promise<unknown>, AbortController>();
  private closed = false;

  constructor(private readonly options: ProviderRunnerOptions = {}) {
    const env = options.env;
    this.runners = { claude: new ClaudeCodeRunner({ bin: options.claudeBin, env }), codex: new CodexRunner({ bin: options.codexBin, env }) };
  }

  async run(input: AgentRun): Promise<AgentRunResult> {
    const runner = this.runners[input.choice.provider];
    if (!runner || !(input.choice.provider in AGENT_CATALOG)) throw new AgentRunError("isolation_unavailable", PROVIDER_INFO[input.choice.provider]?.label ?? "");
    if (this.closed) throw new AgentRunError("cancelled");
    await this.logVersionOnce(input.choice.provider);
    if (this.closed) throw new AgentRunError("cancelled");
    const controller = new AbortController();
    const task = runner.run({ ...input, signal: AbortSignal.any([input.signal, controller.signal]) });
    this.active.set(task, controller);
    try { return await task; } finally { this.active.delete(task); }
  }

  async shutdown() {
    this.closed = true;
    const pending = [...this.active.keys()];
    for (const controller of this.active.values()) controller.abort();
    await Promise.allSettled(pending);
  }

  private async logVersionOnce(provider: AgentProvider) {
    if (this.versionLogged.has(provider)) return;
    this.versionLogged.add(provider);
    const bin = (provider === "claude" ? this.options.claudeBin : this.options.codexBin) ?? PROVIDER_INFO[provider].command;
    const env = buildAgentEnvironment(this.options.env ?? process.env);
    const version = await execFileAsync(bin, ["--version"], { env, timeout: VERSION_TIMEOUT_MS }).then((result) => result.stdout.trim(), () => "unavailable");
    (this.options.log ?? console.info)(`[agents] cli provider=${provider} version="${version}"`);
  }
}
