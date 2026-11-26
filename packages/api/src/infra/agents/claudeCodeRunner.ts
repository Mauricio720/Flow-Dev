import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AgentRunError, type AgentRun, type AgentRunResult, type LocalAgentRunner } from "../../application/agents/localAgentRunner";
import { isCatalogChoice } from "../../application/agents/agentCatalog";
import { withAgentDirectory } from "./agentDirectory";
import { buildAgentEnvironment } from "./agentEnvironment";
import { claudeReportsError, classifyFailure, withProviderDetail } from "./agentFailure";
import { runAgentProcess, type ProcessResult } from "./agentProcess";
import { PROVIDER_INFO } from "./agentProviderInfo";
import { claudeArguments, claudeMcpConfig, withoutSchemaMeta } from "./claudeArguments";
import { claudeStreamInput } from "./claudeStreamInput";
import { claudeResultEvent, claudeStructuredOutput } from "./claudeStreamOutput";

const MCP_CONFIG_FILE = "mcp.json";
const PRIVATE_FILE_MODE = 0o600;

function isCompleteResult(stdout: string, withImages: boolean) {
  if (withImages) return claudeResultPresent(stdout);
  try { return (JSON.parse(stdout.trim()) as { type?: string }).type === "result"; } catch { return false; }
}

function claudeResultPresent(stdout: string) {
  return claudeResultEvent(stdout) !== null;
}

function interpret(result: ProcessResult, withImages: boolean) {
  const failed = (result.exitCode !== null && result.exitCode !== 0) || claudeReportsError(result.stdout);
  if (failed) throw classifyFailure("claude", result);
  const output = claudeStructuredOutput(result.stdout, withImages);
  if (!output) throw new AgentRunError("invalid_output", "no_structured_output", result.exitCode).withOutputBytes(Buffer.byteLength(result.stdout));
  return output;
}

export class ClaudeCodeRunner implements LocalAgentRunner {
  constructor(private readonly options: { bin?: string; env?: NodeJS.ProcessEnv } = {}) {}

  async run(input: AgentRun): Promise<AgentRunResult> {
    if (!isCatalogChoice(input.choice)) throw new AgentRunError("model_unavailable", PROVIDER_INFO.claude.label);
    const startedAt = Date.now();
    const result = await withAgentDirectory((directory) => this.execute(input, directory)).catch((error) => { throw withProviderDetail("claude", error); });
    return { output: interpret(result, input.images.length > 0), durationMs: Date.now() - startedAt, exitCode: result.exitCode };
  }

  private async execute(input: AgentRun, directory: string) {
    const mcpConfigPath = join(directory, MCP_CONFIG_FILE);
    await writeFile(mcpConfigPath, claudeMcpConfig(input.context), { mode: PRIVATE_FILE_MODE });
    const withImages = input.images.length > 0;
    const args = claudeArguments({ choice: input.choice, instructions: input.instructions, schema: withoutSchemaMeta(input.outputSchema), mcpConfigPath, withImages });
    const stdin = withImages ? claudeStreamInput(input.prompt, input.images) : input.prompt;
    return runAgentProcess({ label: PROVIDER_INFO.claude.label, command: this.options.bin ?? PROVIDER_INFO.claude.command, args, env: buildAgentEnvironment(this.options.env ?? process.env), cwd: directory, stdin, timeoutMs: input.timeoutMs, signal: input.signal, isComplete: (stdout) => isCompleteResult(stdout, withImages) });
  }
}
