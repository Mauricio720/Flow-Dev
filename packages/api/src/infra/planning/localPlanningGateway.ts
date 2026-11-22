import type { PlanningEnvelope, PlanningGateway } from "../../application/planning/planningGateway";
import type { PlanningDispatch } from "../../application/services/tasks/planningContracts";
import { PLANNING_REQUEST_DEADLINE_MS } from "../../application/services/tasks/planningWorkerRules";
import { executeLocalAgent, type AgentExecutionDeps } from "../agents/agentExecution";
import { toPlanningError } from "../agents/agentFailureMapping";
import { loadInstructions } from "../agents/agentInstructions";
import { citesOnlyRetrievedSources } from "./planningCitations";
import { parseModelAssessment, planningJsonSchema, toFlowAssessment, type ModelAssessment } from "./planningOutputSchema";
import { buildPlanningPrompt } from "./planningPrompt";
import type { RecordedContextCall } from "../../application/database/dao/issueContextDao";

function acceptAssessment(output: unknown, calls: RecordedContextCall[]) {
  const model: ModelAssessment | null = parseModelAssessment(output);
  if (!model || !citesOnlyRetrievedSources(model, calls)) return null;
  return toFlowAssessment(model);
}

export class LocalPlanningGateway implements PlanningGateway {
  private readonly instructions = loadInstructions("planning");
  private readonly outputSchema = planningJsonSchema();
  constructor(private readonly deps: AgentExecutionDeps) {}

  async analyze(input: PlanningDispatch, signal: AbortSignal): Promise<PlanningEnvelope> {
    const { value } = await executeLocalAgent(this.deps, {
      agent: "planning",
      operationId: input.operationId,
      executionId: input.executionId,
      capability: input.contextCapability,
      instructions: this.instructions,
      prompt: buildPlanningPrompt(input),
      outputSchema: this.outputSchema,
      timeoutMs: PLANNING_REQUEST_DEADLINE_MS,
      signal,
      settingsInvalid: "planning_agent_settings_invalid",
      parse: acceptAssessment,
      toError: toPlanningError,
    });
    return { protocolVersion: 1, operationId: input.operationId, executionId: input.executionId, taskId: input.taskId, inputHash: input.inputHash, result: value };
  }
}
