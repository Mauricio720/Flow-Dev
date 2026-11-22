import { describe, expect, it } from "vitest";
import { AgentRunError, type AgentRunFailure } from "../../application/agents/localAgentRunner";
import { agentFailureDetail } from "../../application/services/tasks/failureCode";
import { mapGenerationFailure, mapPlanningFailure, toGenerationError, toPlanningError } from "./agentFailureMapping";

const EXPECTED: Array<[AgentRunFailure, string, string]> = [
  ["missing_binary", "local_agent_unavailable", "planning_local_agent_unavailable"],
  ["not_signed_in", "local_agent_unavailable", "planning_local_agent_unavailable"],
  ["isolation_unavailable", "local_agent_unavailable", "planning_local_agent_unavailable"],
  ["usage_limit", "provider_usage_limit", "planning_rate_limited"],
  ["model_unavailable", "agent_settings_invalid", "planning_agent_settings_invalid"],
  ["provider_failed", "provider_unavailable", "planning_provider_unavailable"],
  ["invalid_output", "invalid_agent_output", "planning_invalid_output"],
  ["timeout", "generation_timeout", "planning_timeout"],
  ["cancelled", "stale_execution", "stale_execution"],
];

describe("agent failure mapping", () => {
  it.each(EXPECTED)("V-03g maps %s to both task reasons", (failure, generation, planning) => {
    expect(mapGenerationFailure(failure)).toBe(generation);
    expect(mapPlanningFailure(failure)).toBe(planning);
  });

  it("covers all nine failures of the runner contract", () => {
    expect(EXPECTED).toHaveLength(9);
  });

  it("keeps the runner failure as the cause so the detail reaches the worker", () => {
    const failure = new AgentRunError("usage_limit", "Claude Code");
    expect(toGenerationError(failure)).toMatchObject({ reason: "provider_usage_limit" });
    expect(agentFailureDetail(toPlanningError(failure))).toBe("Claude Code");
  });

  it("passes any other error through untouched", () => {
    const error = new Error("boom");
    expect(toGenerationError(error)).toBe(error);
    expect(agentFailureDetail(error)).toBeUndefined();
  });
});
