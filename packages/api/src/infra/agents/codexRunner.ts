import { access, mkdir, symlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { AgentRunError, type AgentRun, type AgentRunResult, type LocalAgentRunner } from "../../application/agents/localAgentRunner";
import { isCatalogChoice } from "../../application/agents/agentCatalog";
import { withAgentDirectory } from "./agentDirectory";
import { buildAgentEnvironment } from "./agentEnvironment";
import { withProviderDetail } from "./agentFailure";
import { runAgentProcess } from "./agentProcess";
import { PROVIDER_INFO, unavailableDetail } from "./agentProviderInfo";
import { CODEX_TOKEN_VARIABLE, codexArguments } from "./codexArguments";
import { interpretCodex, isCodexComplete } from "./codexOutput";
import { withoutSchemaMeta } from "./claudeArguments";

const AUTH_FILE = "auth.json";

export class CodexRunner implements LocalAgentRunner {
  constructor(private readonly options: { bin?: string; env?: NodeJS.ProcessEnv } = {}) {}

  async run(input: AgentRun): Promise<AgentRunResult> {
    if (!isCatalogChoice(input.choice)) throw new AgentRunError("model_unavailable", PROVIDER_INFO.codex.label);
    const authPath = await this.requireAuthFile();
    const startedAt = Date.now();
    const result = await withAgentDirectory((directory) => this.execute(input, directory, authPath)).catch((error) => { throw withProviderDetail("codex", error); });
    return { output: interpretCodex(result), durationMs: Date.now() - startedAt, exitCode: result.exitCode };
  }

  private async requireAuthFile() {
    const env = this.options.env ?? process.env;
    const authPath = join(env.CODEX_HOME ?? join(env.HOME ?? homedir(), ".codex"), AUTH_FILE);
    await access(authPath).catch(() => { throw new AgentRunError("not_signed_in", unavailableDetail("codex", PROVIDER_INFO.codex.loginHint)); });
    return authPath;
  }

  private async execute(input: AgentRun, directory: string, authPath: string) {
    const codexHome = join(directory, "codex-home");
    const workDirectory = join(directory, "work");
    const schemaPath = join(directory, "schema.json");
    await Promise.all([mkdir(codexHome), mkdir(workDirectory)]);
    await symlink(authPath, join(codexHome, AUTH_FILE));
    await writeFile(schemaPath, JSON.stringify(withoutSchemaMeta(input.outputSchema)));
    const args = codexArguments({ choice: input.choice, workDirectory, schemaPath, contextUrl: input.context.url });
    const env = buildAgentEnvironment(this.options.env ?? process.env, { CODEX_HOME: codexHome, [CODEX_TOKEN_VARIABLE]: input.context.capability });
    return runAgentProcess({ label: PROVIDER_INFO.codex.label, command: this.options.bin ?? PROVIDER_INFO.codex.command, args, env, cwd: workDirectory, stdin: `${input.instructions}\n\n${input.prompt}`, timeoutMs: input.timeoutMs, signal: input.signal, isComplete: isCodexComplete });
  }
}
