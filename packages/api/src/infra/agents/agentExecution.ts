import type { AgentChoice, AgentKind } from "../../application/agents/agentTypes";
import { AgentRunError, type LocalAgentRunner } from "../../application/agents/localAgentRunner";
import type { IssueContextDao, RecordedContextCall } from "../../application/database/dao/issueContextDao";
import type { AgentSettingsService } from "../../application/services/projects/agentSettingsService";
import { TaskError, type TaskErrorReason } from "../../application/services/tasks/taskErrors";
import type { ContextMcpEndpoint } from "./contextMcpEndpoint";
import { projectOfExecution } from "./executionProject";

export type AgentExecutionDeps = {
  settings: AgentSettingsService;
  runner: LocalAgentRunner;
  endpoint: ContextMcpEndpoint;
  contextDao: IssueContextDao;
  log?: (line: string) => void;
};

export type AgentExecution<T> = {
  agent: AgentKind;
  operationId: string;
  executionId: string;
  capability: string;
  instructions: string;
  prompt: string;
  outputSchema: object;
  timeoutMs: number;
  signal: AbortSignal;
  settingsInvalid: TaskErrorReason;
  parse: (output: unknown, calls: RecordedContextCall[]) => T | null;
  toError: (error: unknown) => unknown;
};

const INVALID_OUTPUT = "invalid_output";

type InvalidOutput = { reason: string; outputBytes: number | null };
type Outcome = { choice: AgentChoice; outcome: string; durationMs: number; exitCode: number | null; toolCalls: number; invalidOutput?: InvalidOutput };

function writeLog(deps: AgentExecutionDeps, execution: { agent: AgentKind; operationId: string }, outcome: Outcome) {
  const line = JSON.stringify({ operationId: execution.operationId, agent: execution.agent, ...outcome.choice, durationMs: outcome.durationMs, outcome: outcome.outcome, exitCode: outcome.exitCode, toolCalls: outcome.toolCalls, ...outcome.invalidOutput });
  (deps.log ?? console.info)(`[agents] run ${line}`);
}

async function runOnce<T>(deps: AgentExecutionDeps, execution: AgentExecution<T>, choice: AgentChoice) {
  const context = { url: deps.endpoint.urlFor(execution.executionId), capability: execution.capability };
  const { instructions, prompt, outputSchema, timeoutMs, signal } = execution;
  const result = await deps.runner.run({ choice, instructions, prompt, outputSchema, context, timeoutMs, signal });
  const calls = await deps.contextDao.listCalls(execution.executionId);
  const value = execution.parse(result.output, calls);
  if (value === null) throw new AgentRunError(INVALID_OUTPUT, "contract_violation", result.exitCode ?? 0).withOutputBytes(Buffer.byteLength(JSON.stringify(result.output)));
  return { value, result, calls };
}

export async function executeLocalAgent<T>(deps: AgentExecutionDeps, execution: AgentExecution<T>) {
  const projectId = await projectOfExecution(deps.contextDao, execution.executionId, execution.capability);
  const { choice, available } = await deps.settings.resolve(projectId, execution.agent);
  if (!available) throw new TaskError(execution.settingsInvalid);
  const startedAt = Date.now();
  try {
    const { value, result, calls } = await runOnce(deps, execution, choice);
    writeLog(deps, execution, { choice, outcome: "ok", durationMs: result.durationMs, exitCode: result.exitCode ?? 0, toolCalls: calls.length });
    return { value, calls };
  } catch (error) {
    const failure = error instanceof AgentRunError ? error : null;
    const toolCalls = (await deps.contextDao.listCalls(execution.executionId).catch(() => [])).length;
    const invalidOutput = failure?.failure === INVALID_OUTPUT ? { reason: failure.detail, outputBytes: failure.outputBytes } : undefined;
    writeLog(deps, execution, { choice, outcome: failure?.failure ?? "provider_failed", durationMs: Date.now() - startedAt, exitCode: failure?.exitCode ?? null, toolCalls, invalidOutput });
    throw execution.toError(error);
  }
}
