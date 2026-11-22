import type { GenerationEnvelope, GenerationInput, IssueAuthorGateway } from "../../application/issue-author/issueAuthorGateway";
import { executeLocalAgent, type AgentExecutionDeps } from "../agents/agentExecution";
import { toGenerationError } from "../agents/agentFailureMapping";
import { loadInstructions } from "../agents/agentInstructions";
import { issueAuthorJsonSchema, parseIssueAuthorOutput } from "./issueAuthorOutputSchema";
import { buildIssueAuthorPrompt } from "./issueAuthorPrompt";

const GENERATION_TIMEOUT_MS = 600_000;

export class LocalIssueAuthorGateway implements IssueAuthorGateway {
  private readonly instructions = loadInstructions("issue_author");
  private readonly outputSchema = issueAuthorJsonSchema();
  constructor(private readonly deps: AgentExecutionDeps) {}

  async generate(input: GenerationInput): Promise<GenerationEnvelope> {
    const prompt = buildIssueAuthorPrompt(input);
    const { value, calls } = await executeLocalAgent(this.deps, {
      agent: "issue_author",
      operationId: input.operationId,
      executionId: input.executionId,
      capability: input.contextCapability,
      instructions: this.instructions,
      prompt,
      outputSchema: this.outputSchema,
      timeoutMs: GENERATION_TIMEOUT_MS,
      signal: new AbortController().signal,
      settingsInvalid: "agent_settings_invalid",
      parse: parseIssueAuthorOutput,
      toError: toGenerationError,
    });
    return { protocolVersion: 1, operationId: input.operationId, executionId: input.executionId, result: value, activity: calls };
  }
}
