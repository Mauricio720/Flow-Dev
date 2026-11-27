import type { AgentLoginInspector, LoginInspection } from "../../application/agent-accounts/agentLoginInspector";
import type { AgentAccountProvider } from "../../application/agent-accounts/agentAccountTypes";
import type { ToolLocator } from "../../application/terminal/toolLocator";
import { buildAgentEnvironment } from "./agentEnvironment";
import { parseClaudeLoginStatus } from "./claudeLoginStatus";
import { parseCodexLoginStatus } from "./codexLoginStatus";
import { runLoginCommand } from "./loginCommandProcess";

const LOGIN_CHECK_TIMEOUT_MS = 10_000;
const PRODUCTION_ENVIRONMENT = "production";
const MISSING_CLI_MESSAGE: Record<AgentAccountProvider, string> = { claude: "O Claude Code não foi encontrado nesta máquina", codex: "O Codex não foi encontrado nesta máquina" };

export class CliAgentLoginInspector implements AgentLoginInspector {
  constructor(private readonly tools: ToolLocator, private readonly env: NodeJS.ProcessEnv = process.env, private readonly timeoutMs = LOGIN_CHECK_TIMEOUT_MS) {}

  async inspect(input: { provider: AgentAccountProvider; home: string }): Promise<LoginInspection> {
    const binary = input.provider === "claude" ? "claude" : "codex";
    if (!await this.tools.has(binary)) return { status: "check_failed", identity: null, plan: null, detail: MISSING_CLI_MESSAGE[input.provider] };
    const fakeStatus = this.fakeStatus();
    if (fakeStatus) return fakeStatus;
    try {
      const result = await runLoginCommand(binary, loginArgs(input.provider), buildAgentEnvironment(this.env, { [homeVariable(input.provider)]: input.home }), this.timeoutMs);
      return statusFromOutput(input.provider, result.stdout, result.stderr);
    } catch (error) {
      if (isTimeout(error)) return { status: "check_failed", identity: null, plan: null, detail: null };
      const candidate = error as { stdout?: string; stderr?: string };
      if (input.provider === "claude" && candidate.stdout) return parseClaudeLoginStatus(candidate.stdout);
      return { status: "logged_out", identity: null, plan: null, detail: null };
    }
  }

  private fakeStatus() {
    const state = this.env.FLOW_DEV_AGENT_LOGIN_FAKE;
    if (!state) return null;
    if (this.env.NODE_ENV === PRODUCTION_ENVIRONMENT) throw new Error("FLOW_DEV_AGENT_LOGIN_FAKE is not allowed in production");
    if (state !== "logged_in" && state !== "logged_out") throw new Error("Invalid FLOW_DEV_AGENT_LOGIN_FAKE value");
    return { status: state, identity: null, plan: null, detail: null } as LoginInspection;
  }
}

function loginArgs(provider: AgentAccountProvider) {
  return provider === "claude" ? ["auth", "status", "--json"] : ["login", "status"];
}

function homeVariable(provider: AgentAccountProvider) {
  return provider === "claude" ? "CLAUDE_CONFIG_DIR" : "CODEX_HOME";
}

function statusFromOutput(provider: AgentAccountProvider, stdout: string, stderr: string) {
  if (provider === "claude") return parseClaudeLoginStatus(stdout);
  return parseCodexLoginStatus(stdout, stderr);
}

function isTimeout(error: unknown) {
  return (error as { killed?: boolean; code?: string })?.killed === true || (error as { code?: string })?.code === "ETIMEDOUT";
}
