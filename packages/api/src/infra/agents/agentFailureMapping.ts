import { AgentRunError, type AgentRunFailure } from "../../application/agents/localAgentRunner";
import type { TaskErrorReason } from "../../application/services/tasks/taskErrors";
import { TaskError } from "../../application/services/tasks/taskErrors";

type Mapping = { generation: TaskErrorReason; planning: TaskErrorReason };

const UNAVAILABLE: Mapping = { generation: "local_agent_unavailable", planning: "planning_local_agent_unavailable" };

const FAILURE_MAPPING: Record<AgentRunFailure, Mapping> = {
  missing_binary: UNAVAILABLE,
  not_signed_in: UNAVAILABLE,
  isolation_unavailable: UNAVAILABLE,
  usage_limit: { generation: "provider_usage_limit", planning: "planning_rate_limited" },
  model_unavailable: { generation: "agent_settings_invalid", planning: "planning_agent_settings_invalid" },
  provider_failed: { generation: "provider_unavailable", planning: "planning_provider_unavailable" },
  invalid_output: { generation: "invalid_agent_output", planning: "planning_invalid_output" },
  timeout: { generation: "generation_timeout", planning: "planning_timeout" },
  cancelled: { generation: "stale_execution", planning: "stale_execution" },
};

export function mapGenerationFailure(failure: AgentRunFailure) {
  return FAILURE_MAPPING[failure].generation;
}

export function mapPlanningFailure(failure: AgentRunFailure) {
  return FAILURE_MAPPING[failure].planning;
}

export function toGenerationError(error: unknown) {
  if (!(error instanceof AgentRunError)) return error;
  return new TaskError(mapGenerationFailure(error.failure), undefined, error);
}

export function toPlanningError(error: unknown) {
  if (!(error instanceof AgentRunError)) return error;
  return new TaskError(mapPlanningFailure(error.failure), undefined, error);
}
